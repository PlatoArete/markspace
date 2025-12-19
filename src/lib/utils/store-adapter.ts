// Helper to make Zustand vanilla store compatible with Svelte store contract
import type { StoreApi } from 'zustand/vanilla';
import { readable } from 'svelte/store';

import type { Readable } from 'svelte/store';

export function toSvelteStore<T>(zustandStore: StoreApi<T>): Readable<T> {
    return {
        subscribe: (run: (value: T) => void) => {
            run(zustandStore.getState());
            return zustandStore.subscribe((state) => run(state));
        }
    };
}
