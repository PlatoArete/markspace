<script lang="ts">
  import { workspaceStore, actions } from "$lib/workspace/state";
  import { fs } from "$lib/fs";
  import { saveSession, loadSession } from "$lib/workspace/persistence";
  import Sidebar from "../components/Sidebar/Sidebar.svelte";
  import Editor from "../components/Editor/Editor.svelte";
  import TabBar from "../components/TabBar/TabBar.svelte";
  import CommandPalette from "../components/CommandPalette/CommandPalette.svelte";
  import { onMount } from "svelte";
  import { loadConfig } from "$lib/workspace/config";

  let showPalette = false;

  function handleNewFile() {
    // Find next available Untitled-X
    let i = 1;
    let name = `Untitled-${i}`;
    // Check if exists in open files
    while (
      $workspaceStore.openFiles.some((f) => f.path === name || f.name === name)
    ) {
      i++;
      name = `Untitled-${i}`;
    }

    actions.openFile({
      path: name, // Virtual path
      name: name,
      content: "",
      savedContent: "", // Initially clean? Or dirty? usually clean empty file.
      scrollPosition: 0,
      cursorPosition: 0,
    });
  }

  async function handleSaveAs() {
    const idx = $workspaceStore.activeFileIndex;
    if (idx === -1) return;
    const file = $workspaceStore.openFiles[idx];

    try {
      const newPath = await fs.saveFile(file.name);
      if (newPath) {
        await fs.writeFile(newPath, file.content);
        const newName = newPath.split(/[\\/]/).pop() || "file";

        // Update the file in store
        // We use renameOpenFile to update the current tab in place
        actions.renameOpenFile(file.path, newPath, newName);
        actions.markFileSaved(idx);
        saveStatus = "Saved";
        setTimeout(() => {
          if (saveStatus === "Saved") saveStatus = "Ready";
        }, 2000);
      }
    } catch (e: any) {
      console.error("Save As failed", e);
      saveStatus = `Error: ${e.message || e}`;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // console.log(e.key, e.ctrlKey, e.metaKey, e.shiftKey);
    const cmd = e.metaKey || e.ctrlKey;

    if (cmd && e.key === "p") {
      e.preventDefault();
      showPalette = !showPalette;
    }

    if (cmd && e.key === "s") {
      e.preventDefault();
      if (e.shiftKey || e.altKey) {
        handleSaveAs();
      } else {
        const idx = $workspaceStore.activeFileIndex;
        if (idx !== -1)
          saveContent(idx, $workspaceStore.openFiles[idx].content);
      }
    }

    if (cmd && e.key === "n") {
      e.preventDefault();
      handleNewFile();
    }

    if (cmd && e.key === "f") {
      e.preventDefault();
      // The CodeMirror keymap will handle showing the search panel
    }
  }

  let persistTimeout: any;
  workspaceStore.subscribe((state) => {
    clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
      saveSession(state);
    }, 1000);
  });

  onMount(async () => {
    const saved = loadSession();
    if (saved) {
      actions.setSidebarVisible(saved.sidebarVisible);
      actions.setSidebarWidth(saved.sidebarWidth);
      if (saved.rootPath) {
        const name = saved.rootPath.split(/[\\/]/).pop() || "Workspace";
        actions.setRoot({ path: saved.rootPath, name });
        loadConfig(saved.rootPath).then((config) => actions.setConfig(config));

        // Restore files with their dirty state content
        if (saved.openFiles && saved.openFiles.length > 0) {
          actions.setFiles(saved.openFiles);
        } else if ((saved as any).openFilePaths) {
          // Legacy support for old sessions (optional, but good for safety)
          for (const path of (saved as any).openFilePaths) {
            try {
              const content = await fs.readFile(path);
              const fname = path.split(/[\\/]/).pop() || "file";
              actions.openFile({
                path,
                name: fname,
                content,
                savedContent: content,
                scrollPosition: 0,
                cursorPosition: 0,
              });
            } catch (e) {
              console.error(`Failed to restore file ${path}`, e);
            }
          }
        }

        if (saved.activeFileIndex !== -1) {
          actions.setActiveFile(saved.activeFileIndex);
        }
      }
    }
  });

  async function openFolder() {
    try {
      const handle = await fs.openFolder();
      if (handle) {
        actions.setRoot(handle);
        // Load config if exists
        const config = await loadConfig(handle.path);
        actions.setConfig(config);
      }
    } catch (e) {
      console.error("Open folder failed", e);
    }
  }

  function handleEditorChange(newContent: string) {
    const idx = $workspaceStore.activeFileIndex;
    if (idx !== -1) {
      actions.updateFileContent(idx, newContent);
      // Removed auto-save call. Saving is now manual or on exit (via session persistence).
    }
  }

  let saveStatus = "Ready";
  let saveTimeout: any;

  function saveContent(index: number, content: string) {
    saveStatus = "Saving...";
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
      const file = $workspaceStore.openFiles[index];
      if (file) {
        // Check if virtual file
        if (file.path.startsWith("Untitled-")) {
          // Redirect to Save As
          // We need to call handleSaveAs but it relies on active index.
          // If the autosave triggers for a non-active file (rare but possible), we might have issues.
          // But here saveContent is triggered by Ctrl+S on ACTIVE file primarily or debouncer?
          // Actually saveContent is called by Ctrl+S manually now.
          // So file is likely active.
          if (index === $workspaceStore.activeFileIndex) {
            await handleSaveAs();
          } else {
            console.warn("Cannot auto-save background untitled file");
          }
          return;
        }

        try {
          await fs.writeFile(file.path, content);
          actions.markFileSaved(index);
          saveStatus = "Saved";
          setTimeout(() => {
            if (saveStatus === "Saved") saveStatus = "Ready";
          }, 2000);
        } catch (e: any) {
          console.error("Save failed", e);
          saveStatus = `Error: ${e.message || e}`;
        }
      }
    }, 100); // Reduced delay for explicit save
  }
</script>

<div class="app-container">
  <Sidebar
    width={$workspaceStore.sidebarWidth}
    visible={$workspaceStore.sidebarVisible}
  />

  <div class="main-area">
    <TabBar />
    <div class="editor-area">
      {#if $workspaceStore.activeFileIndex !== -1 && $workspaceStore.openFiles[$workspaceStore.activeFileIndex]}
        {#key $workspaceStore.openFiles[$workspaceStore.activeFileIndex].path}
          <!-- key block forces re-creation of editor when file changes, ensuring clean slate -->
          <Editor
            content={$workspaceStore.openFiles[$workspaceStore.activeFileIndex]
              .content}
            cursorPosition={$workspaceStore.openFiles[
              $workspaceStore.activeFileIndex
            ].cursorPosition}
            onChange={handleEditorChange}
          />
        {/key}
      {:else}
        <div class="empty-state">
          <p>Open a folder to start writing</p>
          <button on:click={openFolder}>Open Folder</button>
        </div>
      {/if}
    </div>
    <div class="status-bar">
      <span class="status-item">{saveStatus}</span>
    </div>
  </div>

  <CommandPalette
    bind:visible={showPalette}
    on:close={() => (showPalette = false)}
    on:command={(e) => {
      if (e.detail === "save") {
        const idx = $workspaceStore.activeFileIndex;
        if (idx !== -1)
          saveContent(idx, $workspaceStore.openFiles[idx].content);
      } else if (e.detail === "openFolder") {
        openFolder();
      }
    }}
  />
</div>

<svelte:window on:keydown={handleKeydown} />

<style>
  .status-bar {
    height: 22px;
    background: var(--accent);
    color: white;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    padding: 0 10px;
  }
  .status-item {
    margin-right: 15px;
  }
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--bg-primary);
  }
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .editor-area {
    flex: 1;
    position: relative;
    min-height: 0;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }
</style>
