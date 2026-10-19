<script lang="ts">
  import type { HomeSection } from "$lib/api/home";
  import { AVATAR_TONES, formatRating, missionsLabel } from "./format";
  import { i18n } from "$lib/stores/locale.svelte";

  let { section }: { section: HomeSection } = $props();
  let providers = $derived(section.data?.providers ?? []);
  // Image de prestataire introuvable : on retombe sur les initiales.
  let broken = $state<Record<number, boolean>>({});
</script>

{#if providers.length > 0}
  <section class="ac-cream">
    <div class="ac-wrap">
      <div class="ac-head">
        <h2>{section.title}</h2>
        {#if section.payload.link_label}<a class="ac-link" href={section.payload.link_url || "/prestataires"}>{section.payload.link_label}</a>{/if}
      </div>
      <div class="ac-top">
        {#each providers as p, i}
          <a class="ac-top-card" href={p.profile_url}>
            {#if p.image_url && !broken[p.vendor_id]}
              <img class="ac-photo ac-photo-img" src={p.image_url} alt={p.name} loading="lazy" onerror={() => (broken[p.vendor_id] = true)} />
            {:else}
              <div class="ac-photo">{p.initials}</div>
            {/if}
            <div class="ac-top-row">
              <span class="ac-avatar ac-tone-{AVATAR_TONES[i % AVATAR_TONES.length]}">{p.initials}</span>
              <div class="ac-pro-id">
                <strong>{p.name}</strong>
                <span>{p.job ?? p.city ?? ""}</span>
              </div>
              {#if p.rating}<span class="ac-rating">★ {formatRating(p.rating)}</span>{/if}
            </div>
            <div class="ac-tags">
              {#if p.badges.verified}<span class="ac-tag ac-tag-green">✓ {i18n.locale === "en" ? "Verified" : "Vérifié"}</span>{/if}
              {#if p.badges.certified}<span class="ac-tag ac-tag-gold">{i18n.locale === "en" ? "Certified" : "Certifié"}</span>{/if}
              {#if p.badges.insured}<span class="ac-tag ac-tag-grey">{i18n.locale === "en" ? "Insured" : "Assuré"}</span>{/if}
              {#if p.missions > 0}<span class="ac-missions">{missionsLabel(p.missions)}</span>{/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
