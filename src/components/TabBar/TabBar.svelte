<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import Tab from "./Tab.svelte";
    import {
        PanelLeft,
        Eye,
        FileText,
        PanelLeftClose,
        Share2,
    } from "lucide-svelte";
    import ContextMenu from "../ContextMenu/ContextMenu.svelte";
    import Modal from "../UI/Modal.svelte";
    import ShareMenu from "../ShareMenu/ShareMenu.svelte";
    import { marked } from "marked";
    import DOMPurify from "dompurify";
    import { notifications } from "$lib/utils/notifications";

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

            await import("$lib/fs").then(async ({ fs }) => {
                await fs.writeFile(file.path, content);
                actions.markFileSaved(modalTargetIndex!); // Mark clean
                actions.closeFile(modalTargetIndex!); // Then close
            });

            showModal = false;
            modalTargetIndex = null;
        } else {
            // Info Modal Action (OK)
            showModal = false;
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

    // Share Menu State
    let shareMenuVisible = false;
    let shareMenuX = 0;
    let shareMenuY = 0;

    function toggleShareMenu(e: MouseEvent) {
        e.stopPropagation(); // Prevent global click listener from closing it immediately
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        shareMenuY = rect.bottom + 5; // Below button

        // Check if menu would overflow right edge (assuming ~200px width)
        const MENU_WIDTH = 200;
        if (rect.left + MENU_WIDTH > window.innerWidth) {
            shareMenuX = rect.right - MENU_WIDTH;
        } else {
            shareMenuX = rect.left;
        }

        shareMenuVisible = !shareMenuVisible;
    }

    async function handleShareAction(e: CustomEvent<string>) {
        const action = e.detail;
        const index = $workspaceStore.activeFileIndex;
        if (index === -1) return;
        const content = $workspaceStore.openFiles[index].content;

        switch (action) {
            case "copyMarkdown":
                try {
                    await navigator.clipboard.writeText(content);
                } catch (err) {
                    console.error("Failed to copy", err);
                }
                break;
            case "copyHTML":
                try {
                    const html = DOMPurify.sanitize(
                        await marked.parse(content),
                    );
                    await navigator.clipboard.writeText(html);
                } catch (err) {
                    console.error("Failed to copy HTML", err);
                }
                break;
            case "exportPDF":
                // 1. Render Markdown to HTML
                const pdfHtml = DOMPurify.sanitize(await marked.parse(content));

                // 2. Wrap via html2pdf
                // We need to dynamically import html2pdf because it's client-side only and might have issues during SSR import if not careful (though we are in extensive client-side logic).
                // It's safer to import inside the function or use the global if loaded via script, but npm module works.
                // Note: html2pdf.js is often imported as: import html2pdf from 'html2pdf.js';
                // But TypeScript might need `const html2pdf = (await import('html2pdf.js')).default;`

                try {
                    const html2pdf = (await import("html2pdf.js")).default;

                    // Create a container with styles for the PDF generation
                    const element = document.createElement("div");
                    element.innerHTML = `
                        <style>
                            .pdf-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
                            .pdf-content h1, .pdf-content h2, .pdf-content h3 { color: #111; margin-top: 1.5em; margin-bottom: 0.5em; }
                            .pdf-content h1 { border-bottom: 1px solid #eaeaea; padding-bottom: 0.3em; }
                            .pdf-content code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
                            .pdf-content pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
                            .pdf-content blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding-left: 1em; margin: 0; }
                            .pdf-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                            .pdf-content th, .pdf-content td { border: 1px solid #dfe2e5; padding: 6px 13px; }
                            .pdf-content img { max-width: 100%; }
                        </style>
                        <div class="pdf-content">
                            ${pdfHtml}
                        </div>
                    `;

                    // Apply styles inline or via class? html2pdf takes a snapshot.
                    // Best to style the element directly.
                    element.style.fontFamily = "Arial, sans-serif";
                    element.style.lineHeight = "1.6";
                    element.style.color = "#333";
                    element.style.padding = "20px";
                    element.style.background = "white";

                    // Specific GitHub-like styles for children
                    // This is harder to apply via inline styles on a wrapper...
                    // Let's use simple CSS text injection if html2pdf supports it?
                    // Actually html2pdf renders the DOM element. We can append it to body (hidden), render, then remove.

                    element.style.width = "800px"; // Fixed width for PDF consistency
                    // element.style.display = 'none'; // html2pdf needs it visible? mostly no, but safer to be off-screen.
                    // html2pdf can render off-screen elements? usually.

                    const opt = {
                        margin: 10, // mm
                        filename: `${$workspaceStore.openFiles[index].name.replace(/\.md$/, "")}.pdf`,
                        image: { type: "jpeg" as const, quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: {
                            unit: "mm",
                            format: "a4",
                            orientation: "portrait" as const,
                        },
                    };

                    await html2pdf().set(opt).from(element).save();
                    notifications.success(
                        "PDF file has been saved to your downloads.",
                    );
                } catch (e) {
                    console.error("PDF Export Failed", e);
                    notifications.error("Could not generate PDF.");
                }
                break;
        }
    }

    function showInfo(title: string, message: string) {
        // Legacy support or remove if unused.
        // We use notifications now.
        notifications.info(message);
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
    <div style="display: flex;">
        <button class="toggle-btn" on:click={toggleShareMenu} title="Share">
            <Share2 size={16} />
        </button>
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
</div>

<ContextMenu
    x={menuX}
    y={menuY}
    visible={menuVisible}
    items={menuItems}
    onClose={() => (menuVisible = false)}
/>

<ShareMenu
    x={shareMenuX}
    y={shareMenuY}
    visible={shareMenuVisible}
    on:close={() => (shareMenuVisible = false)}
    on:action={handleShareAction}
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
        overflow-y: hidden; /* Prevent vertical scrollbar artifact */
        flex-grow: 1;
        height: 100%;
        scrollbar-width: none; /* Firefox */
    }

    .tab-spacer {
        flex-grow: 1;
        min-width: 20px;
    }

    .tabs-scroll::-webkit-scrollbar {
        display: none; /* Hide scrollbar for clean look */
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
        transition:
            opacity 0.2s,
            color 0.2s;
        /* border-left: 1px solid var(--border); removed as per request */
        color: var(--text-secondary);
    }
    .left-btn {
        border-left: none;
        border-right: 1px solid var(--border);
    }
    .toggle-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-primary);
    }
</style>
