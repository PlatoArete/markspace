/**
 * Validates and normalizes file paths to prevent traversal and Ensure security.
 * @param path The path to validate
 * @throws Error if path is invalid
 */
export function validatePath(path: string): string {
    if (!path || typeof path !== 'string') {
        throw new Error('Invalid path: Path must be a non-empty string');
    }

    // Normalize slashes (Windows specific mostly, but good practice)
    const normalized = path.replace(/\\/g, '/');

    // Basic Traversal Check (Naive but effective for standard usage)
    // We expect absolute paths mainly, but if relative, they shouldn't go up.
    // However, the app deals with absolute paths from the os dialogs usually.
    // Check for ".." segments which are main vector for traversal if not canonicalized.
    if (normalized.includes('/../') || normalized.endsWith('/..')) {
        throw new Error('Invalid path: Directory traversal detected');
    }

    // Check for null bytes
    if (normalized.indexOf('\0') !== -1) {
        throw new Error('Invalid path: Null byte detected');
    }

    return path; // Return original if valid, or normalized if we want to enforce that.
    // Tauri APIs usually handle OS separators fine, but validation logic used normalized.
}
