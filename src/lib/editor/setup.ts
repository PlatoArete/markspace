import { EditorState, type Extension } from '@codemirror/state';
import {
    EditorView,
    keymap,
    type KeyBinding,
    highlightActiveLineGutter,
    highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { search, highlightSelectionMatches } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import type { WorkspaceConfig } from '$lib/workspace/config';
import { editorTheme } from './theme';

export function createEditorState(content: string, config: WorkspaceConfig, extraExtensions: Extension[] = []): EditorState {
    const extensions: Extension[] = [
        ...extraExtensions,
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        markdown(),
        search({ top: true }), // Include search with panel (we'll hide the panel via CSS)
        highlightSelectionMatches(),
        editorTheme, // Our custom theme AFTER search so it can style search elements
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            // ...searchKeymap // Disable default search keymap to prevent default panel
        ]),
    ];

    return EditorState.create({
        doc: content,
        extensions
    });
}
