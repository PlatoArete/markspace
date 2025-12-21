<script lang="ts">
    import { globalSearch, type SearchResult } from "$lib/search/engine";
    import { workspaceStore, actions } from "$lib/workspace/state";

    import { searchStore } from "$lib/search/store";

    // Subscribe to store
    let query = "";
    let options = { caseSensitive: false, useRegex: false, wholeWord: false };
    let results: SearchResult[] = [];
    let searching = false;
    let searchTime = 0;

    searchStore.subscribe((state) => {
        query = state.query;
        options = state.options;
        results = state.results;
        searching = state.searching;
        searchTime = state.searchTime;
    });

    function updateQuery(q: string) {
        searchStore.setQuery(q);
    }

    function toggleOption(opt: "caseSensitive" | "useRegex" | "wholeWord") {
        searchStore.setOptions({ [opt]: !options[opt] });
    }

    async function performSearch() {
        if (!query.trim()) return;

        searchStore.setSearching(true); // Update store searching state

        const rootHandle = $workspaceStore.root;
        const rootPath = rootHandle?.path;
        console.log(
            "Perform Search triggered. Query:",
            query,
            "Root:",
            rootPath,
        );

        if (!rootPath) {
            console.error(
                "No root path found in workspace store",
                $workspaceStore,
            );
            return;
        }

        searching = true;
        results = [];
        const start = performance.now();

        try {
            const res = await globalSearch({
                query,
                caseSensitive: options.caseSensitive,
                useRegex: options.useRegex,
                wholeWord: options.wholeWord,
                rootPath: rootPath,
                maxFiles: 2000,
            });
            const time = Math.round(performance.now() - start);
            searchStore.setResults(res, time);
        } catch (e) {
            console.error("Search failed", e);
            searchStore.setSearching(false);
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            performSearch();
        }
    }

    function openMatch(file: string, match: any) {
        // Open file at specific position
        // match.start is the absolute char index in the file content?
        // Search engine returns start index relative to line or file?
        // engine.ts: start: match.index (relative to line if line loop, or file?)
        // engine.ts uses `regex.exec(line)`, so match.index is relative to LINE start.

        // To jump to line in Editor, we usually need line number.
        // actions.openFile takes cursorPosition (absolute offset).
        // If we want to support line-based nav, we might need a separate mechanism
        // OR we calculate offset if we had the whole file content (we don't here efficiently).

        // Simple approach: Open file, then user scrolls.
        // Better approach: Pass line number to `openFile` or `setActiveFile` if supported.
        // Looking at state.ts, openFile takes `scrollPosition` and `cursorPosition`.

        // For now, let's just open the file. We can refine 'scroll to line' later as it might require Editor support.

        // Actually, let's try to pass the line number in a "transient" way if possible.
        // But wait, files are read from disk.

        fs.readFile(file).then((content) => {
            // We can calculate offset if we really want, but for now just opening is a good start.
            // actions.openFile will handle opening/switching.
            actions.openFile({
                path: file,
                name: file.split(/[\\/]/).pop() || "file",
                content: content,
                savedContent: content,
                scrollPosition: 0,
                cursorPosition: match.start, // Absolute offset from engine
            });
        });
    }

    import { fs } from "$lib/fs";
</script>

<div class="search-sidebar">
    <div class="search-box">
        <div class="input-row">
            <input
                value={query}
                on:input={(e) => updateQuery(e.currentTarget.value)}
                placeholder="Search"
                on:keydown={handleKeydown}
            />
            <div class="options">
                <button
                    class:active={options.caseSensitive}
                    on:click={() => toggleOption("caseSensitive")}
                    title="Match Case">Aa</button
                >
                <button
                    class:active={options.wholeWord}
                    on:click={() => toggleOption("wholeWord")}
                    title="Match Word">\b</button
                >
                <button
                    class:active={options.useRegex}
                    on:click={() => toggleOption("useRegex")}
                    title="Regex">.*</button
                >
            </div>
        </div>
        <!-- Replace could go here later -->
    </div>

    <div class="results-info">
        {#if searching}
            <span>Searching...</span>
        {:else if results.length > 0}
            <span
                >{results.reduce((acc, r) => acc + r.matches.length, 0)} results
                in {results.length} files ({searchTime}ms)</span
            >
        {/if}
    </div>

    <div class="results-list">
        {#each results as result}
            <div class="file-group">
                <div class="file-header" title={result.filePath}>
                    <span class="icon">📄</span>
                    <span class="filename"
                        >{result.filePath.split(/[\\/]/).pop()}</span
                    >
                    <span class="count">{result.matches.length}</span>
                </div>
                <div class="matches">
                    {#each result.matches as match}
                        <button
                            class="match-item"
                            on:click={() => openMatch(result.filePath, match)}
                        >
                            <span class="line-num">{match.line}:</span>
                            <span class="code">{match.lineContent}</span>
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .search-sidebar {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-size: 13px;
    }
    .search-box {
        padding: 10px;
        border-bottom: 1px solid var(--border);
    }
    .input-row {
        position: relative;
        display: flex;
        align-items: center;
    }
    .input-row input {
        width: 100%;
        background: var(--bg-primary);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 6px 8px;
        padding-right: 70px; /* space for toggles */
        border-radius: 4px;
        outline: none;
    }
    .input-row input:focus {
        border-color: var(--accent);
    }
    .options {
        position: absolute;
        right: 4px;
        display: flex;
    }
    .options button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.75rem;
        padding: 2px 4px;
        border-radius: 3px;
    }
    .options button.active {
        background: rgba(100, 100, 100, 0.2);
        color: var(--accent);
    }

    .results-info {
        padding: 4px 10px;
        color: var(--text-secondary);
        font-size: 0.8rem;
    }

    .results-list {
        flex: 1;
        overflow-y: auto;
        padding: 0 0 10px 0;
    }

    .file-group {
        /* border-bottom: 1px solid var(--border); */
    }
    .file-header {
        padding: 4px 10px;
        background: rgba(128, 128, 128, 0.05);
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: bold;
        color: var(--text-primary);
        cursor: pointer; /* Could toggle collapse */
    }
    .file-header .count {
        margin-left: auto;
        font-weight: normal;
        background: rgba(128, 128, 128, 0.2);
        border-radius: 8px;
        padding: 0 6px;
        font-size: 0.75rem;
    }

    .matches {
        display: flex;
        flex-direction: column;
    }
    .match-item {
        background: none;
        border: none;
        text-align: left;
        padding: 4px 10px 4px 20px;
        cursor: pointer;
        display: flex;
        gap: 8px;
        color: var(--text-secondary);
        font-family: inherit; /* or mono */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .match-item:hover {
        background: rgba(128, 128, 128, 0.1);
        color: var(--text-primary);
    }
    .line-num {
        color: var(--accent);
        min-width: 20px;
        text-align: right;
    }
    .code {
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
