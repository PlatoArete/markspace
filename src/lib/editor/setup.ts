import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, search } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import type { WorkspaceConfig } from '$lib/workspace/config';
import { baseTheme } from './theme';

export function createEditorState(content: string, config: WorkspaceConfig, extraExtensions: Extension[] = []): EditorState {
    const extensions: Extension[] = [
        ...extraExtensions,
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        markdown(),
        history(),
        markdown(),
        search({ top: true, caseSensitive: false, literal: false }), // Ensure search state is enabled
        baseTheme, // Our custom theme
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            // ...searchKeymap // Disable default search keymap to prevent default panel
        ]),
        config.theme?.colorScheme === 'dark' ? oneDark : [],
        EditorView.lineWrapping
    ];

    return EditorState.create({
        doc: content,
        extensions
    });
}
