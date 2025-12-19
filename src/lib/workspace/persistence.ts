import type { WorkspaceState } from './state';
import { get } from 'svelte/store';

const STORAGE_KEY = 'markspace_v1_session';

export interface SavedState {
    rootPath: string | null;
    openFilePaths: string[];
    activeFileIndex: number;
    sidebarVisible: boolean;
    sidebarWidth: number;
}

export function saveSession(state: WorkspaceState) {
    const saved: SavedState = {
        rootPath: state.root ? state.root.path : null,
        openFilePaths: state.openFiles.map(f => f.path),
        activeFileIndex: state.activeFileIndex,
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error('Failed to save session', e);
    }
}

export function loadSession(): SavedState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SavedState;
    } catch (e) {
        console.error('Failed to load session', e);
        return null;
    }
}
