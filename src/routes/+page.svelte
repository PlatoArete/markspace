<script lang="ts">
  import { workspaceStore, actions } from "$lib/workspace/state";
  import { fs } from "$lib/fs";
  import { saveSession, loadSession } from "$lib/workspace/persistence";
  import Sidebar from "../components/Sidebar/Sidebar.svelte";
  import Editor from "../components/Editor/Editor.svelte";
  import TabBar from "../components/TabBar/TabBar.svelte";
  import CommandPalette from "../components/CommandPalette/CommandPalette.svelte";
  import { onMount } from "svelte";
  import { loadConfig, DEFAULT_CONFIG } from "$lib/workspace/config";

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

    // Apply Theme Overrides
    if (state.config.theme) {
      const root = document.documentElement;
      if (state.config.theme.accentColor) {
        root.style.setProperty("--accent", state.config.theme.accentColor);
        // Simple hover variant generator (just same for now, or use css-color-function if added)
        // root.style.setProperty('--accent-hover', state.config.theme.accentColor);
      }
      if (state.config.theme.interfaceFont) {
        // Apply to body? or just a var
        // root.style.setProperty('--font-interface', state.config.theme.interfaceFont);
        // Updating body font family directly or via var mapping
        document.body.style.fontFamily = `${state.config.theme.interfaceFont}, system-ui, sans-serif`;
      }
      if (state.config.theme.colorScheme) {
        root.setAttribute("data-theme", state.config.theme.colorScheme);
      } else {
        root.setAttribute("data-theme", "light");
      }
      if (state.config.theme.editorFont) {
        root.style.setProperty("--font-editor", state.config.theme.editorFont);
      }
      if (state.config.theme.fontSize) {
        root.style.setProperty(
          "--editor-font-size",
          `${state.config.theme.fontSize}px`,
        );
      } else {
        root.style.setProperty("--editor-font-size", "14px");
      }
    }
  });

  onMount(async () => {
    const saved = loadSession();
    if (saved) {
      actions.setSidebarVisible(saved.sidebarVisible);
      actions.setSidebarWidth(saved.sidebarWidth);
      if (saved.rootPath) {
        const name = saved.rootPath.split(/[\\/]/).pop() || "Workspace";
        actions.setRoot({ path: saved.rootPath, name });
        // Use persisted theme as base
        const baseConfig = DEFAULT_CONFIG;
        if (saved.themePreferences) {
          baseConfig.theme = {
            ...DEFAULT_CONFIG.theme,
            ...saved.themePreferences,
          };
        }
        loadConfig(saved.rootPath, baseConfig).then((config) =>
          actions.setConfig(config),
        );

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

      // Phase 15: Restore QuickLinks and Recents
      // Restore links first
      if (saved.quickLinks && saved.quickLinks.length > 0) {
        actions.setQuickLinks(saved.quickLinks);
      }

      // Auto-add Documents folder (ensure it exists)
      try {
        const docs = await fs.getDocumentsDir();
        if (docs) {
          // Verify if it's already there to avoid unnecessary store updates (though store handles it)
          // But we need to act after the setQuickLinks above.
          // Since checking store state synchronously here is tricky if update is async (zustand vanilla is sync though)
          // Use prepend to force it to top as requested.
          actions.prependQuickLink(docs);
        }
      } catch (e) {
        console.error("Could not get documents dir", e);
      }

      if (saved.recentWorkspaces) {
        actions.setRecentWorkspaces(saved.recentWorkspaces);
      }
    } else {
      // First run (no saved session)
      try {
        const docs = await fs.getDocumentsDir();
        if (docs) {
          actions.addQuickLink(docs);
        }
      } catch (e) {
        console.log("Could not get documents dir for first run", e);
      }
    }
  });

  async function openFolder() {
    try {
      const handle = await fs.openFolder();
      if (handle) {
        actions.setRoot(handle);
        // Load config if exists, using current theme as base to persist it
        const currentConfig = $workspaceStore.config;
        const baseConfig = DEFAULT_CONFIG;
        // If we have a current theme, carry it over
        if (currentConfig.theme) {
          baseConfig.theme = {
            ...DEFAULT_CONFIG.theme,
            ...currentConfig.theme,
          };
        }
        const config = await loadConfig(handle.path, baseConfig);
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
    }, 100);
  }

  // Sidebar Resizing Logic
  let isResizing = false;

  function startResize() {
    isResizing = true;
    // Prevent text selection during resize
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  function stopResize() {
    if (isResizing) {
      isResizing = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing) return;

    let newWidth = e.clientX;
    const SNAP_THRESHOLD = 50; // px
    const MIN_WIDTH = 150;
    const MAX_WIDTH = 800; // reasonable max

    // Snap to close
    if (newWidth < SNAP_THRESHOLD) {
      if ($workspaceStore.sidebarVisible) {
        actions.setSidebarVisible(false);
      }
      // We don't update width when snapped closed, or maybe we set it to min for next open?
      // Let's keep width somewhat valid.
      return;
    }

    // Auto-show if dragged out
    if (!$workspaceStore.sidebarVisible && newWidth > SNAP_THRESHOLD) {
      actions.setSidebarVisible(true);
    }

    // Clamp width
    if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
    if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;

    actions.setSidebarWidth(newWidth);
  }
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:mousemove={handleResize}
  on:mouseup={stopResize}
/>

<div class="app-container">
  <Sidebar
    width={$workspaceStore.sidebarWidth}
    visible={$workspaceStore.sidebarVisible}
    {isResizing}
  />

  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="resizer"
    on:mousedown={startResize}
    class:hidden={!$workspaceStore.sidebarVisible}
  ></div>

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
            config={$workspaceStore.config}
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
  .resizer {
    width: 4px;
    cursor: col-resize;
    background: var(--border);
    transition: background 0.2s;
    z-index: 10;
  }
  .resizer:hover,
  .resizer:active {
    background: var(--accent);
  }
  .resizer.hidden {
    display: none;
  }
</style>
