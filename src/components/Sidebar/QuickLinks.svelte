<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import { fs } from "$lib/fs";
    import { loadConfig } from "$lib/workspace/config";
    import {
        Star,
        Clock,
        Folder,
        X,
        ChevronRight,
        ChevronDown,
        Plus,
    } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    // Props
    // export let allowRemove = true; // Removed unused prop

    const dispatch = createEventDispatcher();

    let expanded = false;

    // Derived state
    $: quickLinks = $workspaceStore.quickLinks || [];
    $: recentWorkspaces = $workspaceStore.recentWorkspaces || [];

    function toggleExpand() {
        expanded = !expanded;
    }

    function handleKeydown(e: KeyboardEvent, handler: () => void) {
        if (e.key === "Enter" || e.key === " ") {
            handler();
            e.preventDefault();
        }
    }

    async function openWorkspace(path: string) {
        // ... (same as before) ...
        // Check for unsaved changes
        const hasUnsaved = $workspaceStore.openFiles.some(
            (f) => f.content !== f.savedContent,
        );
        if (hasUnsaved) {
            const confirm = await window.confirm(
                "You have unsaved changes. Discard and switch workspace?",
            );
            if (!confirm) return;
        }

        try {
            const handle = {
                path,
                name: path.split(/[\\/]/).pop() || path,
                kind: "directory" as const,
            };

            actions.setRoot(handle);
            const config = await loadConfig(path);
            actions.setConfig(config);

            // Update Recents
            actions.addToRecent(path);
        } catch (e) {
            console.error("Failed to open workspace", e);
            alert("Could not open workspace: " + path);
        }
    }

    function removeLink(path: string, e: MouseEvent) {
        e.stopPropagation();
        actions.removeQuickLink(path);
    }

    function removeRecent(path: string, e: MouseEvent) {
        e.stopPropagation();
        const newRecents = recentWorkspaces.filter((p) => p !== path);
        actions.setRecentWorkspaces(newRecents);
    }

    async function handleAddLink(e: MouseEvent) {
        e.stopPropagation();
        try {
            const handle = await fs.openFolder();
            if (handle) {
                actions.addQuickLink(handle.path);
            }
        } catch (err) {
            console.error("Failed to add quick link", err);
        }
    }
</script>

<div class="quick-links">
    <div
        class="section-header"
        on:click={toggleExpand}
        on:keydown={(e) => handleKeydown(e, toggleExpand)}
        role="button"
        tabindex="0"
    >
        <span class="header-left">
            <span class="icon">
                {#if expanded}
                    <ChevronDown size={14} />
                {:else}
                    <ChevronRight size={14} />
                {/if}
            </span>
            <span class="title">Quick Links</span>
        </span>
        <button
            class="add-btn"
            on:click={handleAddLink}
            title="Add Folder to Quick Links"
        >
            <Plus size={14} />
        </button>
    </div>

    {#if expanded}
        <div class="content" transition:slide|local>
            <!-- Favorites -->
            {#if quickLinks.length > 0}
                <div class="group-label">Favorites</div>
                {#each quickLinks as path}
                    <div
                        class="link-item"
                        on:click={() => openWorkspace(path)}
                        on:keydown={(e) =>
                            handleKeydown(e, () => openWorkspace(path))}
                        on:contextmenu|preventDefault={(e) =>
                            dispatch("itemcontextmenu", {
                                originalEvent: e,
                                path,
                                type: "favorite",
                            })}
                        role="button"
                        tabindex="0"
                    >
                        <Star size={14} class="item-icon favorite" />
                        <span class="path-name" title={path}
                            >{path.split(/[\\/]/).pop()}</span
                        >
                        <button
                            class="remove-btn"
                            on:click={(e) => removeLink(path, e)}
                            title="Remove Favorite"
                            aria-label="Remove Favorite"
                        >
                            <X size={12} />
                        </button>
                    </div>
                {/each}
            {/if}

            <!-- Recents -->
            {#if recentWorkspaces.length > 0}
                <div class="group-label">Recent</div>
                {#each recentWorkspaces as path}
                    <div
                        class="link-item"
                        on:click={() => openWorkspace(path)}
                        on:keydown={(e) =>
                            handleKeydown(e, () => openWorkspace(path))}
                        on:contextmenu|preventDefault={(e) =>
                            dispatch("itemcontextmenu", {
                                originalEvent: e,
                                path,
                                type: "recent",
                            })}
                        role="button"
                        tabindex="0"
                    >
                        <Clock size={14} class="item-icon recent" />
                        <span class="path-name" title={path}
                            >{path.split(/[\\/]/).pop()}</span
                        >
                        <button
                            class="remove-btn"
                            on:click={(e) => removeRecent(path, e)}
                            title="Remove from Recent"
                            aria-label="Remove from Recent"
                        >
                            <X size={12} />
                        </button>
                    </div>
                {/each}
            {/if}

            {#if quickLinks.length === 0 && recentWorkspaces.length === 0}
                <div class="empty-state">No links yet.</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .quick-links {
        border-bottom: 1px solid var(--border);
    }
    .section-header {
        padding: 8px 12px;
        display: flex;
        align-items: center;
        width: 100%; /* Ensure full width */
        justify-content: space-between; /* Space out title and button */
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-secondary);
        user-select: none;
    }
    .header-left {
        display: flex;
        align-items: center;
    }
    .section-header:hover {
        color: var(--text-primary);
    }
    .section-header .icon {
        margin-right: 4px;
        display: flex;
    }
    .add-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 2px;
        display: flex;
        opacity: 0; /* Hidden by default */
        transition: opacity 0.2s;
    }
    .section-header:hover .add-btn {
        opacity: 1; /* Show on hover */
    }
    .add-btn:hover {
        color: var(--accent);
        background: rgba(128, 128, 128, 0.1);
        border-radius: 4px;
    }
    .content {
        padding-bottom: 8px;
    }
    .group-label {
        padding: 4px 24px;
        font-size: 0.7em;
        color: var(--text-secondary);
        opacity: 0.7;
        text-transform: uppercase;
        margin-top: 4px;
    }
    .link-item {
        padding: 4px 12px 4px 24px; /* Indent content */
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--text-primary);
    }
    .link-item:hover {
        background: rgba(128, 128, 128, 0.1);
    }
    :global(.item-icon) {
        margin-right: 8px;
        flex-shrink: 0;
    }
    :global(.item-icon.favorite) {
        color: var(--accent);
    }
    :global(.item-icon.recent) {
        color: var(--text-secondary);
    }

    .path-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .remove-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: none; /* Show on hover */
        padding: 2px;
    }
    .link-item:hover .remove-btn {
        display: flex;
    }
    .remove-btn:hover {
        color: var(--error, red);
    }
    .empty-state {
        padding: 4px 24px;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.8em;
    }
</style>
