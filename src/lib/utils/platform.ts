export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function isMac(): boolean {
    return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
}

export function isWindows(): boolean {
    return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win');
}
