import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, remove, exists, readDir, watch, rename, mkdir } from '@tauri-apps/plugin-fs';
import type { WorkspaceFS, FolderHandle, Entry, FSEvent, Unsubscribe } from './interface';
import { notifications } from '../utils/notifications';
import { validatePath } from '../utils/paths';


export class TauriFS implements WorkspaceFS {
    async openFolder(): Promise<FolderHandle | null> {
        try {
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
        } catch (error) {
            console.error('Failed to open folder:', error);
            notifications.error('Failed to open folder. Please try again.');
            return null;
        }
    }

    async saveFile(defaultName?: string): Promise<string | null> {
        try {
            const path = await save({
                defaultPath: defaultName,
                filters: [{
                    name: 'Markdown',
                    extensions: ['md', 'markdown']
                }, {
                    name: 'All Files',
                    extensions: ['*']
                }]
            });
            return path;
        } catch (error) {
            console.error('Failed to save file dialog:', error);
            notifications.error('Failed to open save dialog.');
            return null;
        }
    }

    async readFile(path: string): Promise<string> {
        try {
            validatePath(path);
            return await readTextFile(path);
        } catch (error) {
            console.error('Failed to read file:', path, error);
            notifications.error(`Failed to read file: ${path}`);
            throw error; // Re-throw to let caller handle if needed (though we notified)
        }
    }

    async writeFile(path: string, content: string): Promise<void> {
        try {
            validatePath(path);
            console.log('TauriFS: writeFile', path);
            return await writeTextFile(path, content);
        } catch (error) {
            console.error('Failed to write file:', path, error);
            notifications.error(`Failed to save file: ${path}`);
            throw error;
        }
    }

    async writeFileAtomic(path: string, content: string): Promise<void> {
        // For now, simple write. Real atomic write needs temp file dance + rename, which tauri fs plugin supports via rename.
        // MVP: Just write.
        validatePath(path);
        return await writeTextFile(path, content);
    }

    async deletePath(path: string): Promise<void> {
        // recursive true for directories
        // We try to remove. If it fails because it's a dir, we might need options.
        // @tauri-apps/plugin-fs 'remove' takes options now?
        // Checking docs... remove(path, options?: { recursive?: boolean })
        try {
            validatePath(path);
            await remove(path, { recursive: true });
        } catch (error) {
            console.error('Failed to delete path:', path, error);
            notifications.error(`Failed to delete: ${path}`);
            throw error;
        }
    }

    async listDirectory(path: string): Promise<Entry[]> {
        try {
            validatePath(path);
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
        } catch (error) {
            console.error('Failed to list directory:', path, error);
            notifications.error(`Failed to open directory: ${path}`);
            return []; // Return empty list rather than crash? Or throw? Defaulting to safe empty.
        }
    }

    async exists(path: string): Promise<boolean> {
        try {
            validatePath(path);
            return await exists(path);
        } catch (error) {
            // Exists check might fail on permission errors
            console.error('Failed to check existence:', path, error);
            return false;
        }
    }

    async watchChanges(path: string, callback: (event: FSEvent) => void): Promise<Unsubscribe> {
        // tauri-plugin-fs watch returns a Promise<() => void> which is the unlisten function
        // verify signature.
        try {
            validatePath(path);
            const unlisten = await watch(path, (event) => {
                // event structure varies by platform/version. 
                // Typically: { type: 'create' | 'modify' | ... , paths: [] } or { kind: ..., path: ... }
                // We implement a robust mapper.

                let type: 'create' | 'modify' | 'delete' = 'modify';

                // Inspect event to determine type
                // @ts-ignore
                const rawType = event.type || event.kind;

                if (rawType) {
                    // Check if object (Rust enum variant) or string
                    const typeStr = (typeof rawType === 'string' ? rawType : Object.keys(rawType)[0] || '').toLowerCase();

                    if (typeStr.includes('create')) type = 'create';
                    else if (typeStr.includes('remove') || typeStr.includes('delete')) type = 'delete';
                    else if (typeStr.includes('modify') || typeStr.includes('write') || typeStr.includes('any')) type = 'modify';
                    else return; // Ignore 'access', 'other', etc. to reduce noise
                }

                // Extract path if possible, else assume it's relevant to the watched path
                // @ts-ignore
                const eventPath = (event.paths && event.paths[0]) || event.path || path;

                callback({
                    type,
                    path: eventPath
                });
            }, { recursive: true });

            return unlisten;
        } catch (error) {
            console.error('Failed to watch path:', path, error);
            // Non-critical, maybe just warn
            notifications.warning(`Failed to watch for changes: ${path}`);
            return () => { }; // Return no-op unlisten
        }
    }

    async renamePath(oldPath: string, newPath: string): Promise<void> {
        try {
            validatePath(oldPath);
            validatePath(newPath);
            await rename(oldPath, newPath);
        } catch (error) {
            console.error('Failed to rename:', oldPath, error);
            notifications.error(`Failed to rename file.`);
            throw error;
        }
    }

    async createDirectory(path: string): Promise<void> {
        try {
            validatePath(path);
            await mkdir(path);
        } catch (error) {
            console.error('Failed to create directory:', path, error);
            notifications.error(`Failed to create directory: ${path}`);
            throw error;
        }
    }

    async getDocumentsDir(): Promise<string> {
        // Dynamic import to avoid issues if module resolution is tricky, or just top level if standard
        // But the user might not have installed @tauri-apps/api if it wasn't there.
        // Assuming it's available as it's a tauri app.
        const { documentDir } = await import('@tauri-apps/api/path');
        return await documentDir();
    }
}
