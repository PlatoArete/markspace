import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, remove, exists, readDir, watch } from '@tauri-apps/plugin-fs';
import type { WorkspaceFS, FolderHandle, Entry, FSEvent, Unsubscribe } from './interface';

export class TauriFS implements WorkspaceFS {
    async openFolder(): Promise<FolderHandle | null> {
        const selected = await open({
            directory: true,
            multiple: false,
            recursive: true
        });

        if (selected === null) {
            return null;
        }

        // Tauri open dialog returns string or string[]
        const path = Array.isArray(selected) ? selected[0] : selected;

        // Simple verification check to ensure path is a string
        if (typeof path !== 'string') return null;

        // Extract name from path (naive implementation, better to use @tauri-apps/api/path if available, but string manipulation covers most cases for now)
        const name = path.split(/[\\/]/).pop() || path;

        return {
            path,
            name
        };
    }

    async readFile(path: string): Promise<string> {
        return await readTextFile(path);
    }

    async writeFile(path: string, content: string): Promise<void> {
        console.log('TauriFS: writeFile', path);
        return await writeTextFile(path, content);
    }

    async writeFileAtomic(path: string, content: string): Promise<void> {
        // For now, simple write. Real atomic write needs temp file dance + rename, which tauri fs plugin supports via rename.
        // MVP: Just write.
        return await writeTextFile(path, content);
    }

    async deletePath(path: string): Promise<void> {
        // recursive true for directories
        // We try to remove. If it fails because it's a dir, we might need options.
        // @tauri-apps/plugin-fs 'remove' takes options now?
        // Checking docs... remove(path, options?: { recursive?: boolean })
        await remove(path, { recursive: true });
    }

    async listDirectory(path: string): Promise<Entry[]> {
        const entries = await readDir(path);
        const separator = path.includes('\\') ? '\\' : '/'; // Simple inference
        const normalize = (p: string) => p.endsWith(separator) ? p : `${p}${separator}`;
        const prefix = normalize(path);

        return entries.map(e => {
            const type: 'file' | 'directory' = e.isDirectory ? 'directory' : 'file';
            return {
                name: e.name,
                path: `${prefix}${e.name}`,
                type
            };
        }).sort((a, b) => {
            // Sort directories first
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    }

    async exists(path: string): Promise<boolean> {
        return await exists(path);
    }

    async watchChanges(path: string, callback: (event: FSEvent) => void): Promise<Unsubscribe> {
        // tauri-plugin-fs watch returns a Promise<() => void> which is the unlisten function
        // verify signature.
        const unlisten = await watch(path, (event) => {
            // event is { type: WatchEvent, ... }
            // We need to map it to our FSEvent.
            // For MVP, just notify 'change'.
            // Actual event structure depends on plugin version.
            // Let's assume generic modification for now.
            // TODO: Strict mapping
            const type = 'modify'; // simplified
            /*
            if (typeof event.type === 'object' && 'modify' in event.type) type = 'modify';
            else if (typeof event.type === 'object' && 'remove' in event.type) type = 'delete';
            */
            callback({
                type,
                path: path // strictly it should be the changed file path, but the watcher might return that in payload
            });
        }, { recursive: true });

        return unlisten;
    }
}
