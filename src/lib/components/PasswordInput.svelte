<script lang="ts">
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  // Champ mot de passe : afficher / masquer, alerte "majuscules verrouillees", autofill correct.
  let {
    value = $bindable(""),
    id = "password",
    autocomplete = "current-password",
    placeholder = "",
    required = true,
    minlength,
    maxlength = 72,
    invalid = false,
    describedby,
  }: {
    value: string;
    id?: string;
    autocomplete?: "current-password" | "new-password";
    placeholder?: string;
    required?: boolean;
    minlength?: number;
    maxlength?: number;
    invalid?: boolean;
    describedby?: string;
  } = $props();

  let shown = $state(false);
  let caps = $state(false);

  function onKey(e: KeyboardEvent) {
    caps = e.getModifierState?.("CapsLock") ?? false;
  }
</script>

<div class="pw-wrap">
  <input
    {id}
    type={shown ? "text" : "password"}
    bind:value
    {autocomplete}
    {placeholder}
    {required}
    {minlength}
    {maxlength}
    aria-invalid={invalid || undefined}
    aria-describedby={describedby}
    autocapitalize="none"
    spellcheck="false"
    onkeyup={onKey}
    onkeydown={onKey}
    onblur={() => (caps = false)}
  />
  <button type="button" class="eye" aria-label={shown ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={shown} onclick={() => (shown = !shown)} tabindex="0">
    {#if shown}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
  </button>
</div>
{#if caps}<p class="caps" role="status"><TriangleAlert size={13} /> Les majuscules sont verrouillées.</p>{/if}

<style>
  .pw-wrap {
    position: relative;
    display: flex;
  }
  .pw-wrap input {
    width: 100%;
    padding-right: 2.9rem;
  }
  .eye {
    position: absolute;
    right: 0.35rem;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 2.3rem;
    height: 2.3rem;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--muted, #6b7280);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .eye:hover {
    background: rgba(15, 23, 32, 0.07);
    color: var(--ink);
  }
  .eye:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 1px;
  }
  .caps {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.3rem 0 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: #b45309;
  }
</style>
