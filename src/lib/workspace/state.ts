import { createStore } from 'zustand/vanilla';
import { toSvelteStore } from '$lib/utils/store-adapter';
// Actually 'zustand' in Svelte: usually we use the vanilla store and wrap it in a readable/writable store, or use 'svelte-zustand' if available. 
// But a simple vanilla store works fine with a small wrapper.
// Let's use vanilla create and export it.

import type { FolderHandle } from '$lib/fs/interface';
import type { WorkspaceConfig } from './config';
import { DEFAULT_CONFIG } from './config';

export interface OpenFile {
    path: string;
    name: string; // Cached name for tab
    content: string; // Current content in editor (might be dirty)
    savedContent: string; // Last saved content (to detect dirty)
    scrollPosition: number;
    cursorPosition: number;
}

export interface WorkspaceState {
    // Config
    root: FolderHandle | null;
    config: WorkspaceConfig;

    // File State
    openFiles: OpenFile[]; // Ordered list of tabs
    activeFileIndex: number;

    // UI State
    sidebarVisible: boolean;
    sidebarWidth: number;

    // Actions
    setRoot: (root: FolderHandle) => void;
    setConfig: (config: WorkspaceConfig) => void;
    openFile: (file: OpenFile) => void;
    closeFile: (index: number) => void;
    setActiveFile: (index: number) => void;
    updateFileContent: (index: number, content: string) => void;
    setSidebarVisible: (visible: boolean) => void;
    setSidebarWidth: (width: number) => void;
    markFileSaved: (index: number) => void;
    renameOpenFile: (oldPath: string, newPath: string, newName: string) => void;
    closeFileByPath: (path: string) => void;
    closeAllFiles: () => void;
    closeOtherFiles: (keepIndex: number) => void;
    moveOpenFiles: (fromIndex: number, toIndex: number) => void;
}

const startStore = createStore<WorkspaceState>((set) => ({
    root: null,
    config: DEFAULT_CONFIG,

    openFiles: [],
    activeFileIndex: -1,

    sidebarVisible: true,
    sidebarWidth: 250,

    setRoot: (root) => set({ root }),
    setConfig: (config) => set({ config }),

    openFile: (file) => set((state) => {
        // Check if already open
        const existingIndex = state.openFiles.findIndex(f => f.path === file.path);
        if (existingIndex !== -1) {
            return { activeFileIndex: existingIndex };
        }
        return {
            openFiles: [...state.openFiles, file],
            activeFileIndex: state.openFiles.length // Point to new last item
        };
    }),

    closeFile: (index) => set((state) => {
        const newFiles = [...state.openFiles];
        newFiles.splice(index, 1);

        let newIndex = state.activeFileIndex;
        if (newFiles.length === 0) {
            newIndex = -1;
        } else if (index <= state.activeFileIndex) {
            // If we closed the active tab or one before it, shift index left
            newIndex = Math.max(0, state.activeFileIndex - 1);
        }

        return {
            openFiles: newFiles,
            activeFileIndex: newIndex
        };
    }),

    setActiveFile: (index) => set({ activeFileIndex: index }),

    updateFileContent: (index, content) => set((state) => {
        const files = [...state.openFiles];
        if (files[index]) {
            files[index] = { ...files[index], content };
        }
        return { openFiles: files };
    }),

    setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

    setSidebarWidth: (width) => set({ sidebarWidth: width }),

    markFileSaved: (index) => set((state) => {
        const files = [...state.openFiles];
        if (files[index]) {
            files[index] = { ...files[index], savedContent: files[index].content };
        }
        return { openFiles: files };
    }),

    renameOpenFile: (oldPath: string, newPath: string, newName: string) => set((state) => {
        const files = state.openFiles.map(f => {
            if (f.path === oldPath) {
                return { ...f, path: newPath, name: newName };
            }
            return f;
        });
        return { openFiles: files };
    }),

    closeFileByPath: (path: string) => set((state) => {
        const index = state.openFiles.findIndex(f => f.path === path);
        if (index !== -1) {
            // Re-use logic from closeFile via self-call? 
            // Zustand setters are synchronous. We can just copy the logic or call a helper if extracted.
            // Copying logic for simplicity and to avoid 'this' binding issues in simple object.
            const newFiles = [...state.openFiles];
            newFiles.splice(index, 1);

            let newIndex = state.activeFileIndex;
            if (newFiles.length === 0) {
                newIndex = -1;
            } else if (index <= state.activeFileIndex) {
                newIndex = Math.max(0, state.activeFileIndex - 1);
            }
            return { openFiles: newFiles, activeFileIndex: newIndex };
        }
        return {};
    }),

    closeAllFiles: () => set({ openFiles: [], activeFileIndex: -1 }),

    closeOtherFiles: (keepIndex: number) => set((state) => {
        const fileToKeep = state.openFiles[keepIndex];
        if (!fileToKeep) return { openFiles: state.openFiles }; // Return original if invalid
        return { openFiles: [fileToKeep], activeFileIndex: 0 };
    }),

    moveOpenFiles: (fromIndex: number, toIndex: number) => set((state) => {
        if (fromIndex === toIndex) return {};
        const newFiles = [...state.openFiles];
        const [movedFile] = newFiles.splice(fromIndex, 1);
        newFiles.splice(toIndex, 0, movedFile);

        // Update active index if needed
        let newActiveIndex = state.activeFileIndex;
        if (state.activeFileIndex === fromIndex) {
            newActiveIndex = toIndex;
        } else if (state.activeFileIndex > fromIndex && state.activeFileIndex <= toIndex) {
            newActiveIndex--;
        } else if (state.activeFileIndex < fromIndex && state.activeFileIndex >= toIndex) {
            newActiveIndex++;
        }

        return { openFiles: newFiles, activeFileIndex: newActiveIndex };
    })
}));

export const workspaceStore = toSvelteStore(startStore);
export const actions = startStore.getState(); // Export actions directly for convenience if needed, OR just expose the raw store
export const rawStore = startStore;
