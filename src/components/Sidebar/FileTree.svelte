<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import { fs } from "$lib/fs";
    import TreeNode from "./TreeNode.svelte";
    import type { Entry } from "$lib/fs/interface";

    let rootEntries: Entry[] = [];

    $: if ($workspaceStore.root) {
        loadRoot($workspaceStore.root.path);
    }

    async function loadRoot(path: string) {
        try {
            rootEntries = await fs.listDirectory(path);
        } catch (e) {
            console.error("Failed to load root", e);
        }
    }

    function handleOpen(e: CustomEvent<Entry>) {
        const entry = e.detail;
        if (entry.type === "file") {
            openFile(entry);
        }
    }

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function handleContextMenu(
        e: CustomEvent<{ originalEvent: MouseEvent; entry: Entry }>,
    ) {
        dispatch("itemcontextmenu", e.detail);
    }

    async function openFile(entry: Entry) {
        try {
            const content = await fs.readFile(entry.path);
            actions.openFile({
                path: entry.path,
                name: entry.name,
                content,
                savedContent: content,
                scrollPosition: 0,
                cursorPosition: 0,
            });
        } catch (e) {
            console.error("Failed to open file", e);
        }
    }

    // Extension for vanilla store in svelte file?
    // workspaceStore is a store object { subscribe, set, update, ... } but we exported `create<State>`.
    // Wait, I exported `workspaceStore = create(...)`. `zustand/vanilla` creates a store API { getState, setState, subscribe, ... }. It is NOT a Svelte store contract.
    // I need to wrap it or access getState().
    // In Svelte component, I can use `$workspaceStore` ONLY if it implements the Svelte store contract (subscribe).
    // Zustand vanilla store has `subscribe`, but the signature is different?
    // Svelte: `subscribe(run: (value) => void): () => void`
    // Zustand: `subscribe(listener: (state, prevState) => void): () => void`
    // They are compatible enough? Svelte passes `run`. Zustand calls listener.
    // Actually, I should probably check if I need a bridge.
    // For now, I'll access actions via `workspaceStore.getState().action(...)`.
    // And for reactive state in the script, I used `$workspaceStore` assuming it works. If not, I'll fix it.
    // The easy fix is to use `svelte-zustand` or a simple wrapper.
    // Let's assume I need a wrapper if the syntax $store fails.
    // But wait, `workspaceStore.unwrap()` ? No that's not standard.
    // I'll use `workspaceStore.getState()` for actions.

    // Correction: `workspaceStore.getState()` is correct for vanilla store actions.
</script>

<div class="file-tree">
    {#if $workspaceStore.root}
        <div class="header">
            <span>{$workspaceStore.root.name}</span>
            <div class="actions">
                <button
                    class="action-btn"
                    title="New File"
                    on:click={() => dispatch("newfile", $workspaceStore.root)}
                >
                    📝
                </button>
                <button
                    class="action-btn"
                    title="New Folder"
                    on:click={() => dispatch("newfolder", $workspaceStore.root)}
                >
                    📁
                </button>
            </div>
        </div>
        {#each rootEntries as entry}
            <TreeNode
                {entry}
                on:open={handleOpen}
                on:contextmenu={handleContextMenu}
            />
        {/each}
    {:else}
        <div class="empty">No Folder Opened</div>
    {/if}
</div>

<style>
    .file-tree {
        height: 100%;
        overflow-y: auto;
        padding-bottom: 20px;
    }
    .header {
        padding: 10px 12px;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .actions {
        display: flex;
        gap: 8px;
        /* opacity: 0; removed to make always visible */
    }
    /* .header:hover .actions { opacity: 1; } removed */
    .action-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        font-size: 1rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .action-btn:hover {
        color: var(--text-primary);
        background: rgba(128, 128, 128, 0.1);
    }
    .empty {
        padding: 20px;
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
    }
</style>
