<script lang="ts">
    import type { OpenFile } from "$lib/workspace/state";
    import { createEventDispatcher } from "svelte";

    export let file: OpenFile;
    export let active: boolean = false;

    const dispatch = createEventDispatcher();

    function close(e: MouseEvent) {
        e.stopPropagation();
        dispatch("close");
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="tab" class:active on:click role="button" tabindex="0">
    <span class="name">{file.name}</span>
    {#if file.content !== file.savedContent}
        <span class="dot">●</span>
    {/if}
    <span class="close" on:click={close}>×</span>
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
        line-height: 0.5;
        padding: 2px;
        border-radius: 4px;
    }
    .tab:hover .close {
        opacity: 1;
    }
    .close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
</style>
