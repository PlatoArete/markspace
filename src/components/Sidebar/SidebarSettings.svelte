<script lang="ts">
    import { workspaceStore, actions } from "$lib/workspace/state";
    import { saveConfig, type WorkspaceConfig } from "$lib/workspace/config";

    // Options
    const accentColors = [
        { name: "Coral", value: "#e06c75" },
        { name: "Amber", value: "#e5a84b" }, // Default
        { name: "Teal", value: "#56b6c2" },
        { name: "Violet", value: "#c678dd" },
        { name: "Sage", value: "#98c379" },
        { name: "Rose", value: "#e89bb4" },
    ];

    const fonts = [
        "Inter",
        "Roboto",
        "Open Sans",
        "Segoe UI",
        "Helvetica Neue",
        "Courier New", // Monospace option
    ];

    let currentConfig: WorkspaceConfig;

    // Subscribe to store config
    workspaceStore.subscribe((state) => {
        currentConfig = state.config;
    });

    async function updateTheme(updates: any) {
        if (!currentConfig) return;

        const newConfig = {
            ...currentConfig,
            theme: {
                ...currentConfig.theme,
                ...updates,
            },
        };

        // Update state immediately for live feedback
        actions.setConfig(newConfig);

        // Persist
        if ($workspaceStore.root) {
            await saveConfig($workspaceStore.root.path, newConfig);
        }
    }

    async function updateEditor(updates: any) {
        if (!currentConfig) return;

        const newConfig = {
            ...currentConfig,
            editor: {
                ...currentConfig.editor,
                ...updates,
            },
        };

        actions.setConfig(newConfig);
        if ($workspaceStore.root) {
            await saveConfig($workspaceStore.root.path, newConfig);
        }
    }

    // ... updateTheme ...
</script>

<div class="settings-container">
    <h3>Appearance</h3>

    <div class="section">
        <span class="label">Accent Color</span>
        <div class="color-grid">
            {#each accentColors as color}
                <button
                    class="color-swatch"
                    class:active={currentConfig?.theme?.accentColor ===
                        color.value}
                    style="background-color: {color.value}"
                    on:click={() => updateTheme({ accentColor: color.value })}
                    title={color.name}
                    aria-label={color.name}
                >
                    {#if currentConfig?.theme?.accentColor === color.value}
                        <div class="check"></div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <div class="section">
        <label>
            Interface Font
            <select
                value={currentConfig?.theme?.interfaceFont || "Inter"}
                on:change={(e) =>
                    updateTheme({ interfaceFont: e.currentTarget.value })}
            >
                {#each fonts as font}
                    <option value={font}>{font}</option>
                {/each}
            </select>
        </label>
    </div>

    <div class="section">
        <label>
            Editor Font
            <select
                value={currentConfig?.theme?.editorFont || "JetBrains Mono"}
                on:change={(e) =>
                    updateTheme({ editorFont: e.currentTarget.value })}
            >
                <option value="JetBrains Mono">JetBrains Mono (Default)</option>
                <option value="Fira Code">Fira Code</option>
                <option value="Consolas">Consolas</option>
                <option value="Courier New">Courier New</option>
                {#each fonts as font}
                    <option value={font}>{font}</option>
                {/each}
            </select>
        </label>
    </div>

    <div class="section">
        <label>
            Editor Font Size: {currentConfig?.theme?.fontSize}px
            <input
                type="range"
                min="10"
                max="32"
                step="1"
                value={currentConfig?.theme?.fontSize || 14}
                on:input={(e) =>
                    updateTheme({ fontSize: parseInt(e.currentTarget.value) })}
            />
        </label>
    </div>

    <div class="section">
        <label>
            Theme
            <select
                value={currentConfig?.theme?.colorScheme || "light"}
                on:change={(e) =>
                    updateTheme({ colorScheme: e.currentTarget.value })}
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="dark-light"
                    >Hybrid (Dark UI, Light Editor)</option
                >
            </select>
        </label>
    </div>

    <div class="section">
        <h3>Editor Settings</h3>
        <label class="checkbox-label">
            <input
                type="checkbox"
                checked={currentConfig?.editor?.lineNumbers !== false}
                on:change={(e) => {
                    // Updating nested editor config needs a different helper or deeper merge in updateTheme
                    // Let's modify updateTheme to support root config merges?
                    // Or add updateEditor helper.
                    // For now, I'll assume I need to implement updateEditor.
                    updateEditor({ lineNumbers: e.currentTarget.checked });
                }}
            />
            Show Line Numbers
        </label>
        <label class="checkbox-label">
            <input
                type="checkbox"
                checked={currentConfig?.editor?.wordWrap !== false}
                on:change={(e) =>
                    updateEditor({ wordWrap: e.currentTarget.checked })}
            />
            Word Wrap
        </label>
    </div>
</div>

<style>
    .settings-container {
        padding: 16px;
        color: var(--text-primary);
    }

    h3 {
        margin-top: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-secondary);
        margin-bottom: 16px;
    }

    .section {
        margin-bottom: 24px;
    }

    label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.85rem;
        font-weight: 500;
    }

    .color-grid {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .color-swatch {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        position: relative;
        padding: 0;
    }

    .color-swatch.active {
        border-color: var(--text-primary);
    }

    .check {
        position: absolute;
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    select {
        width: 100%;
        padding: 6px;
        border-radius: 4px;
        border: 1px solid var(--border);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: inherit;
    }

    input[type="range"],
    input[type="checkbox"] {
        accent-color: var(--accent);
        cursor: pointer;
    }
</style>
