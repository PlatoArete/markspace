<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import Tab from "./Tab.svelte";

    function handleClose(index: number) {
        actions.closeFile(index);
    }

    function handleSelect(index: number) {
        actions.setActiveFile(index);
    }
</script>

<div class="tab-bar">
    {#each $workspaceStore.openFiles as file, index}
        <Tab
            {file}
            active={index === $workspaceStore.activeFileIndex}
            on:click={() => handleSelect(index)}
            on:close={() => handleClose(index)}
        />
    {/each}
</div>

<style>
    .tab-bar {
        display: flex;
        overflow-x: auto;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        height: 35px;
        flex-shrink: 0;
    }
    .tab-bar::-webkit-scrollbar {
        height: 4px;
    }
    .tab-bar::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
    }
</style>
