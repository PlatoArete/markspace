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

    function toggleLivePreview() {
        actions.toggleLivePreview();
    }
</script>

<div class="tab-bar" role="list">
    <!-- Scrolled container for tabs -->
    <div
        class="tabs-scroll"
        on:dragover={handleDragOver}
        on:drop={handleContainerDrop}
        role="group"
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
        <!-- Spacer to allow dropping at end -->
        <div
            class="tab-spacer"
            on:drop={handleContainerDrop}
            role="presentation"
        ></div>
    </div>

    <!-- Toggle Button fixed to right -->
    <button
        class="toggle-btn"
        on:click={toggleLivePreview}
        title="Toggle Live Preview"
    >
        {$workspaceStore.livePreviewEnabled ? "👁️" : "📝"}
    </button>
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
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        height: 35px;
        flex-shrink: 0;
        justify-content: space-between;
        -webkit-app-region: no-drag;
        app-region: no-drag;
    }

    .tabs-scroll {
        display: flex;
        overflow-x: auto;
        flex-grow: 1;
        height: 100%;
    }

    .tab-spacer {
        flex-grow: 1;
        min-width: 20px;
    }

    .tabs-scroll::-webkit-scrollbar {
        height: 4px;
    }
    .tabs-scroll::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
    }

    .toggle-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0 10px;
        font-size: 1.2em;
        line-height: 1;
        display: flex;
        align-items: center;
        opacity: 0.7;
        transition: opacity 0.2s;
        border-left: 1px solid var(--border);
    }
    .toggle-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
    }
</style>
