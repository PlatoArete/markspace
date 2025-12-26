<script lang="ts">
    import "../app.css";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { PhysicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
    import ToastContainer from "../components/UI/Toast.svelte";

    const STORAGE_KEY = "markspace-window-state";

    let unlistenResize: () => void;
    let unlistenMove: () => void;
    // Removed close listener to avoid race conditions; relying on debounce

    // Debounce helper
    function debounce(func: Function, wait: number) {
        let timeout: any;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async function saveState() {
        try {
            const appWindow = getCurrentWindow();
            const position = await appWindow.outerPosition();
            const size = await appWindow.outerSize();
            const maximized = await appWindow.isMaximized();

            if (position && size) {
                // Ensure we interact with the specific properties of Physical objects
                const state = {
                    x: position.x,
                    y: position.y,
                    width: size.width,
                    height: size.height,
                    maximized,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                console.log("Saved Window State:", state);
            }
        } catch (e) {
            console.error("Failed to save window state", e);
        }
    }

    // Reduced debounce time for more responsive saving
    const debouncedSave = debounce(saveState, 200);

    onMount(async () => {
        try {
            const appWindow = getCurrentWindow();
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {
                const state = JSON.parse(saved);
                console.log("Restoring Window State:", state);

                if (state.maximized) {
                    await appWindow.maximize();
                } else {
                    // Restore Size FIRST, then Position (some platforms behave better this way)
                    if (
                        Number.isFinite(state.width) &&
                        Number.isFinite(state.height)
                    ) {
                        // Explicitly use PhysicalSize
                        await appWindow.setSize(
                            new PhysicalSize(state.width, state.height),
                        );
                    }
                    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
                        await appWindow.setPosition(
                            new PhysicalPosition(state.x, state.y),
                        );
                    }
                }
            }

            // Listeners
            unlistenResize = await appWindow.onResized(debouncedSave);
            unlistenMove = await appWindow.onMoved(debouncedSave);
            // We trust debounce now.
        } catch (e) {
            console.error("Window state init failed", e);
        }
    });

    onDestroy(() => {
        if (unlistenResize) unlistenResize();
        if (unlistenMove) unlistenMove();
    });
</script>

<slot />
<ToastContainer />
