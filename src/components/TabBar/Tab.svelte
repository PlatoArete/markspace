<script lang="ts">
    import type { OpenFile } from "$lib/workspace/state";
    import { createEventDispatcher } from "svelte";
    import { X } from "lucide-svelte";

    export let file: OpenFile;
    export let active: boolean = false;

    const dispatch = createEventDispatcher();

    let isDragOver = false;

    function close(e: MouseEvent) {
        e.stopPropagation();
        dispatch("close");
    }

    function handleContextMenu(e: MouseEvent) {
        e.stopPropagation(); // Prevent event from bubbling to document
        dispatch("contextmenu", e);
    }

    function handleDragStart(e: DragEvent) {
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "tab"); // Firefox requires data
        }
        dispatch("dragstart", e);
    }

    function handleDragEnter(e: DragEvent) {
        e.preventDefault();
        isDragOver = true;
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault(); // Allow drop
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
    }

    function handleDragLeave(e: DragEvent) {
        isDragOver = false;
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling to container
        isDragOver = false;
        dispatch("drop", e);
    }

    function handleDragEnd(e: DragEvent) {
        dispatch("dragend", e);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="tab"
    class:active
    class:drag-over={isDragOver}
    draggable="true"
    on:click
    on:contextmenu|preventDefault={handleContextMenu}
    on:dragstart={handleDragStart}
    on:dragenter={handleDragEnter}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:dragend={handleDragEnd}
    role="button"
    tabindex="0"
>
    <span class="name">{file.name}</span>
    {#if file.content !== file.savedContent}
        <span class="dot">●</span>
    {/if}

    <button class="close" on:click={close} title="Close Tab" type="button">
        <X size={14} />
    </button>
</div>

<style>
    .tab {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-right: 1px solid var(--border);
        background: var(--bg-secondary);
        cursor: pointer;
        user-select: none;
        font-size: 0.85rem;
        max-width: 200px;
        min-width: 100px;
        height: 35px;
        -webkit-app-region: no-drag;
    }
    .tab.active {
        background: var(--bg-primary);
        border-top: 2px solid var(--accent);
    }
    .name {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        margin-right: 8px;
    }
    .dot {
        font-size: 0.8em;
        margin-right: 6px;
        color: var(--text-secondary);
    }
    .close {
        opacity: 0;
        font-size: 1.2em;
        line-height: normal;
        padding: 2px;
        border-radius: 4px;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        width: 18px;
        height: 18px;
    }
    .tab:hover .close {
        opacity: 1;
    }
    .close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
    .drag-over {
        background: rgba(128, 128, 128, 0.2);
        border-left: 2px solid var(--accent);
    }
</style>
