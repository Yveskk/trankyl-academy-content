<script lang="ts">
  import type { Channel } from "$lib/api/auth";
  import { i18n } from "$lib/stores/locale.svelte";

  // Choix du canal de reception du code (WhatsApp / SMS / email).
  let { value = $bindable<Channel>("whatsapp"), channels = ["whatsapp", "sms", "email"], label = "" }: { value?: Channel; channels?: Channel[]; label?: string } = $props();
  const en = $derived(i18n.locale === "en");
  const NAMES: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };
</script>

<fieldset class="cc">
  <legend>{label || (en ? "Receive my code by" : "Recevoir mon code par")}</legend>
  <div class="row">
    {#each channels as c}
      <label class="chip" class:on={value === c}>
        <input type="radio" name="channel" value={c} bind:group={value} />
        <span>{NAMES[c]}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .cc {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .chip {
    color: var(--ink);
    position: relative;
    border: 1.5px solid var(--border);
    border-radius: 999px;
    padding: 0.45rem 1rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    background: #fff;
    transition: border-color 0.15s, background 0.15s;
  }
  .chip input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .chip.on {
    border-color: var(--green);
    background: var(--green-soft);
    color: var(--green-deep);
  }
  .chip:has(input:focus-visible) {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }
</style>
