import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notifications } from './notifications';
import { get } from 'svelte/store';

describe('notifications', () => {
    beforeEach(() => {
        // Reset store
        // Since it's a writable, we can set it to empty
        // But the exported 'notifications' is a custom object with subscribe, not set.
        // Wait, I implemented it using 'update' inside.
        // I can't easily reset it without exposing a clear method or recreating it.
        // For unit test, I can iterate and remove all?
        const current = get(notifications);
        current.forEach(n => notifications.remove(n.id));
    });

    it('should add a notification', () => {
        notifications.info('Test Info');
        const items = get(notifications);
        expect(items).toHaveLength(1);
        expect(items[0].message).toBe('Test Info');
        expect(items[0].type).toBe('info');
    });

    it('should remove a notification', () => {
        notifications.error('Error Msg');
        const items = get(notifications);
        expect(items).toHaveLength(1);
        const id = items[0].id;

        notifications.remove(id);
        expect(get(notifications)).toHaveLength(0);
    });

    it('should auto-dismiss after duration', async () => {
        vi.useFakeTimers();
        notifications.success('Quick', 100);

        expect(get(notifications)).toHaveLength(1);

        vi.advanceTimersByTime(100);

        expect(get(notifications)).toHaveLength(0);
        vi.useRealTimers();
    });
});
