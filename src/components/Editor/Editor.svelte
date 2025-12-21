<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, keymap } from "@codemirror/view";
  import { Prec, Compartment, EditorSelection } from "@codemirror/state";
  import { createEditorState } from "$lib/editor/setup";
  import type { WorkspaceConfig } from "$lib/workspace/config";
  import { workspaceStore } from "$lib/workspace/state";
  import SearchPanel from "./SearchPanel.svelte";
  import { livePreviewPlugin } from "$lib/editor/live-preview";
  import { markdown } from "@codemirror/lang-markdown";
  import { editorTheme } from "$lib/editor/theme";

  export let content: string;
  export let config: WorkspaceConfig = $workspaceStore.config;
  export let cursorPosition: number | undefined = undefined;
  export let onChange: (newContent: string) => void;

  let container: HTMLDivElement;
  let view: EditorView;
  let searchVisible = false;
  let searchReplaceMode = false;
  let activeSearchText = "";
  let lastSearchText = "";

  // Compartment for live preview plugin
  let livePreviewCompartment = new Compartment();

  // Reactively update live preview from store
  $: livePreviewEnabled = $workspaceStore.livePreviewEnabled;
  $: if (view) {
    view.dispatch({
      effects: livePreviewCompartment.reconfigure(
        livePreviewEnabled ? livePreviewPlugin : [],
      ),
    });
  }

  function jumpToCursor(pos: number) {
    if (!view) return;
    view.dispatch({
      selection: { anchor: pos, head: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }

  function closeCustomSearch() {
    searchVisible = false;
    view.focus();
  }

  function toggleFormatting(view: EditorView, marker: string) {
    const changes = view.state.changeByRange((range) => {
      const content = view.state.sliceDoc(range.from, range.to);
      const markerLen = marker.length;

      // check if already wrapped with marker
      // Needs context check (sliceDoc surrounding chars)
      const from = Math.max(0, range.from - markerLen);
      const to = Math.min(view.state.doc.length, range.to + markerLen);
      const around = view.state.sliceDoc(from, to);
      const isWrapped = around.startsWith(marker) && around.endsWith(marker);

      if (isWrapped) {
        // Unwrap
        return {
          range: EditorSelection.range(
            range.from - markerLen,
            range.to - markerLen,
          ),
          changes: {
            from: range.from - markerLen,
            to: range.to + markerLen,
            insert: content,
          },
        };
      } else {
        // Wrap
        return {
          range: EditorSelection.range(
            range.from + markerLen,
            range.to + markerLen,
          ),
          changes: {
            from: range.from,
            to: range.to,
            insert: `${marker}${content}${marker}`,
          },
        };
      }
    });

    view.dispatch(changes);
    return true;
  }

  function toggleHeading(view: EditorView, level: number) {
    const changes = view.state.changeByRange((range) => {
      const line = view.state.doc.lineAt(range.from);
      const text = line.text;
      const headingRegex = /^(#{1,6})\s/;
      const match = text.match(headingRegex);

      const prefix = "#".repeat(level) + " ";

      if (match) {
        // Already a heading
        const currentLevel = match[1].length;
        if (currentLevel === level) {
          // Remove heading
          return {
            range: EditorSelection.range(
              range.from - match[0].length,
              range.from - match[0].length,
            ), // Maintain approx pos
            changes: {
              from: line.from,
              to: line.from + match[0].length,
              insert: "",
            },
          };
        } else {
          // Change level
          return {
            range: EditorSelection.range(range.from, range.from),
            changes: {
              from: line.from,
              to: line.from + match[0].length,
              insert: prefix,
            },
          };
        }
      } else {
        // Add heading
        return {
          range: EditorSelection.range(
            range.from + prefix.length,
            range.from + prefix.length,
          ),
          changes: { from: line.from, to: line.from, insert: prefix },
        };
      }
    });
    view.dispatch(changes);
    return true;
  }

  function toggleLinePrefix(view: EditorView, prefix: string) {
    const changes = view.state.changeByRange((range) => {
      const line = view.state.doc.lineAt(range.from);
      const text = line.text;

      if (text.startsWith(prefix)) {
        // Remove
        return {
          range: EditorSelection.range(
            range.from - prefix.length,
            range.from - prefix.length,
          ),
          changes: {
            from: line.from,
            to: line.from + prefix.length,
            insert: "",
          },
        };
      } else {
        // Add
        return {
          range: EditorSelection.range(
            range.from + prefix.length,
            range.from + prefix.length,
          ),
          changes: { from: line.from, to: line.from, insert: prefix },
        };
      }
    });
    view.dispatch(changes);
    return true;
  }

  function insertLink(view: EditorView) {
    const changes = view.state.changeByRange((range) => {
      const content = view.state.sliceDoc(range.from, range.to);
      return {
        range: EditorSelection.range(
          range.from + content.length + 3,
          range.from + content.length + 3,
        ), // Cursor inside ()
        changes: { from: range.from, to: range.to, insert: `[${content}]()` },
      };
    });
    view.dispatch(changes);
    return true;
  }

  function toggleCodeBlock(view: EditorView) {
    const changes = view.state.changeByRange((range) => {
      const content = view.state.sliceDoc(range.from, range.to);
      const fence = "```";
      // Simple wrap for now, smart checking for existing fence is complex
      const insert = `${fence}\n${content}\n${fence}`;
      return {
        range: EditorSelection.range(
          range.from + fence.length + 1,
          range.to + fence.length + 1,
        ),
        changes: { from: range.from, to: range.to, insert: insert },
      };
    });
    view.dispatch(changes);
    return true;
  }

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);
      }
    });

    const searchKeymapExtension = keymap.of([
      {
        key: "Mod-f",
        run: (view) => {
          const selection = view.state.sliceDoc(
            view.state.selection.main.from,
            view.state.selection.main.to,
          );
          activeSearchText = selection || lastSearchText;
          if (selection) lastSearchText = selection;

          searchVisible = true;
          searchReplaceMode = false;
          return true;
        },
      },
      {
        key: "Mod-h",
        run: (view) => {
          const selection = view.state.sliceDoc(
            view.state.selection.main.from,
            view.state.selection.main.to,
          );
          activeSearchText = selection || lastSearchText;
          if (selection) lastSearchText = selection;

          searchVisible = true;
          searchReplaceMode = true;
          return true;
        },
      },
      {
        key: "Mod-b",
        run: (view) => toggleFormatting(view, "**"),
      },
      {
        key: "Mod-i",
        run: (view) => toggleFormatting(view, "*"),
      },
      { key: "Mod-1", run: (view) => toggleHeading(view, 1) },
      { key: "Mod-2", run: (view) => toggleHeading(view, 2) },
      { key: "Mod-3", run: (view) => toggleHeading(view, 3) },
      { key: "Mod-'", run: (view) => toggleLinePrefix(view, "> ") },
      { key: "Mod-k", run: (view) => insertLink(view) },
      {
        key: "Mod-Alt-c",
        run: (view) => toggleCodeBlock(view),
        preventDefault: true,
      },
      {
        key: "Escape",
        run: () => {
          if (searchVisible) {
            searchVisible = false;
            view.focus();
            return true;
          }
          return false;
        },
      },
    ]);

    const highPriKeymap = Prec.highest(searchKeymapExtension);

    // Initial extensions including live preview
    const initialExtensions = [
      updateListener,
      highPriKeymap,
      livePreviewCompartment.of(
        $workspaceStore.livePreviewEnabled ? livePreviewPlugin : [],
      ),
      EditorView.contentAttributes.of({
        spellcheck: "true",
        autocorrect: "on",
        autocapitalize: "on",
      }),
    ];

    const state = createEditorState(content, config, initialExtensions);

    view = new EditorView({
      state,
      parent: container,
    });

    if (cursorPosition !== undefined) {
      jumpToCursor(cursorPosition);
    }
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

  $: if (view && content !== view.state.doc.toString()) {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);
      }
    });

    const searchKeymapExtension = keymap.of([
      {
        key: "Mod-f",
        run: () => {
          searchVisible = true;
          return true;
        },
      },
    ]);

    const highPriKeymap = Prec.highest(searchKeymapExtension);

    // Re-create state with live preview preserved or re-initialized
    const currentExtensions = [
      updateListener,
      highPriKeymap,
      livePreviewCompartment.of(livePreviewEnabled ? livePreviewPlugin : []),
      EditorView.contentAttributes.of({
        spellcheck: "true",
        autocorrect: "on",
        autocapitalize: "on",
      }),
    ];

    view.setState(createEditorState(content, config, currentExtensions));

    if (cursorPosition !== undefined) {
      jumpToCursor(cursorPosition);
    }
  }
</script>

<div class="wrapper">
  <div class="editor-container" bind:this={container}></div>

  {#if searchVisible}
    <SearchPanel
      {view}
      visible={true}
      replaceMode={searchReplaceMode}
      defaultSearch={activeSearchText}
      on:close={closeCustomSearch}
      on:searchChange={(e) => {
        // If the user types in search box, update lastSearchText so it persists next time if closed
        lastSearchText = e.detail;
      }}
    />
  {/if}
</div>

<style>
  .wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    /* Ensure CodeMirror takes full height/width of container */
  }
  :global(.cm-editor) {
    height: 100%;
  }
</style>
