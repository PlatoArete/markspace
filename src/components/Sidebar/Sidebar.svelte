<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import { fs } from "$lib/fs";
    import { loadConfig } from "$lib/workspace/config";
    import FileTree from "./FileTree.svelte";
    import SidebarSearch from "./SidebarSearch.svelte"; // We'll create this next
    import QuickLinks from "./QuickLinks.svelte";
    import { Files, Search, FolderOpen } from "lucide-svelte";

    import ContextMenu from "../ContextMenu/ContextMenu.svelte";
    import Modal from "../UI/Modal.svelte";
    import type { Entry } from "$lib/fs/interface";

    export let width: number;
    export let visible: boolean;
    export let isResizing = false;

    let activeTab: "files" | "search" = "files";

    let menuVisible = false;
    let menuX = 0;
    let menuY = 0;
    let menuItems: any[] = [];
    let contextEntry: Entry | null = null;

    // Modal State
    let showModal = false;
    let modalMode: "newFile" | "newFolder" | "rename" | "delete" | null = null;
    let modalTitle = "";
    let modalMessage = "";
    let modalInput = "";
    let modalShowInput = false;
    let modalDanger = false;
    let modalTargetEntry: Entry | null = null;
    let modalPrimaryAction = "Confirm";

    async function openFolder() {
        try {
            const handle = await fs.openFolder();
            if (handle) {
                actions.setRoot(handle);
                const config = await loadConfig(handle.path);
                actions.setConfig(config);
                actions.addToRecent(handle.path);
            }
        } catch (e) {
            console.error("Open folder failed", e);
        }
    }

    // Reactive set of dirty file paths
    $: dirtyPaths = new Set(
        $workspaceStore.openFiles
            .filter((f) => f.content !== f.savedContent)
            .map((f) => f.path),
    );

    function handleContextMenu(
        e: CustomEvent<{ originalEvent: MouseEvent; entry: Entry }>,
    ) {
        const { originalEvent, entry } = e.detail;
        originalEvent.preventDefault();

        contextEntry = entry;
        menuX = originalEvent.clientX;
        menuY = originalEvent.clientY;
        menuVisible = true;

        menuItems = [
            { label: "New File", action: () => handleNewFile(entry) },
            { label: "New Folder", action: () => handleNewFolder(entry) },
            { label: "New Folder", action: () => handleNewFolder(entry) },
            { separator: true },
            ...(entry.type === "directory"
                ? [
                      {
                          label: "Add to Quick Links",
                          action: () => actions.addQuickLink(entry.path),
                      },
                  ]
                : []),
            { separator: true },
            { label: "Rename", action: () => handleRename(entry) },
            {
                label: "Delete",
                action: () => handleDelete(entry),
                danger: true,
            },
        ];
    }

    function getParentPath(path: string): string {
        const lastSlash = Math.max(
            path.lastIndexOf("/"),
            path.lastIndexOf("\\"),
        );
        if (lastSlash === -1) return path; // Should not happen for absolute paths
        return path.substring(0, lastSlash);
    }

    function getSeparator(path: string): string {
        return path.indexOf("\\") !== -1 ? "\\" : "/";
    }

    function openModal(mode: typeof modalMode, title: string, entry: Entry) {
        modalMode = mode;
        modalTitle = title;
        modalTargetEntry = entry;
        showModal = true;
        modalMessage = "";
        modalDanger = false;
        modalPrimaryAction = "Confirm";

        if (mode === "delete") {
            modalShowInput = false;
            modalMessage = `Are you sure you want to delete "${entry.name}"?`;
            modalDanger = true;
            modalPrimaryAction = "Delete";
        } else {
            modalShowInput = true;
            modalInput = mode === "rename" ? entry.name : "";
        }
    }

    function handleNewFile(entry: Entry) {
        openModal("newFile", "New File", entry);
    }

    function handleNewFolder(entry: Entry) {
        openModal("newFolder", "New Folder", entry);
    }

    function handleRename(entry: Entry) {
        openModal("rename", "Rename", entry);
    }

    function handleDelete(entry: Entry) {
        openModal("delete", "Delete File", entry);
    }

    async function onModalConfirm(e: CustomEvent<string>) {
        if (!modalTargetEntry) return;

        try {
            const entry = modalTargetEntry;
            const value = e.detail; // Input value

            if (modalMode === "newFile") {
                const parent =
                    entry.type === "directory"
                        ? entry.path
                        : getParentPath(entry.path);
                const sep = getSeparator(entry.path);
                const path = `${parent}${sep}${value}`;
                await fs.writeFile(path, "");
                refreshTree();
            } else if (modalMode === "newFolder") {
                const parent =
                    entry.type === "directory"
                        ? entry.path
                        : getParentPath(entry.path);
                const sep = getSeparator(entry.path);
                const path = `${parent}${sep}${value}`;
                await fs.createDirectory(path);
                refreshTree();
            } else if (modalMode === "rename") {
                if (value && value !== entry.name) {
                    const parent = getParentPath(entry.path);
                    const sep = getSeparator(entry.path);
                    const newPath = `${parent}${sep}${value}`;
                    await fs.renamePath(entry.path, newPath);

                    // Sync Tabs
                    if (entry.type === "file") {
                        actions.renameOpenFile(entry.path, newPath, value);
                    }
                    // If directory, we technically need to update all child tabs.
                    // MVP: Close them? Or Rename them?
                    // TODO: Recursively update paths for directory rename.
                    // For now, let's just handle single file rename perfectly.

                    refreshTree();
                }
            } else if (modalMode === "delete") {
                await fs.deletePath(entry.path);

                // Sync Tabs
                if (entry.type === "file") {
                    actions.closeFileByPath(entry.path);
                } else {
                    // If directory, we should probably close all files inside it.
                    // Simple check: close any open file that starts with this directory path?
                    // Let's implement that logic in the store or here?
                    // Here is easier context-wise, but store access is needed.
                    // Actually, we can just let them be "ghost" tabs or better:
                    // Iterate open files and close if startsWith.
                    // Accessing full store here via $workspaceStore is possible but inside async function?
                    // We imported 'workspaceStore' store, we can read it via get(workspaceStore) or subscribe.
                    // Or just leave for refinement. MVP: Close exact matches.
                }

                refreshTree();
            }
        } catch (err) {
            alert("Operation failed: " + err);
        }
    }

    // Mechanism to refresh FileTree
    let treeRefreshKey = 0;
    function refreshTree() {
        treeRefreshKey++;
    }

    // Keyboard shortcut listener to toggle tabs could go here or in parent
    // For now, simple clicks.
    function handleQuickLinkContextMenu(
        e: CustomEvent<{
            originalEvent: MouseEvent;
            path: string;
            type: "favorite" | "recent";
        }>,
    ) {
        const { originalEvent, path, type } = e.detail;
        originalEvent.preventDefault();
        originalEvent.stopPropagation();

        menuX = originalEvent.clientX;
        menuY = originalEvent.clientY;
        menuVisible = true;

        if (type === "favorite") {
            menuItems = [
                {
                    label: "Remove Favorite",
                    action: () => actions.removeQuickLink(path),
                    danger: true,
                },
            ];
        } else {
            menuItems = [
                {
                    label: "Add to Favorites",
                    action: () => actions.addQuickLink(path),
                },
                {
                    label: "Remove from Recent",
                    action: () => actions.removeRecent(path),
                    danger: true,
                },
            ];
        }
    }
</script>

<div
    class="sidebar"
    style="width: {width}px"
    class:hidden={!visible}
    class:no-transition={isResizing}
>
    <div class="sidebar-header">
        <div class="tabs">
            <button
                class:active={activeTab === "files"}
                on:click={() => (activeTab = "files")}
                title="Explorer"
            >
                <Files size={18} />
            </button>
            <button
                class:active={activeTab === "search"}
                on:click={() => (activeTab = "search")}
                title="Search"
            >
                <Search size={18} />
            </button>
        </div>
        {#if activeTab === "files"}
            <button on:click={openFolder} class="icon-btn" title="Open Folder">
                <FolderOpen size={18} />
            </button>
        {/if}
    </div>

    <div class="sidebar-content">
        {#if activeTab === "files"}
            <QuickLinks on:itemcontextmenu={handleQuickLinkContextMenu} />
            {#key treeRefreshKey}
                <FileTree
                    on:itemcontextmenu={handleContextMenu}
                    on:newfile={(e) =>
                        handleNewFile({ ...e.detail, type: "directory" })}
                    on:newfolder={(e) =>
                        handleNewFolder({ ...e.detail, type: "directory" })}
                    {dirtyPaths}
                />
            {/key}
        {:else}
            <SidebarSearch />
        {/if}
    </div>

    <ContextMenu
        x={menuX}
        y={menuY}
        visible={menuVisible}
        items={menuItems}
        onClose={() => (menuVisible = false)}
    />

    <Modal
        bind:visible={showModal}
        title={modalTitle}
        message={modalMessage}
        showInput={modalShowInput}
        bind:inputValue={modalInput}
        danger={modalDanger}
        primaryAction={modalPrimaryAction}
        on:confirm={onModalConfirm}
        on:cancel={() => (showModal = false)}
    />
</div>

<style>
    .sidebar {
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        background: var(--bg-secondary);
        height: 100%;
        overflow: hidden;
        transition:
            width 0.2s cubic-bezier(0.25, 1, 0.5, 1),
            min-width 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.03); /* Subtle separation */
        z-index: 10; /* Ensure shadow sits above editor if needed */
    }

    .sidebar.no-transition {
        transition: none !important;
    }

    .sidebar.hidden {
        /* display: none;  <-- Old way */
        width: 0 !important;
        min-width: 0 !important;
        border-right: none;
        white-space: nowrap; /* Prevent text wrapping mess during shrink */
    }
    .sidebar-header {
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
        min-height: 42px;
    }
    .tabs {
        display: flex;
        gap: 12px;
    }
    .tabs button {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        font-size: 0.85rem;
        border-bottom: 2px solid transparent;
        padding-bottom: 2px;
    }
    .tabs button.active {
        color: var(--text-primary);
        border-bottom-color: var(--accent);
    }
    .tabs button:hover {
        color: var(--text-primary);
    }

    .sidebar-content {
        flex: 1;
        overflow: auto;
        display: flex;
        flex-direction: column;
    }

    .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2em;
        padding: 0;
        margin-left: 8px;
        color: var(--text-secondary);
    }
    .icon-btn:hover {
        color: var(--text-primary);
    }
</style>
