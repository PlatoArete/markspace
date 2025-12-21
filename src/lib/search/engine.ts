import { fs } from "$lib/fs";

export interface SearchResult {
    filePath: string;
    matches: {
        line: number;
        lineContent: string;
        start: number;
        end: number;
    }[];
}

export interface SearchOptions {
    query: string;
    caseSensitive: boolean;
    useRegex: boolean;
    wholeWord: boolean;
    rootPath: string;
    maxFiles?: number;
}

export async function globalSearch(options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    if (!options.rootPath || !options.query) return results;

    let fileCount = 0;
    const maxFiles = options.maxFiles || 2000; // Increased limit

    // Recursive directory walker
    async function walk(dir: string) {
        if (fileCount >= maxFiles) return;

        try {
            // Use abstract API listDirectory, not raw readDir
            const entries = await fs.listDirectory(dir);
            for (const entry of entries) {
                if (fileCount >= maxFiles) break;

                // entry from listDirectory already has full path or name?
                // Interface says: { name, path, type }
                // So entry.path is the full path.
                const fullPath = entry.path;

                if (entry.type === 'directory') {
                    if (entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== '.markspace' && entry.name !== 'dist' && entry.name !== 'target') {
                        await walk(fullPath);
                    }
                } else {
                    // Check extension
                    if (/\.(md|txt|js|ts|svelte|css|html|json|toml|rs|yml|yaml)$/.test(entry.name)) {
                        fileCount++;
                        await searchInFile(fullPath, options, results);
                    }
                }
            }
        } catch (e) {
            console.error("Search walk error", e);
        }
    }

    await walk(options.rootPath);
    return results;
}

async function searchInFile(path: string, options: SearchOptions, results: SearchResult[]) {
    try {
        const content = await fs.readFile(path);
        const lines = content.split('\n');
        const fileMatches: SearchResult['matches'] = [];

        let regex: RegExp;
        try {
            let pattern = options.query;
            let flags = options.caseSensitive ? 'g' : 'gi';

            if (!options.useRegex) {
                // Escape regex characters
                pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            if (options.wholeWord) {
                pattern = `\\b${pattern}\\b`;
            }

            regex = new RegExp(pattern, flags);
        } catch (e) {
            // Invalid regex
            return;
        }

        let currentFileOffset = 0; // Track absolute character position

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Add newline character length to offset for previous lines (except first)
            // Actually simpler: update offset AFTER processing line, adding line.length + 1 (for \n)

            let match;
            // Reset lastIndex for each line if using global
            regex.lastIndex = 0;

            // Note: simple regex test on line might be faster, but we need indices
            // If we use 'g', exec loop

            while ((match = regex.exec(line)) !== null) {
                fileMatches.push({
                    line: i + 1, // 1-indexed
                    lineContent: line.trim(),
                    start: currentFileOffset + match.index, // Absolute start
                    end: currentFileOffset + match.index + match[0].length // Absolute end
                });

                // Prevent infinite loop on zero-length matches (regex edge case)
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
            // Advance offset by line length plus newline character
            // Note: split('\n') removes \n. Assuming standard unix line endings for calculation.
            // If file has CRLF, this might be off by count of lines.
            // For now assume \n (1 char). To be robust we'd need to detect EOL or scan raw string.
            currentFileOffset += line.length + 1;
        }

        if (fileMatches.length > 0) {
            results.push({
                filePath: path,
                matches: fileMatches
            });
        }

    } catch (e) {
        // Ignore read errors
    }
}
