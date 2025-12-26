<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let x: number;
    export let y: number;
    export let items: {
        label: string;
        action: () => void;
        danger?: boolean;
        separator?: boolean;
    }[] = [];
    export let visible: boolean;
    export let onClose: () => void;

    let menuElement: HTMLDivElement;

    function handleClickOutside(event: MouseEvent) {
        if (
            visible &&
            menuElement &&
            !menuElement.contains(event.target as Node)
        ) {
            onClose();
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("contextmenu", handleClickOutside);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("contextmenu", handleClickOutside);
    });
</script>

{#if visible}
    <div
        class="context-menu"
        role="menu"
        tabindex="-1"
        style="top: {y}px; left: {x}px;"
        bind:this={menuElement}
        on:contextmenu|preventDefault
    >
        {#each items as item}
            {#if item.separator}
                <div class="separator"></div>
            {:else}
                <button
                    class="menu-item"
                    class:danger={item.danger}
                    on:click={() => {
                        item.action();
                        onClose();
                    }}
                >
                    {item.label}
                </button>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .context-menu {
        position: fixed;
        z-index: 9999;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        padding: 4px 0;
        min-width: 150px;
        display: flex;
        flex-direction: column;
    }

    .menu-item {
        background: none;
        border: none;
        text-align: left;
        padding: 6px 16px;
        cursor: pointer;
        font-size: 13px;
        color: var(--text-primary);
        display: block;
        width: 100%;
    }

    .menu-item:hover {
        background: var(
            --bg-primary
        ); /* Slightly lighter/darker depending on theme, or use specific hover color */
        background: rgba(128, 128, 128, 0.1);
    }

    .menu-item.danger {
        color: #ff4d4f;
    }
    .menu-item.danger:hover {
        background: rgba(255, 77, 79, 0.1);
    }

    .separator {
        height: 1px;
        background: var(--border);
        margin: 4px 0;
    }
</style>
