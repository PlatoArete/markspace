import { isTauri } from '$lib/utils/platform';
import { TauriFS } from './tauri';
import type { WorkspaceFS } from './interface';

let fs: WorkspaceFS;

if (isTauri()) {
    fs = new TauriFS();
} else {
    // Fallback or WebFS implementation
    // For now, we throw or return a dummy if used in web
    fs = new TauriFS(); // Temporary: assume tauri for MVP, or implement WebFS later
}

export { fs };
export type { WorkspaceFS, FolderHandle, Entry, FSEvent, Unsubscribe } from './interface';
