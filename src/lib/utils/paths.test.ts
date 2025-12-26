import { describe, it, expect } from 'vitest';
import { validatePath } from './paths';

describe('validatePath', () => {
    it('should return valid paths as is', () => {
        const path = '/home/user/doc.md';
        expect(validatePath(path)).toBe(path);
    });

    it('should throw on empty path', () => {
        expect(() => validatePath('')).toThrow('Invalid path');
    });

    it('should throw on directory traversal attempt', () => {
        expect(() => validatePath('/home/../etc/passwd')).toThrow('Directory traversal detected');
    });

    it('should throw on null bytes', () => {
        expect(() => validatePath('/home/user/doc\0.md')).toThrow('Null byte detected');
    });

    it('should normalize windows slashes for check but return original', () => {
        const path = 'C:\\Users\\User\\Doc.md';
        expect(validatePath(path)).toBe(path);
    });
});
