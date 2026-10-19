<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";

  // Mise en page commune des pages d'authentification : plein ecran, panneau de marque anime a gauche,
  // formulaire a droite. Chaque page ne fournit que ses textes et son formulaire.
  type Value = { text: string; icon?: Component<{ size?: number }>; img?: string };
  let {
    title,
    text,
    variant = "gold",
    values = [],
    children,
  }: {
    title: string;
    text: string;
    variant?: "gold" | "green" | "gray" | "leaf";
    values?: Value[];
    children: Snippet;
  } = $props();
</script>

<div class="auth-split {variant}">
  <aside class="auth-brand-panel" aria-label="Trankyl Academy">
    <span class="orb o1" aria-hidden="true"></span>
    <span class="orb o2" aria-hidden="true"></span>
    <span class="orb o3" aria-hidden="true"></span>
    <span class="dots" aria-hidden="true"></span>
    <span class="ring" aria-hidden="true"></span>

    <img class="auth-brand-logo" src={variant === "green" || variant === "leaf" ? "/logo-wh.svg" : "/academiLogo.png"} alt="Trankyl Academy" />

    <div class="auth-brand-body">
      <h2 class="auth-brand-title">{title}</h2>
      <p class="auth-brand-text">{text}</p>
      {#if values.length > 0}
        <ul class="auth-value-list">
          {#each values as v, i}
            {@const Icon = v.icon}
            <li class="auth-value-item" style="--i:{i}">
              <span class="value-icon">
                {#if v.img}<img src={v.img} alt="" class="value-icon-logo" />{:else if Icon}<Icon size={18} />{/if}
              </span>
              <span>{v.text}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <p class="auth-brand-foot"><ShieldCheck size={15} aria-hidden="true" /> Connexion chiffrée · Vos données restent protégées</p>
  </aside>

  <section class="auth-form-panel">
    <div class="auth-form-inner">{@render children()}</div>
  </section>
</div>
