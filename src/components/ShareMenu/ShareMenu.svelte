<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import {
        Settings,
        FileText,
        Code,
        FileJson,
        Printer,
        FileType,
    } from "lucide-svelte"; // Icons

    export let visible = false;
    export let x = 0;
    export let y = 0;

    const dispatch = createEventDispatcher();

    function handleAction(action: string) {
        dispatch("action", action);
        visible = false;
    }

    // Close on click outside
    function handleGlobalClick(e: MouseEvent) {
        if (visible && !(e.target as Element).closest(".share-menu")) {
            dispatch("close");
        }
    }

    // Adjust position to not go off screen (basic)
    // For now simple absolute positioning.
</script>

<svelte:window on:click={handleGlobalClick} />

{#if visible}
    <div class="share-menu" style="top: {y}px; left: {x}px;">
        <button class="menu-item" on:click={() => handleAction("copyMarkdown")}>
            <FileText size={16} />
            <span>Copy as Markdown</span>
        </button>
        <button class="menu-item" on:click={() => handleAction("copyHTML")}>
            <Code size={16} />
            <span>Copy as HTML</span>
        </button>
        <div class="separator"></div>
        <button class="menu-item" on:click={() => handleAction("exportPDF")}>
            <Printer size={16} />
            <span>Export to PDF</span>
        </button>
        <button class="menu-item" on:click={() => handleAction("exportDOCX")}>
            <FileType size={16} />
            <span>Export to DOCX</span>
        </button>
        <!-- Future: User Targets -->
    </div>
{/if}

<style>
    .share-menu {
        position: fixed;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        padding: 4px 0;
        z-index: 1000;
        min-width: 180px;
    }

    .menu-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text-primary);
        gap: 8px; /* Space between icon and text */
        width: 100%;
        background: none;
        border: none;
        text-align: left;
    }

    .menu-item:hover {
        background: var(--accent);
        color: white; /* Contrast text on accent */
    }

    .separator {
        height: 1px;
        background: var(--border);
        margin: 4px 0;
    }
</style>
