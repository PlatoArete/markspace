<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { EditorView } from "@codemirror/view";
    import {
        findNext,
        findPrevious,
        replaceNext,
        replaceAll,
        setSearchQuery,
        SearchQuery,
        openSearchPanel,
        closeSearchPanel,
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

    export let defaultSearch: string = "";

    onMount(() => {
        if (defaultSearch) {
            searchText = defaultSearch;
        }
        // Open the search panel state to activate highlighting
        view.dispatch({ effects: openSearchPanel.of(null) });
        updateSearch();
    });

    $: if (view && visible) {
        updateSearch();
    } else if (view && !visible) {
        // Clear search when closed? Optional.
    }

    function updateSearch() {
        if (!view) return;
        dispatch("searchChange", searchText);
        const query = new SearchQuery({
            search: searchText,
            caseSensitive,
            regexp,
            wholeWord,
            replace: replaceText,
        });
        view.dispatch({ effects: setSearchQuery.of(query) });
        countMatches(query);
    }

    let matchCount = 0;
    let currentMatchIndex = 0;

    function countMatches(query: SearchQuery) {
        if (!view) return;
        let count = 0;
        let cursor = query.getCursor(view.state);

        // Find current selection head to determine index
        const selectionHead = view.state.selection.main.head;
        let foundIndex = -1;

        let result = cursor.next();
        while (!result.done) {
            count++;
            const match = result.value;
            // If the match ends after the selection head, and we haven't found index yet
            if (
                foundIndex === -1 &&
                match.to >= selectionHead &&
                match.from <= selectionHead
            ) {
                foundIndex = count;
            } else if (foundIndex === -1 && match.from >= selectionHead) {
                // This match is after our cursor, but we weren't *in* a match.
            }
            result = cursor.next();
        }
        matchCount = count;

        updateCurrentMatchIndex();
    }

    function updateCurrentMatchIndex() {
        if (!searchText) {
            currentMatchIndex = 0;
            return;
        }
        const query = new SearchQuery({
            search: searchText,
            caseSensitive,
            regexp,
            wholeWord,
            replace: replaceText, // include replace for correctness though not needed for searching
        });

        let cursor = query.getCursor(view.state);
        let count = 0;
        const main = view.state.selection.main;
        let found = 0;

        let result = cursor.next();
        while (!result.done) {
            count++;
            const match = result.value;
            // Exact match for selection
            if (match.from === main.from && match.to === main.to) {
                found = count;
            }
            result = cursor.next();
        }
        currentMatchIndex = found;
        matchCount = count; // Ensure sync
    }

    // Update index on user navigation (click/key)
    // We can listen to view update in the parent, or check on every interactive action here.
    // Or add a updateListener to view that calls updateCurrentMatchIndex?
    // Since SearchPanel doesn't own the view update loop, we can only update on local actions
    // OR we hook into view updates via props (passing view updates down?).
    // For now, let's update on next/prev clicks.

    function handleNext() {
        findNext(view);
        updateCurrentMatchIndex();
    }

    function handlePrev() {
        findPrevious(view);
        updateCurrentMatchIndex();
    }

    function handleReplace() {
        replaceNext(view);
    }

    function handleReplaceAll() {
        replaceAll(view);
    }

    function close() {
        // Close the search panel state
        view.dispatch({ effects: closeSearchPanel.of(null) });
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
                {#if searchText}
                    <span class="match-count">
                        {currentMatchIndex} / {matchCount}
                    </span>
                {/if}
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
    .match-count {
        position: absolute;
        right: 80px; /* Left of actions */
        color: var(--text-secondary);
        font-size: 0.75rem;
        pointer-events: none;
        white-space: nowrap;
    }
</style>
