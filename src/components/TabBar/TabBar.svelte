<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import Tab from "./Tab.svelte";
    import { PanelLeft, Eye, FileText, PanelLeftClose } from "lucide-svelte";
    import ContextMenu from "../ContextMenu/ContextMenu.svelte";
    import Modal from "../UI/Modal.svelte";

    let menuVisible = false;
    let menuX = 0;
    let menuY = 0;
    let menuItems: any[] = [];

    // Modal State
    let showModal = false;
    let modalTitle = "";
    let modalMessage = "";
    let modalTargetIndex: number | null = null;
    let modalPrimaryAction = "Save";
    let modalExtraAction = "Discard";

    function handleClose(index: number) {
        const file = $workspaceStore.openFiles[index];
        if (file && file.content !== file.savedContent) {
            modalTargetIndex = index;
            modalTitle = "Unsaved Changes";
            modalMessage = `Do you want to save changes to "${file.name}"?`;
            modalPrimaryAction = "Save"; // Primary = Save
            modalExtraAction = "Discard"; // Extra = Discard
            showModal = true;
        } else {
            actions.closeFile(index);
        }
    }

    async function onModalConfirm() {
        if (modalTargetIndex !== null) {
            // Save Action
            const file = $workspaceStore.openFiles[modalTargetIndex];
            const content = file.content; // Current content

            // We need to call save logic. existing saveContent in +page.svelte is local there.
            // But we can trigger a save via fs.writeFile directly here since we have path/content?
            // Yes, reusing `fs` is cleaner than dispatching up to layout?
            // Actually `actions.updateFileContent` updates store.
            // We just need to persist to disk.
            // We need `fs` import.

            // Wait, "Save" implies writing to disk.
            // I need to import `fs` here.
            await import("$lib/fs").then(async ({ fs }) => {
                await fs.writeFile(file.path, content);
                actions.markFileSaved(modalTargetIndex!); // Mark clean
                actions.closeFile(modalTargetIndex!); // Then close
            });

            showModal = false;
            modalTargetIndex = null;
        }
    }

    function onModalExtra() {
        if (modalTargetIndex !== null) {
            // Discard Action
            actions.closeFile(modalTargetIndex);
            showModal = false;
            modalTargetIndex = null;
        }
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

    function toggleSidebar() {
        actions.toggleSidebar();
    }
</script>

<div class="tab-bar" role="list">
    <!-- Toggle Sidebar (Left) -->
    <button
        class="toggle-btn left-btn"
        on:click={toggleSidebar}
        title="Toggle Sidebar"
    >
        {#if $workspaceStore.sidebarVisible}
            <PanelLeftClose size={18} />
        {:else}
            <PanelLeft size={18} />
        {/if}
    </button>

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
        {#if $workspaceStore.livePreviewEnabled}
            <Eye size={18} />
        {:else}
            <FileText size={18} />
        {/if}
    </button>
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
    primaryAction={modalPrimaryAction}
    extraAction={modalExtraAction}
    extraActionDanger={true}
    on:confirm={onModalConfirm}
    on:extra={onModalExtra}
    on:cancel={() => (showModal = false)}
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
    .left-btn {
        border-left: none;
        border-right: 1px solid var(--border);
    }
    .toggle-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
    }
</style>
