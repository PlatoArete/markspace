<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, keymap } from "@codemirror/view";
  import { Prec } from "@codemirror/state"; // Import Prec
  import { createEditorState } from "$lib/editor/setup";
  import type { WorkspaceConfig } from "$lib/workspace/config";
  import { workspaceStore } from "$lib/workspace/state";
  import SearchPanel from "./SearchPanel.svelte";

  export let content: string;
  export let config: WorkspaceConfig = $workspaceStore.config;
  export let cursorPosition: number | undefined = undefined; // New prop for initial cursor pos
  export let onChange: (newContent: string) => void;

  let container: HTMLDivElement;
  let view: EditorView;
  let searchVisible = false;

  // Function to move cursor and scroll
  function jumpToCursor(pos: number) {
    if (!view) return;
    view.dispatch({
      selection: { anchor: pos, head: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    // Focus the editor
    view.focus();
  }

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        // console.log('Editor changed:', newContent.slice(0, 20) + '...');
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

    // Ensure our keymap has highest precedence override
    const highPriKeymap = Prec.highest(searchKeymapExtension);

    const state = createEditorState(content, config, [
      updateListener,
      highPriKeymap,
    ]);

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

  // React to content changes from outside (e.g. switching tabs)
  $: if (view && content !== view.state.doc.toString()) {
    // Re-create listener/state if content forces full reset
    // Ideally we'd just update doc, but full reset is safer for MVP sync
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);
      }
    });
    // We need to re-attach the keymap here too if we fully reset state
    const searchKeymapExtension = keymap.of([
      {
        key: "Mod-f",
        run: () => {
          searchVisible = true;
          return true;
        },
      },
    ]);

    // Ensure our keymap has highest precedence override
    const highPriKeymap = Prec.highest(searchKeymapExtension);

    view.setState(
      createEditorState(content, config, [updateListener, highPriKeymap]),
    );

    // Jump if provided
    if (cursorPosition !== undefined) {
      jumpToCursor(cursorPosition);
    }
  } else if (view && cursorPosition !== undefined) {
    // Content didn't change (or mismatch) but cursor did?
    // Actually usually both change. But if only cursor prop changes we might want to jump.
    // But props change triggers the reactive block.
    // We should check if current selection matches.
    // For simplicity, just jump if provided (might be annoying if user clicks elsewhere, but this prop comes from opening file)
    // Usually openFile sets it, then it's static.
    // We can rely on the fact that openFile updates the store which updates the prop.
  }
</script>

<div class="editor-container" bind:this={container}></div>

<SearchPanel
  {view}
  bind:visible={searchVisible}
  on:close={() => (searchVisible = false)}
/>

<style>
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: relative;
  }
  /* Ensure CodeMirror takes full height */
  :global(.cm-editor) {
    height: 100%;
  }
</style>
