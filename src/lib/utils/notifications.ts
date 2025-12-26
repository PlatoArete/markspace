import { writable } from 'svelte/store';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

function createNotificationStore() {
    const { subscribe, update } = writable<Notification[]>([]);

    const add = (type: NotificationType, message: string, duration = 3000) => {
        const id = crypto.randomUUID();
        const notification: Notification = { id, type, message, duration };

        update((notifications) => [...notifications, notification]);

        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    };

    const remove = (id: string) => {
        update((notifications) => notifications.filter((n) => n.id !== id));
    };

    return {
        subscribe,
        add,
        remove,
        info: (msg: string, duration?: number) => add('info', msg, duration),
        success: (msg: string, duration?: number) => add('success', msg, duration),
        error: (msg: string, duration?: number) => add('error', msg, duration),
        warning: (msg: string, duration?: number) => add('warning', msg, duration),
    };
}

export const notifications = createNotificationStore();
