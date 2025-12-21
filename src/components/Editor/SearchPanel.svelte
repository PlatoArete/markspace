<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { EditorView } from "@codemirror/view";
    import {
        findNext,
        findPrevious,
        replaceNext,
        replaceAll,
        setSearchQuery,
        SearchQuery,
    } from "@codemirror/search";

    export let view: EditorView;
    export let visible: boolean = false;
    export let replaceMode: boolean = false;

    const dispatch = createEventDispatcher();

    let searchText = "";
    let replaceText = "";
    let caseSensitive = false;
    let regexp = false;
    let wholeWord = false;

    $: if (view && visible) {
        updateSearch();
    } else if (view && !visible) {
        // Clear search when closed? Optional.
    }

    function updateSearch() {
        if (!view) return;
        const query = new SearchQuery({
            search: searchText,
            caseSensitive,
            regexp,
            wholeWord,
            replace: replaceText,
        });
        view.dispatch({ effects: setSearchQuery.of(query) });
    }

    function handleNext() {
        findNext(view);
    }

    function handlePrev() {
        findPrevious(view);
    }

    function handleReplace() {
        replaceNext(view);
    }

    function handleReplaceAll() {
        replaceAll(view);
    }

    function close() {
        dispatch("close");
        view.focus();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) handlePrev();
            else handleNext();
        }
        if (e.key === "Escape") {
            close();
        }
    }

    function toggleReplace() {
        replaceMode = !replaceMode;
    }

    function autofocusAction(node: HTMLInputElement) {
        // slight delay to ensure waiting for other focus events to settle
        setTimeout(() => node.focus(), 50);
    }
</script>

{#if visible}
    <div
        class="search-panel"
        role="dialog"
        aria-label="Find and Replace"
        on:keydown={handleKeydown}
        tabindex="-1"
    >
        <div class="row top-row">
            <div class="input-wrapper">
                <!-- svelte-ignore a11y-autofocus -->
                <input
                    bind:value={searchText}
                    on:input={updateSearch}
                    placeholder="Find"
                    use:autofocusAction
                />
                <div class="actions">
                    <button
                        class:active={caseSensitive}
                        on:click={() => {
                            caseSensitive = !caseSensitive;
                            updateSearch();
                        }}
                        title="Match Case">Aa</button
                    >
                    <button
                        class:active={regexp}
                        on:click={() => {
                            regexp = !regexp;
                            updateSearch();
                        }}
                        title="Regular Expression">.*</button
                    >
                    <button
                        class:active={wholeWord}
                        on:click={() => {
                            wholeWord = !wholeWord;
                            updateSearch();
                        }}
                        title="Match Whole Word">\b</button
                    >
                </div>
            </div>
            <div class="nav-buttons">
                <button on:click={handlePrev} title="Previous Match">↑</button>
                <button on:click={handleNext} title="Next Match">↓</button>
                <button on:click={close} title="Close">×</button>
            </div>
        </div>

        <div class="row toggle-row">
            <button class="toggle-replace" on:click={toggleReplace}>
                {replaceMode ? "▼" : "▶"} Replace
            </button>
        </div>

        {#if replaceMode}
            <div class="row replace-row">
                <input
                    bind:value={replaceText}
                    on:input={updateSearch}
                    placeholder="Replace"
                />
                <div class="replace-buttons">
                    <button on:click={handleReplace}>Replace</button>
                    <button on:click={handleReplaceAll}>All</button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    .search-panel {
        position: absolute;
        top: 12px;
        right: 24px;
        z-index: 200;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        padding: 8px;
        width: 380px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--text-primary);
    }

    .row {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .input-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
    }

    input {
        width: 100%;
        background: var(--bg-primary);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 4px 8px;
        padding-right: 80px; /* Space for integral buttons */
        border-radius: 4px;
        outline: none;
        height: 28px;
    }

    input:focus {
        border-color: var(--accent);
    }

    .actions {
        position: absolute;
        right: 4px;
        display: flex;
        gap: 2px;
    }

    .actions button {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 0.75rem;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 2px;
    }

    .actions button.active {
        background: rgba(100, 100, 100, 0.2);
        color: var(--accent);
    }

    .nav-buttons button,
    .replace-buttons button,
    .toggle-replace {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-primary);
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .nav-buttons button:hover,
    .replace-buttons button:hover {
        background: rgba(128, 128, 128, 0.1);
    }

    .toggle-replace {
        font-size: 0.8em;
        opacity: 0.8;
        border: none;
        text-align: left;
        padding: 0;
    }

    .replace-row input {
        padding-right: 8px; /* No actions here */
    }
</style>
