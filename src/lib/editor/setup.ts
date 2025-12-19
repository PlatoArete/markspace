import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import type { WorkspaceConfig } from '$lib/workspace/config';

export function createEditorState(content: string, config: WorkspaceConfig, extraExtensions: Extension[] = []): EditorState {
    const extensions: Extension[] = [
        ...extraExtensions,
        // Basics
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),

        // Language
        markdown(),

        // Keymaps
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            // Add more here (save, etc)
        ]),

        // Theme (basic toggle for MVP, using oneDark if we needed a dark theme, but we should respect config)
        // For MVP just standard light or oneDark based on config?
        // Let's rely on CSS variables for main UI, but CodeMirror needs explicit theme extensions for syntax highlighting.
        // We'll leave it default (light) for now or basic oneDark if 'dark'.
        config.theme?.colorScheme === 'dark' ? oneDark : [],

        // Editor config
        EditorView.lineWrapping, // default to wrap
        EditorView.lineWrapping, // default to wrap
    ];

    return EditorState.create({
        doc: content,
        extensions
    });
}
