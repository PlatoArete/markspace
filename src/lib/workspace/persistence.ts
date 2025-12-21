import type { WorkspaceState } from './state';
import type { ThemeOverrides } from './config';
import { get } from 'svelte/store';

const STORAGE_KEY = 'markspace_v1_session';

export interface SavedState {
    rootPath: string | null;
    openFiles: {
        path: string;
        name: string;
        content: string;
        savedContent: string;
        scrollPosition: number;
        cursorPosition: number;
    }[];
    activeFileIndex: number;
    sidebarVisible: boolean;
    sidebarWidth: number;
    quickLinks?: string[]; // Optional for backward compat
    recentWorkspaces?: string[]; // Optional for backward compat
    themePreferences?: ThemeOverrides; // Persist user theme globally
}

export function saveSession(state: WorkspaceState) {
    const saved: SavedState = {
        rootPath: state.root ? state.root.path : null,
        openFiles: state.openFiles,
        activeFileIndex: state.activeFileIndex,
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        quickLinks: state.quickLinks,
        recentWorkspaces: state.recentWorkspaces,
        themePreferences: state.config.theme
    };
    // ...
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
