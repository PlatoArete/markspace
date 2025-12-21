<script lang="ts">
    import { onMount, tick } from "svelte";
    import { createEventDispatcher } from "svelte";

    export let visible = false;
    export let title = "";
    export let message = "";
    export let showInput = false;
    export let inputValue = "";
    export let placeholder = "";
    export let primaryAction = "Confirm";
    export let secondaryAction = "Cancel";
    export let extraAction = ""; // e.g. "Discard" or "Save"
    export let extraActionDanger = false;
    export let danger = false;

    const dispatch = createEventDispatcher();
    let inputElement: HTMLInputElement;

    function handleClose() {
        dispatch("cancel");
        visible = false;
    }

    function handleConfirm() {
        if (showInput && !inputValue.trim()) return; // Validation: strict no empty?
        dispatch("confirm", inputValue);
        visible = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            handleClose();
        }
    }

    // Auto-focus input when opened
    $: if (visible && showInput) {
        (async () => {
            await tick();
            if (inputElement) {
                inputElement.focus();
                inputElement.select();
            }
        })();
    }
    function onWindowKeydown(e: KeyboardEvent) {
        if (visible && e.key === "Escape") {
            handleClose();
        }
    }
</script>

<svelte:window on:keydown={onWindowKeydown} />

{#if visible}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="backdrop" on:click|self={handleClose}>
        <div class="modal" role="dialog" aria-modal="true">
            <div class="header">
                <h3>{title}</h3>
            </div>

            <div class="body">
                {#if message}
                    <p>{message}</p>
                {/if}

                {#if showInput}
                    <input
                        bind:this={inputElement}
                        bind:value={inputValue}
                        {placeholder}
                        on:keydown={handleKeydown}
                    />
                {/if}
            </div>

            <div class="footer">
                <button class="secondary" on:click={handleClose}
                    >{secondaryAction}</button
                >
                {#if extraAction}
                    <button
                        class="secondary"
                        class:danger={extraActionDanger}
                        on:click={() => {
                            dispatch("extra");
                            visible = false;
                        }}
                    >
                        {extraAction}
                    </button>
                {/if}
                <button
                    class="primary"
                    class:danger
                    on:click={handleConfirm}
                    disabled={showInput && !inputValue.trim()}
                >
                    {primaryAction}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--bg-primary);
    }

    .header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        color: var(--text-primary);
    }

    .body input {
        padding: 8px 12px;
        border: 1px solid var(--border);
        background: var(--bg-primary);
        color: var(--text-primary);
        border-radius: 4px;
        font-size: 0.9rem;
        outline: none;
    }

    .body input:focus {
        border-color: var(--accent);
    }

    .footer {
        padding: 12px 20px;
        border-top: 1px solid var(--border);
        background: var(--bg-primary);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    button {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
    }

    button.secondary {
        background: transparent;
        border-color: var(--border);
        color: var(--text-secondary);
    }

    button.secondary:hover {
        background: rgba(128, 128, 128, 0.1);
        color: var(--text-primary);
    }

    button.primary {
        background: var(--accent);
        color: white;
    }

    button.primary:hover {
        opacity: 0.9;
    }

    button.danger {
        background: #ff4d4f;
        color: white;
    }
</style>
