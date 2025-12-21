import { writable } from 'svelte/store';
import type { SearchResult } from './engine';

export interface SearchState {
    query: string;
    results: SearchResult[];
    searching: boolean;
    searchTime: number;
    options: {
        caseSensitive: boolean;
        useRegex: boolean;
        wholeWord: boolean;
    };
}

const initialState: SearchState = {
    query: "",
    results: [],
    searching: false,
    searchTime: 0,
    options: {
        caseSensitive: false,
        useRegex: false,
        wholeWord: false
    }
};

function createSearchStore() {
    const { subscribe, set, update } = writable<SearchState>(initialState);

    return {
        subscribe,
        setQuery: (query: string) => update(s => ({ ...s, query })),
        setOptions: (options: Partial<SearchState['options']>) => update(s => ({
            ...s,
            options: { ...s.options, ...options }
        })),
        setResults: (results: SearchResult[], time: number) => update(s => ({
            ...s,
            results,
            searchTime: time,
            searching: false
        })),
        setSearching: (searching: boolean) => update(s => ({ ...s, searching })),
        reset: () => set(initialState)
    };
}

export const searchStore = createSearchStore();
