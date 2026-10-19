<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Circle from "@lucide/svelte/icons/circle";
  import { i18n } from "$lib/stores/locale.svelte";

  // Aide a la saisie (les memes regles sont appliquees par le serveur, qui fait foi).
  let { password, email = "", phone = "" }: { password: string; email?: string; phone?: string } = $props();
  const en = $derived(i18n.locale === "en");

  const COMMON = new Set(["12345678", "123456789", "password", "password1", "azerty123", "azertyuiop", "qwertyuiop", "motdepasse", "motdepasse1", "trankyl", "trankyl123", "test1234", "abcd1234", "azerty1234", "qwerty123", "welcome123"]);

  let rules = $derived([
    { ok: password.length >= 8, fr: "8 caractères minimum", en: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(password) && /[\d\W_]/.test(password), fr: "Des lettres et un chiffre ou un symbole", en: "Letters and a digit or symbol" },
    { ok: password.length > 0 && !COMMON.has(password.toLowerCase()) && !(email && password.toLowerCase() === email.toLowerCase()), fr: "Pas un mot de passe courant", en: "Not a common password" },
  ]);
  let score = $derived(rules.filter((r) => r.ok).length + (password.length >= 12 ? 1 : 0));
  let level = $derived(password.length === 0 ? 0 : score >= 4 ? 3 : score === 3 ? 2 : 1);
  const labels = [["", ""], ["Faible", "Weak"], ["Correct", "Fair"], ["Solide", "Strong"]];
</script>

{#if password.length > 0}
  <div class="pw" aria-live="polite">
    <div class="bar" aria-hidden="true"><span class="seg" class:on={level >= 1} class:l1={level === 1}></span><span class="seg" class:on={level >= 2} class:l2={level === 2}></span><span class="seg" class:on={level >= 3} class:l3={level === 3}></span></div>
    <p class="lbl">{en ? labels[level][1] : labels[level][0]}</p>
    <ul>
      {#each rules as r}
        <li class:ok={r.ok}>
          {#if r.ok}<Check size={13} aria-hidden="true" />{:else}<Circle size={13} aria-hidden="true" />{/if}
          {en ? r.en : r.fr}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .pw {
    margin-top: 0.5rem;
  }
  .bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }
  .seg {
    height: 4px;
    border-radius: 99px;
    background: #e5e7eb;
  }
  .seg.on.l1 {
    background: #dc2626;
  }
  .seg.on.l2 {
    background: #f59e0b;
  }
  .seg.on.l3,
  .seg.on:not(.l1):not(.l2) {
    background: #0f7d41;
  }
  .lbl {
    margin: 0.25rem 0 0.3rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.78rem;
    color: var(--muted);
  }
  li {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  li.ok {
    color: #0a5a2e;
  }
</style>
