<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import Tab from "./Tab.svelte";
    import ContextMenu from "../ContextMenu/ContextMenu.svelte";

    let menuVisible = false;
    let menuX = 0;
    let menuY = 0;
    let menuItems: any[] = [];

    function handleClose(index: number) {
        actions.closeFile(index);
    }

    function handleSelect(index: number) {
        actions.setActiveFile(index);
    }

    function handleContextMenu(e: MouseEvent, index: number) {
        e.preventDefault();
        menuX = e.clientX;
        menuY = e.clientY;
        menuVisible = true;

        const file = $workspaceStore.openFiles[index];

        menuItems = [
            { label: "Close", action: () => actions.closeFile(index) },
            {
                label: "Close Others",
                action: () => actions.closeOtherFiles(index),
            },
            { label: "Close All", action: () => actions.closeAllFiles() },
            { separator: true },
            {
                label: "Copy Path",
                action: () => navigator.clipboard.writeText(file.path),
            },
        ];
    }

    let draggedIndex: number | null = null;

    function onDragStart(index: number) {
        draggedIndex = index;
    }

    function onDrop(targetIndex: number) {
        if (draggedIndex !== null && draggedIndex !== targetIndex) {
            actions.moveOpenFiles(draggedIndex, targetIndex);
        }
        draggedIndex = null;
    }

    function onDragEnd() {
        draggedIndex = null;
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault(); // Allow drop on tab bar
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
    }

    function handleContainerDrop(e: DragEvent) {
        e.preventDefault();
        if (draggedIndex !== null) {
            // Move to the very last position
            const lastIndex = $workspaceStore.openFiles.length - 1;
            if (draggedIndex !== lastIndex) {
                actions.moveOpenFiles(draggedIndex, lastIndex);
            }
        }
        draggedIndex = null;
    }
</script>

<div
    class="tab-bar"
    on:dragover={handleDragOver}
    on:drop={handleContainerDrop}
    role="list"
>
    {#each $workspaceStore.openFiles as file, index}
        <Tab
            {file}
            active={index === $workspaceStore.activeFileIndex}
            on:click={() => handleSelect(index)}
            on:close={() => handleClose(index)}
            on:contextmenu={(e) => handleContextMenu(e.detail, index)}
            on:dragstart={() => onDragStart(index)}
            on:drop={() => onDrop(index)}
            on:dragend={onDragEnd}
        />
    {/each}
</div>

<ContextMenu
    x={menuX}
    y={menuY}
    visible={menuVisible}
    items={menuItems}
    onClose={() => (menuVisible = false)}
/>

<style>
    .tab-bar {
        display: flex;
        overflow-x: auto;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        height: 35px;
        flex-shrink: 0;
        -webkit-app-region: no-drag;
        app-region: no-drag;
    }
    .tab-bar::-webkit-scrollbar {
        height: 4px;
    }
    .tab-bar::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
    }
</style>
