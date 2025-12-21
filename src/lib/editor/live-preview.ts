import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

// --- Decoration Types ---

// 1. Hide Syntax (e.g., "# ")
const hideDecoration = Decoration.replace({});

// 2. Style Headers (e.g., "H1 Title")
// We now generate Line decorations dynamically or use specific constants if performance critical.
// For now, simple dynamic creation in the loop is acceptable for MVP.

// --- Plugin Logic ---

function buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state);

    // Get visible ranges to avoid processing entire huge documents
    // simplified: just process entire viewport + buffer
    // For MVP, simpler to iterate visible ranges, but syntaxTree gives us semantic nodes.
    // Let's iterate the tree.

    // Track cursor line(s) to avoid hiding syntax there
    const activeLines = new Set<number>();
    for (const range of view.state.selection.ranges) {
        const line = view.state.doc.lineAt(range.head);
        activeLines.add(line.number);
    }

    // We need to collect decorations and sort them because RangeSetBuilder requires strictly ordered additions used in specific ways.
    // Especially when mixing replacements and marks.
    const decos: { from: number; to: number; value: Decoration }[] = [];

    tree.iterate({
        enter: (node) => {
            const nodeLine = view.state.doc.lineAt(node.from);
            const isCursorOnLine = activeLines.has(nodeLine.number);

            // HEADERS: Apply style to the entire LINE using Line Decoration
            if (node.name.startsWith("ATXHeading")) {
                const level = parseInt(node.name.slice(-1)) || 1;
                const className = `cm-header-line-${level}`;

                // Line decorations must be added at the start of the line.
                // 'nodeLine.from' is the start of the line.
                // WE MUST CHECK if we already added a line decoration for this line?
                // tree.iterate enters nodes. ATXHeading is one node.
                // So we add it once.

                // RangeSetBuilder requires strictly ordered.
                // If we have multiple nodes on same line? ATXHeading is usually the only block on the line.

                decos.push({
                    from: nodeLine.from,
                    to: nodeLine.from, // Line decorations are point ranges at start of line
                    value: Decoration.line({ class: className })
                });
            }

            // HEADER MARKS: Hide the hashes
            if (node.name === "HeaderMark") {
                // Only hide if cursor is NOT on this line
                if (!isCursorOnLine) {
                    // Check for trailing space: `ATXHeading` usually has `# ` or `## `
                    // `HeaderMark` covers the `#`. We want to hide the space too.
                    // The space is usually at `node.to`.
                    let to = node.to;
                    try {
                        const nextChar = view.state.doc.sliceString(to, to + 1);
                        if (nextChar === " ") {
                            to += 1;
                        }
                    } catch (e) {
                        // End of doc or something
                    }

                    decos.push({ from: node.from, to: to, value: hideDecoration });
                }
            }

            // BOLD & ITALIC
            // StrongEmphasis = Bold (** or __)
            // Emphasis = Italic (* or _)

            if (node.name === "StrongEmphasis") {
                decos.push({ from: node.from, to: node.to, value: Decoration.mark({ class: "cm-bold" }) });
            }
            if (node.name === "Emphasis") {
                decos.push({ from: node.from, to: node.to, value: Decoration.mark({ class: "cm-italic" }) });
            }

            // Hide the markers (*, **, _, __)
            if (node.name === "EmphasisMark") {
                // For inline formatting, we might want to check overlap with SELECTION, 
                // not just "Line".
                // But for consistency with headers, "Active Line" is a safe/stable heuristic.
                // It avoids flickering when moving cursor horizontally active.
                if (!isCursorOnLine) {
                    decos.push({ from: node.from, to: node.to, value: hideDecoration });
                }
            }

            // LISTS (Unordered)
            // We want to replace "- " or "* " with a bullet widget "•"
            if (node.name === "ListMark") {
                // Check if it's an unordered list? 
                // The parser usually differentiates, but 'ListMark' is generic.
                // We can check the text content.
                // Or check parent? Parent is ListItem. Parent of ListItem is BulletList or OrderedList.
                // Let's check text content to be safe and simple.
                // Actually `sliceString` is needed.

                if (!isCursorOnLine) {
                    const text = view.state.doc.sliceString(node.from, node.to);
                    if (/^[-*+]\s+$/.test(text) || /^[-*+]$/.test(text)) {
                        decos.push({
                            from: node.from,
                            to: node.to,
                            value: Decoration.replace({ widget: new BulletWidget() })
                        });
                    }
                }
            }

            // BLOCKQUOTES
            // Node 'Blockquote' wraps the line. 'QuoteMark' is the ">".
            // We want to style the Blockquote line, and hide the QuoteMark.
            if (node.name === "Blockquote") {
                decos.push({ from: node.from, to: node.from, value: Decoration.line({ class: "cm-blockquote" }) });
            }
            if (node.name === "QuoteMark") {
                if (!isCursorOnLine) {
                    // Check trailing space
                    let to = node.to;
                    try {
                        if (view.state.doc.sliceString(to, to + 1) === " ") to++;
                    } catch (e) { }
                    decos.push({ from: node.from, to: to, value: hideDecoration });
                }
            }

            // INLINE CODE
            // `InlineCode` contains `CodeMark` (backticks)
            if (node.name === "InlineCode") {
                decos.push({ from: node.from, to: node.to, value: Decoration.mark({ class: "cm-inline-code" }) });
            }

            // FENCED CODE BLOCKS
            if (node.name === "FencedCode") {
                // Apply line decoration to every line in the block
                const startLine = view.state.doc.lineAt(node.from);
                const endLine = view.state.doc.lineAt(node.to);

                for (let l = startLine.number; l <= endLine.number; l++) {
                    const line = view.state.doc.line(l);
                    decos.push({
                        from: line.from,
                        to: line.from,
                        value: Decoration.line({ class: "cm-code-block-line" })
                    });
                }
            }

            if (node.name === "CodeMark") {
                if (!isCursorOnLine) {
                    decos.push({ from: node.from, to: node.to, value: hideDecoration });
                }
            }

            // HORIZONTAL RULE
            if (node.name === "HorizontalRule") {
                if (!isCursorOnLine) {
                    decos.push({
                        from: node.from,
                        to: node.to,
                        value: Decoration.replace({ widget: new HRWidget() })
                    });
                }
            }

            // LINKS
            // Link structure: Link -> [LinkMark([), Text, LinkMark(]), LinkMark((), URL, LinkMark())]
            if (node.name === "Link") {
                decos.push({ from: node.from, to: node.to, value: Decoration.mark({ class: "cm-link" }) });
            }
            if (node.name === "LinkMark" || node.name === "URL") {
                // Hide brackets and URL if inactive
                // We need to be careful not to hide the Text content, which is NOT a LinkMark or URL.
                if (!isCursorOnLine) {
                    decos.push({ from: node.from, to: node.to, value: hideDecoration });
                }
            }

            // IMAGES
            // Replace the whole image syntax with a widget
            if (node.name === "Image") {
                if (!isCursorOnLine) {
                    const text = view.state.doc.sliceString(node.from, node.to);
                    // Parse ![alt](url)
                    const match = text.match(/!\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        const alt = match[1];
                        const url = match[2];
                        decos.push({
                            from: node.from,
                            to: node.to,
                            value: Decoration.replace({ widget: new ImageWidget(url, alt) })
                        });
                    }
                }
            }

            // ORDERED LISTS (1. Item)
            // Just style the number, don't hide it.
            if (node.name === "ListMark") {
                const text = view.state.doc.sliceString(node.from, node.to);
                // Check for "1." format
                if (/^\d+[.)]/.test(text)) {
                    // It is ordered.
                    decos.push({ from: node.from, to: node.to, value: Decoration.mark({ class: "cm-list-mark" }) });
                }
            }
        }
    });

    // Sort: primarily by 'from', secondarily by 'start side'? 
    // CodeMirror decorations sort order: for same start, generic order.
    // However, RangeSetBuilder requires we add them in order.
    decos.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        // If same start, larger range first? or smaller?
        // Marks can nest. Replacements usually shouldn't overlap marks in a way that breaks.
        // Let's just sort by position.
        return a.to - b.to; // arbitrary tie break
    });

    for (const d of decos) {
        builder.add(d.from, d.to, d.value);
    }

    return builder.finish();
}

class BulletWidget extends WidgetType {
    toDOM() {
        const span = document.createElement("span");
        span.textContent = "•";
        span.className = "cm-bullet";
        span.style.marginRight = "5px";
        return span;
    }
}

class HRWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement("hr");
        hr.className = "cm-hr";
        return hr;
    }
}

class ImageWidget extends WidgetType {
    constructor(readonly src: string, readonly alt: string) { super(); }

    toDOM() {
        const img = document.createElement("img");
        img.src = this.src;
        img.alt = this.alt;
        img.className = "cm-image";
        img.style.maxWidth = "100%";
        return img;
    }

    eq(other: ImageWidget) {
        return other.src === this.src && other.alt === this.alt;
    }
}

export const livePreviewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);
