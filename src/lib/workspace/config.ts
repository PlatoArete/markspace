export interface WorkspaceConfig {
    theme?: ThemeOverrides;
    editor?: EditorOverrides;
    ignore?: string[];
}

export interface ThemeOverrides {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    colorScheme?: 'light' | 'dark' | 'sepia' | 'custom';
    accentColor?: string;
    interfaceFont?: string;
    editorFont?: string;
    customColors?: Record<string, string>;
}

export interface EditorOverrides {
    tabSize?: number;
    wordWrap?: boolean;
    lineNumbers?: boolean;
    focusMode?: boolean;
}

export const DEFAULT_CONFIG: WorkspaceConfig = {
    theme: {
        fontSize: 14,
        lineHeight: 1.5,
        colorScheme: 'dark', // Default to Dark as per request
        accentColor: '#e5a84b', // Amber default
        interfaceFont: 'Inter'
    },
    editor: {
        tabSize: 2,
        wordWrap: true,
        lineNumbers: false
    },
    ignore: ['node_modules', '.git', '.DS_Store']
};

import { fs } from '$lib/fs';

export async function loadConfig(rootPath: string, baseConfig: WorkspaceConfig = DEFAULT_CONFIG): Promise<WorkspaceConfig> {
    const configPath = `${rootPath}/.markspace/config.json`;
    try {
        if (await fs.exists(configPath)) {
            const content = await fs.readFile(configPath);
            const userConfig = JSON.parse(content);
            // Deep merge logic
            return {
                ...baseConfig,
                ...userConfig,
                theme: { ...baseConfig.theme, ...userConfig.theme },
                editor: { ...baseConfig.editor, ...userConfig.editor }
            };
        }
    } catch (e) {
        console.warn('Failed to load config:', e);
    }
    return baseConfig;
}

export async function saveConfig(rootPath: string, config: WorkspaceConfig): Promise<void> {
    const dirPath = `${rootPath}/.markspace`;
    const configPath = `${dirPath}/config.json`;
    try {
        if (!(await fs.exists(dirPath))) {
            await fs.createDirectory(dirPath);
        }
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Failed to save config", e);
    }
}
