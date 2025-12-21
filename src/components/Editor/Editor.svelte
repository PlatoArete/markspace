<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, keymap } from "@codemirror/view";
  import { Prec, Compartment } from "@codemirror/state";
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
        run: () => {
          console.log("Ctrl-F pressed! Toggling searchVisible to true.");
          searchVisible = true;
          return true;
        },
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
    <SearchPanel {view} visible={true} on:close={closeCustomSearch} />
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
