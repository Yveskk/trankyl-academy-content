<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import { addMedia, deleteMedia, getPublicProfile, patchMedia, removeCover, savePublicProfile, setServiceVisibility, uploadCover, type PublicProfile } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import ImageLightbox from "$lib/components/ImageLightbox.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const pending = new Pending();
  let p = $state<PublicProfile | null>(null);
  let caption = $state("");
  let zoom = $state(false);
  let zoomSrc = $state("");
  let coverInput = $state<HTMLInputElement | undefined>();
  let mediaInput = $state<HTMLInputElement | undefined>();

  onMount(async () => {
    try {
      p = await getPublicProfile();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  });

  const num = (v: string) => (v === "" ? null : Number(v));
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!p) return;
    await pending.run("save", async () => {
      try {
        p = await savePublicProfile({ headline: p!.headline, about: p!.about, years_experience: p!.years_experience, visit_fee: p!.visit_fee, service_radius_km: p!.service_radius_km, zone_label: p!.zone_label, services_note: p!.services_note });
        snackbar.success("Profil public enregistré : vos clients voient ces informations.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function cover(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = "";
    if (!f) return;
    await pending.run("cover", async () => {
      try {
        p!.cover_image_url = (await uploadCover(f)).cover_image_url;
        snackbar.success("Image de couverture mise à jour.");
      } catch (err) {
        snackbar.error((err as Error).message);
      }
    });
  }
  async function dropCover() {
    await pending.run("cover", async () => {
      await removeCover();
      p!.cover_image_url = null;
    });
  }
  async function media(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = "";
    if (!f) return;
    await pending.run("media", async () => {
      try {
        p!.media = [...p!.media, await addMedia(f, caption.trim())];
        caption = "";
        snackbar.success("Réalisation ajoutée.");
      } catch (err) {
        snackbar.error((err as Error).message);
      }
    });
  }
  async function toggleMedia(m: PublicProfile["media"][number]) {
    await pending.run(`m${m.id}`, async () => {
      try {
        await patchMedia(m.id, { is_active: !m.is_active });
        m.is_active = !m.is_active;
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function dropMedia(m: PublicProfile["media"][number]) {
    const ok = await confirmDialog.ask({ title: "Supprimer cette réalisation ?", message: "Elle ne sera plus visible sur votre fiche.", confirmLabel: "Supprimer", tone: "danger", action: () => deleteMedia(m.id) });
    if (ok) p!.media = p!.media.filter((x) => x.id !== m.id);
  }
  async function toggleService(s: PublicProfile["services"][number]) {
    await pending.run(`s${s.id}`, async () => {
      try {
        await setServiceVisibility(s.id, !s.is_active);
        s.is_active = !s.is_active;
        snackbar.success(s.is_active ? "Service affiché aux clients." : "Service masqué aux clients.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  const money = (v: string | number | null) => (v ? `${Number(v).toLocaleString("fr-FR")} F` : "Sur devis");
</script>

<ImageLightbox src={zoomSrc} alt="Réalisation" bind:open={zoom} />

<div class="pw">
  <div class="pw-top">
    <div><h1>Mon profil public</h1><p class="pw-sub">Tout ce que vous réglez ici est ce que vos clients voient dans l'annuaire et sur votre fiche.</p></div>
    {#if p}<a class="view" href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Voir ma fiche</a>{/if}
  </div>
  {#if !p}<div class="pw-empty">Chargement…</div>{:else}
    {#if !p.verified}<div class="note">Votre fiche sera visible dans l'annuaire dès que notre équipe aura validé votre dossier d'enrôlement.</div>{/if}
    <div class="pw-grid2">
      <div class="col">
        <form class="pw-box" onsubmit={save} novalidate>
          <h2>Présentation</h2>
          <div class="field"><label for="hl">Titre (métier)</label><input id="hl" bind:value={p.headline} maxlength="255" placeholder="Ex. Plombier — dépannage et installation" /></div>
          <div class="field"><label for="ab">À propos</label><textarea id="ab" rows="5" maxlength="2000" bind:value={p.about} placeholder="Présentez votre savoir-faire, votre façon de travailler…"></textarea></div>
          <div class="g3">
            <div class="field"><label for="ye">Années d'expérience</label><input id="ye" type="number" min="0" max="80" value={p.years_experience ?? ""} oninput={(e) => (p!.years_experience = num(e.currentTarget.value))} /></div>
            <div class="field"><label for="vf">Déplacement + diagnostic (F)</label><input id="vf" type="number" min="0" value={p.visit_fee ?? ""} oninput={(e) => (p!.visit_fee = num(e.currentTarget.value))} /></div>
            <div class="field"><label for="rk">Rayon d'action (km)</label><input id="rk" type="number" min="0" max="500" value={p.service_radius_km ?? ""} oninput={(e) => (p!.service_radius_km = num(e.currentTarget.value))} /></div>
          </div>
          <div class="field"><label for="zl">Zone d'intervention</label><input id="zl" bind:value={p.zone_label} maxlength="255" placeholder="Ex. Lomé et environs" /></div>
          <div class="field"><label for="sn">Note sur vos services</label><textarea id="sn" rows="2" maxlength="1000" bind:value={p.services_note} placeholder="Ex. Pièces en sus, devis gratuit…"></textarea></div>
          <div class="foot"><Btn type="submit" class="btn-primary" loading={pending.is("save")}>Enregistrer</Btn></div>
        </form>

        <section class="pw-box">
          <h2>Mes services affichés</h2>
          <p class="pw-muted">Masquez un service pour qu'il ne soit plus proposé aux clients. Les services se créent dans l'application Trankyl Heros.</p>
          {#each p.services as s (s.id)}
            <div class="sv" class:off={!s.is_active}><div><strong>{s.title}</strong><span class="pw-sm">{money(s.min_price)}</span></div>
              <Btn class="btn-outline btn-sm" loading={pending.is(`s${s.id}`)} onclick={() => toggleService(s)}>{#if s.is_active}<Eye size={14} /> Affiché{:else}<EyeOff size={14} /> Masqué{/if}</Btn></div>
          {:else}<p class="pw-muted">Aucun service pour le moment.</p>{/each}
        </section>
      </div>

      <div class="col">
        <section class="pw-box">
          <h2>Image de couverture</h2>
          {#if p.cover_image_url}<img class="cov" src={p.cover_image_url} alt="Couverture" />{:else}<div class="cov ph">Aucune image</div>{/if}
          <input bind:this={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onchange={cover} />
          <div class="acts"><Btn class="btn-outline btn-sm" loading={pending.is("cover")} onclick={() => coverInput?.click()}><ImagePlus size={14} /> {p.cover_image_url ? "Changer" : "Ajouter"}</Btn>{#if p.cover_image_url}<Btn class="btn-outline btn-danger btn-sm" onclick={dropCover}>Retirer</Btn>{/if}</div>
        </section>
        <section class="pw-box">
          <h2>Mes réalisations ({p.media.length}/30)</h2>
          <div class="add"><input bind:value={caption} maxlength="255" placeholder="Légende (facultatif)" /><input bind:this={mediaInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onchange={media} /><Btn class="btn-primary btn-sm" loading={pending.is("media")} onclick={() => mediaInput?.click()}><ImagePlus size={14} /> Ajouter une photo</Btn></div>
          <div class="gal">
            {#each p.media as m (m.id)}
              <figure class:off={!m.is_active}><button type="button" class="im" onclick={() => { zoomSrc = m.url; zoom = true; }}><img src={m.url} alt={m.caption ?? "Réalisation"} loading="lazy" /></button>
                <div class="ma"><button type="button" aria-label={m.is_active ? "Masquer" : "Afficher"} title={m.is_active ? "Masquer aux clients" : "Afficher aux clients"} onclick={() => toggleMedia(m)}>{#if m.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}</button><button type="button" class="d" aria-label="Supprimer" onclick={() => dropMedia(m)}><Trash2 size={15} /></button></div>
                <figcaption>{m.caption ?? ""}</figcaption></figure>
            {:else}<p class="pw-muted">Ajoutez des photos de vos réalisations : les profils avec photos reçoivent nettement plus de demandes.</p>{/each}
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>

<style>
  .view { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border-radius: 12px; border: 1.5px solid #1d2230; color: #1d2230; text-decoration: none; font-weight: 800; font-size: 0.88rem; background: #fff; }
  .note { padding: 0.75rem 1rem; border-radius: 12px; background: #fff7dc; border: 1px solid #f1d98a; color: #6b4e00; font-size: 0.88rem; }
  .col { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .g3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
  .foot { display: flex; justify-content: flex-end; }
  .sv { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; padding: 0.6rem 0; border-top: 1px solid #f0f1f3; }
  .sv > div { display: flex; flex-direction: column; min-width: 0; }
  .sv.off strong { text-decoration: line-through; color: #9ca3af; }
  .cov { width: 100%; height: 9rem; object-fit: cover; border-radius: 12px; background: #eef0f3; display: grid; place-items: center; color: #9ca3af; }
  .acts, .add { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
  .add input:not([type="file"]) { flex: 1; min-width: 10rem; padding: 0.5rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; }
  .gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.7rem; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  figure.off img { opacity: 0.35; }
  .im { padding: 0; border: none; background: none; cursor: zoom-in; display: block; }
  .im img { width: 100%; height: 6.5rem; object-fit: cover; border-radius: 10px; display: block; }
  figcaption { font-size: 0.75rem; color: #6b7280; min-height: 1em; overflow-wrap: anywhere; }
  .ma { display: flex; gap: 0.3rem; }
  .ma button { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 0.25rem 0.4rem; cursor: pointer; display: inline-flex; }
  .ma .d { color: #b3261e; margin-left: auto; }
  @media (max-width: 640px) { .g3 { grid-template-columns: 1fr; } }
</style>
