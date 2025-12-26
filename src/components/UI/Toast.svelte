<script lang="ts">
    import { notifications } from "$lib/utils/notifications";
    import { X } from "lucide-svelte";
    import { flip } from "svelte/animate";
    import { fade, fly } from "svelte/transition";
</script>

<div class="toast-container">
    {#each $notifications as toast (toast.id)}
        <div
            class="toast {toast.type}"
            animate:flip={{ duration: 300 }}
            in:fly={{ y: 20, duration: 300 }}
            out:fade={{ duration: 200 }}
        >
            <span class="message">{toast.message}</span>
            <button
                class="close-btn"
                on:click={() => notifications.remove(toast.id)}
            >
                <X size={14} />
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10001; /* Above modal */
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none; /* Let clicks pass through container */
    }

    .toast {
        pointer-events: auto;
        min-width: 250px;
        max-width: 400px;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-left-width: 4px;
        border-radius: 4px;
        padding: 12px 16px;
        padding-right: 32px; /* Space for close btn */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        color: var(--text-primary);
        font-size: 0.9rem;
        position: relative;
        display: flex;
        align-items: center;
    }

    .message {
        line-height: 1.4;
    }

    .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: opacity 0.2s;
    }

    .close-btn:hover {
        opacity: 1;
    }

    /* Types */
    .toast.info {
        border-left-color: var(--accent);
    }

    .toast.success {
        border-left-color: #10b981;
    }

    .toast.error {
        border-left-color: #ef4444;
    }

    .toast.warning {
        border-left-color: #f59e0b;
    }
</style>
