import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

export const editorTheme = EditorView.theme({
    "&": {
        color: "var(--text-primary)",
        backgroundColor: "var(--bg-primary)",
        height: "100%"
    },
    ".cm-content": {
        caretColor: "var(--accent)",
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        padding: "4px 0"
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--accent)"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--accent)"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--accent)",
        opacity: "0.3"
    },
    ".cm-panels": {
        backgroundColor: "transparent",
        border: "none"
    },
    ".cm-panels.cm-panels-top": {
        display: "none !important"
    },
    ".cm-search input[name='search']": {
        flex: "1 1 auto",
        order: "1",
        minWidth: "200px"
    },
    ".cm-search button[name='next'], .cm-search button[name='prev'], .cm-search button[name='select']": {
        order: "2",
        flex: "0 0 auto"
    },
    ".cm-search input[name='replace']": {
        flex: "1 1 auto",
        order: "10",
        minWidth: "200px",
        marginTop: "4px"
    },
    ".cm-search button[name='replace'], .cm-search button[name='replaceAll']": {
        order: "11",
        flex: "0 0 auto"
    },

    ".cm-search label": {
        order: "5",
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.8em",
        marginRight: "8px",
        color: "var(--text-primary)",
        cursor: "pointer"
    },

    ".cm-search button[name='close']": {
        order: "20",
        marginLeft: "auto"
    },

    ".cm-search input": {
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "4px 8px",
        outline: "none"
    },
    "&.cm-focused": {
        outline: "none"
    },
    ".cm-searchMatch": {
        backgroundColor: "rgba(255, 255, 0, 0.3)"
    },
    ".cm-searchMatch.cm-searchMatch-selected, &.cm-focused .cm-searchMatch-selected": {
        background: "#ff9900 !important",
        color: "#000 !important"
    },
    ".cm-selectionMatch": {
        backgroundColor: "rgba(255, 255, 0, 0.4)"
    },
    ".cm-search button": {
        background: "transparent",
        color: "var(--text-primary)",
        border: "1px solid transparent",
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: "4px",
        textTransform: "capitalize",
        fontSize: "0.85em"
    },
    ".cm-search button:hover": {
        backgroundColor: "rgba(128,128,128,0.1)",
        border: "1px solid var(--border)"
    },
    ".cm-gutters": {
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-secondary)",
        borderRight: "1px solid var(--border)"
    },
    ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "var(--text-primary)"
    },
    // Tooltips (for the filter menu)
    ".cm-tooltip": {
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderRadius: "4px"
    },
    ".cm-tooltip-section:not(:first-child)": {
        borderTop: "1px solid var(--border)"
    }
}, { dark: false }); // We handle dark mode via CSS vars, so we tell CM it's flexible? Or explicit?
