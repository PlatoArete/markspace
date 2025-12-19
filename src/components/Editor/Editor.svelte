<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { createEditorState } from "$lib/editor/setup";
  import type { WorkspaceConfig } from "$lib/workspace/config";
  import { workspaceStore } from "$lib/workspace/state";

  export let content: string;
  export let config: WorkspaceConfig = $workspaceStore.config;
  export let onChange: (newContent: string) => void;

  let container: HTMLDivElement;
  let view: EditorView;

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        // console.log('Editor changed:', newContent.slice(0, 20) + '...');
        onChange(newContent);
      }
    });

    const state = createEditorState(content, config, [updateListener]);

    view = new EditorView({
      state,
      parent: container,
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

  // React to content changes from outside (e.g. switching tabs)
  $: if (view && content !== view.state.doc.toString()) {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);
      }
    });
    view.setState(createEditorState(content, config, [updateListener]));
  }
</script>

<div class="editor-container" bind:this={container}></div>

<style>
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  /* Ensure CodeMirror takes full height */
  :global(.cm-editor) {
    height: 100%;
  }
</style>
