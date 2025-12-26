import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriFS } from './tauri';
import { notifications } from '../utils/notifications';

// Mock Tauri plugins
vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    remove: vi.fn(),
    exists: vi.fn(),
    readDir: vi.fn(),
    watch: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(),
    save: vi.fn(),
}));

// Mock Notifications
vi.mock('../utils/notifications', () => ({
    notifications: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    }
}));

import * as fs from '@tauri-apps/plugin-fs';

describe('TauriFS', () => {
    let tauriFS: TauriFS;

    beforeEach(() => {
        vi.clearAllMocks();
        tauriFS = new TauriFS();
    });

    describe('readFile', () => {
        it('should read file content successfully', async () => {
            const mockContent = '# Hello';
            vi.mocked(fs.readTextFile).mockResolvedValue(mockContent);

            const content = await tauriFS.readFile('/valid/path.md');
            expect(content).toBe(mockContent);
            expect(fs.readTextFile).toHaveBeenCalledWith('/valid/path.md');
        });

        it('should throw and notify on error', async () => {
            const error = new Error('Permission denied');
            vi.mocked(fs.readTextFile).mockRejectedValue(error);

            await expect(tauriFS.readFile('/valid/path.md')).rejects.toThrow('Permission denied');
            expect(notifications.error).toHaveBeenCalledWith(expect.stringContaining('Failed to read file'));
        });

        it('should validate path before reading', async () => {
            await expect(tauriFS.readFile('/traverse/../path')).rejects.toThrow('Directory traversal detected');
            expect(fs.readTextFile).not.toHaveBeenCalled();
        });
    });

    describe('writeFile', () => {
        it('should write file successfully', async () => {
            vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

            await tauriFS.writeFile('/valid/path.md', 'content');
            expect(fs.writeTextFile).toHaveBeenCalledWith('/valid/path.md', 'content');
        });

        it('should throw and notify on error', async () => {
            const error = new Error('Disk full');
            vi.mocked(fs.writeTextFile).mockRejectedValue(error);

            await expect(tauriFS.writeFile('/valid/path.md', 'content')).rejects.toThrow('Disk full');
            expect(notifications.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save file'));
        });
    });
});
