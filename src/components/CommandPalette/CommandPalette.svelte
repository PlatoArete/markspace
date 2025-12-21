<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { workspaceStore, actions } from "$lib/workspace/state";
    import { fs } from "$lib/fs";

    export let visible: boolean = false;

    const dispatch = createEventDispatcher();
    let input: HTMLInputElement;
    let query = "";
    let selectedIndex = 0;

    type Item = {
        label: string;
        desc?: string;
        action: () => void;
    };

    $: items = getItems(query);
    $: if (visible && input) {
        setTimeout(() => input.focus(), 50);
        query = "";
        selectedIndex = 0;
    }

    function getItems(q: string): Item[] {
        const all: Item[] = [
            {
                label: "Save File",
                action: () => {
                    dispatch("command", "save");
                    close();
                },
            },
            {
                label: "Close Tab",
                action: () => {
                    actions.closeFile($workspaceStore.activeFileIndex);
                    close();
                },
            },
            {
                label: "Toggle Sidebar",
                action: () => {
                    actions.setSidebarVisible(!$workspaceStore.sidebarVisible);
                    close();
                },
            },
            {
                label: "Open Folder",
                action: () => {
                    dispatch("command", "openFolder");
                    close();
                },
            },
            {
                label: "Reload Window",
                action: () => {
                    window.location.reload();
                },
            },
            {
                label: "Toggle Live Preview",
                action: () => {
                    actions.toggleLivePreview();
                    close();
                },
            },
        ];

        // Add Open Files matches
        $workspaceStore.openFiles.forEach((f) => {
            all.push({
                label: f.name,
                desc: f.path,
                action: () => {
                    const idx = $workspaceStore.openFiles.findIndex(
                        (x) => x.path === f.path,
                    );
                    if (idx !== -1) actions.setActiveFile(idx);
                    close();
                },
            });
        });

        if (!q) return all.slice(0, 10);

        const lower = q.toLowerCase();
        return all
            .filter(
                (i) =>
                    i.label.toLowerCase().includes(lower) ||
                    (i.desc && i.desc.toLowerCase().includes(lower)),
            )
            .slice(0, 10);
    }

    function close() {
        visible = false;
        dispatch("close");
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!visible) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (items[selectedIndex]) {
                items[selectedIndex].action();
            }
        } else if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
    <div
        class="overlay"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        role="button"
        tabindex="0"
    >
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="palette" on:click|stopPropagation role="application">
            <input
                bind:this={input}
                bind:value={query}
                placeholder="Type a command..."
                type="text"
            />
            <div class="list">
                {#each items as item, i}
                    <button
                        class="item"
                        class:selected={i === selectedIndex}
                        on:mouseenter={() => (selectedIndex = i)}
                        on:click={item.action}
                    >
                        <div class="label">{item.label}</div>
                        {#if item.desc}
                            <div class="desc">{item.desc}</div>
                        {/if}
                    </button>
                {/each}
                {#if items.length === 0}
                    <div class="empty">No results</div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 10vh;
    }
    .palette {
        width: 500px;
        max-width: 90vw;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    input {
        width: 100%;
        padding: 12px 16px;
        background: var(--bg-primary);
        border: none;
        border-bottom: 1px solid var(--border);
        color: var(--text-primary);
        font-size: 1rem;
        outline: none;
    }
    .list {
        max-height: 300px;
        overflow-y: auto;
    }
    .item {
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        font-family: inherit;
        outline: none;
    }
    .item.selected {
        background: var(--accent);
        color: white;
    }
    .label {
        font-weight: 500;
    }
    .desc {
        font-size: 0.75rem;
        opacity: 0.7;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .empty {
        padding: 16px;
        text-align: center;
        color: var(--text-secondary);
    }
</style>
