<script lang="ts">
    import { slide } from "svelte/transition";
    import type { Entry } from "$lib/fs/interface";
    import { fs } from "$lib/fs";
    import { createEventDispatcher } from "svelte";
    import { Folder, FolderOpen, FileText } from "lucide-svelte";

    export let entry: Entry;
    export let depth: number = 0;
    export let dirtyPaths: Set<string> = new Set();

    const dispatch = createEventDispatcher();

    let expanded = false;
    let children: Entry[] = [];
    let loading = false;

    // derived check
    $: isDirty = dirtyPaths.has(entry.path);

    async function toggleExpand() {
        if (entry.type !== "directory") {
            dispatch("open", entry);
            return;
        }

        expanded = !expanded;
        if (expanded && children.length === 0) {
            loading = true;
            try {
                children = await fs.listDirectory(entry.path);
            } catch (e) {
                console.error("Failed to list dir", e);
            } finally {
                loading = false;
            }
        }
    }

    function handleOpen(e: CustomEvent<Entry>) {
        // Bubble up
        dispatch("open", e.detail);
    }

    function handleContextMenu(e: MouseEvent) {
        // Dispatch with original event for coordinates
        dispatch("contextmenu", { originalEvent: e, entry });
    }

    function handleChildContextMenu(
        e: CustomEvent<{ originalEvent: MouseEvent; entry: Entry }>,
    ) {
        dispatch("contextmenu", e.detail);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events(we'll add keyboard support later) -->
<div
    class="node"
    style="padding-left: {depth * 12 + 12}px"
    on:click|stopPropagation={toggleExpand}
    on:contextmenu|preventDefault|stopPropagation={handleContextMenu}
    role="button"
    tabindex="0"
>
    <span class="icon">
        {#if entry.type === "directory"}
            {#if expanded}
                <FolderOpen size={16} />
            {:else}
                <Folder size={16} />
            {/if}
        {:else}
            <FileText size={16} />
        {/if}
    </span>
    <span class="name">{entry.name}</span>
    {#if isDirty}
        <span class="dirty-dot">●</span>
    {/if}
</div>

{#if expanded}
    <div class="children" transition:slide|local>
        {#if loading}
            <div
                class="loading"
                style="padding-left: {(depth + 1) * 12 + 12}px"
            >
                Loading...
            </div>
        {:else}
            {#each children as child}
                <svelte:self
                    entry={child}
                    {dirtyPaths}
                    depth={depth + 1}
                    on:open={handleOpen}
                    on:contextmenu={handleChildContextMenu}
                />
            {/each}
        {/if}
    </div>
{/if}

<style>
    .node {
        display: flex;
        align-items: center;
        padding-top: 2px;
        padding-bottom: 2px;
        cursor: pointer;
        user-select: none;
        color: var(--text-secondary);
    }
    .node:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-primary);
    }
    .icon {
        margin-right: 6px;
        font-size: 0.9em;
    }
    .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dirty-dot {
        font-size: 0.6em;
        margin-left: 6px;
        color: var(--text-secondary); /* or accent? */
    }
    .loading {
        font-size: 0.8em;
        color: var(--text-secondary);
    }
</style>
