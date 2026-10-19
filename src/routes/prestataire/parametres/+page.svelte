<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Phone from "@lucide/svelte/icons/phone";
  import Mail from "@lucide/svelte/icons/mail";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Btn from "$lib/components/Btn.svelte";
  import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import { deleteMyAccount, getDeletionInfo, getSupport, type DeletionInfo, type Support } from "$lib/api/providerAccount";
  import { auth } from "$lib/stores/auth.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let support = $state<Support | null>(null);
  let confirming = $state(false);
  let info = $state<DeletionInfo | null>(null);
  let checking = $state(false);
  let ack = $state(false);
  let password = $state("");
  let busy = $state(false);

  onMount(async () => {
    try {
      support = await getSupport();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  });

  async function startDelete() {
    checking = true;
    try {
      info = await getDeletionInfo();
      confirming = true;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      checking = false;
    }
  }
  const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

  async function remove() {
    busy = true;
    try {
      const r = await deleteMyAccount(password);
      providerSpace.clear();
      auth.logout();
      snackbar.success(`Suppression programmée : vos données seront anonymisées le ${day(r.anonymize_on)}. Reconnectez-vous avant pour annuler.`);
      goto("/");
    } catch (e) {
      snackbar.error((e as Error).message);
      busy = false;
    }
  }
  const FAQ = [
    ["Comment recevoir plus de demandes ?", "Complétez votre profil public, ajoutez des photos de vos réalisations, publiez plusieurs services avec des tarifs clairs et gardez votre abonnement actif."],
    ["Quand suis-je payé ?", "Le paiement en ligne du client est bloqué puis libéré une fois la mission confirmée. Retrouvez le détail dans « Paiements »."],
    ["Pourquoi mon profil n'apparaît pas dans la recherche ?", "Votre dossier doit être validé, vous devez avoir au moins un service visible dans votre pays et un abonnement actif."],
    ["Comment modifier ma ville ou mon pays ?", "Dans « Mon profil » : le pays et la ville de votre profil servent de base à vos nouveaux services."],
  ];
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Paramètres et aide</h1><p class="pw-sub">Langue, contact du support et gestion de votre compte.</p></div></div>

  <div class="cols">
    <section class="pw-box">
      <h2>Contacter Trankyl</h2>
      {#if !support}<p class="pw-muted">Chargement…</p>
      {:else if !support.available}<p class="pw-muted">Écrivez-nous{#if support.email} à <a href={`mailto:${support.email}`}>{support.email}</a>{/if}.</p>
      {:else}
        <p class="pw-muted">Service client {support.country ?? ""}{support.city ? ` — ${support.city}` : ""}</p>
        <ul class="ct">
          {#each support.phones ?? [] as p}<li><Phone size={16} /><a href={`tel:${p}`}>{p}</a></li>{/each}
          {#if support.whatsapp}<li><MessageCircle size={16} /><a href={support.whatsapp} target="_blank" rel="noopener">WhatsApp</a></li>{/if}
          {#if support.email}<li><Mail size={16} /><a href={`mailto:${support.email}`}>{support.email}</a></li>{/if}
          {#if support.address}<li><MapPin size={16} />{#if support.map}<a href={support.map} target="_blank" rel="noopener">{support.address}</a>{:else}{support.address}{/if}</li>{/if}
        </ul>
        <div class="soc">{#each [["Facebook", support.facebook], ["Instagram", support.instagram], ["TikTok", support.tiktok]] as [n, u]}{#if u}<a href={u} target="_blank" rel="noopener">{n}</a>{/if}{/each}</div>
      {/if}
      <a class="btn btn-outline btn-sm" href="/contact">Écrire un message</a>
    </section>

    <section class="pw-box">
      <h2>Langue</h2>
      <LanguageSwitcher />
      <p class="pw-muted">Le pays se choisit dans la bande verte en haut du site.</p>
    </section>
  </div>

  <section class="pw-box">
    <h2>Questions fréquentes</h2>
    {#each FAQ as [q, a]}<details><summary>{q}</summary><p>{a}</p></details>{/each}
  </section>

  <section class="pw-box danger">
    <h2>Supprimer mon compte</h2>
    <p class="pw-muted">Vous avez <strong>{info?.grace_days ?? 30} jours</strong> pour changer d'avis : votre profil disparaît tout de suite, et il suffit de vous reconnecter pour tout rétablir. Passé ce délai, vos données personnelles (nom, contacts, pièces d'identité, photos) sont anonymisées. Les réservations et paiements passés sont conservés sans votre identité, comme l'exige la comptabilité.</p>
    {#if !confirming}<button class="btn btn-outline btn-sm dg" disabled={checking} onclick={startDelete}>{checking ? "Vérification…" : "Supprimer mon compte…"}</button>
    {:else if info && info.blockers.length}
      <div class="blk"><strong>Vous ne pouvez pas supprimer votre compte pour le moment :</strong>
        <ul>{#each info.blockers as b}<li>{b.label} — <a href={b.href}>y aller</a></li>{/each}</ul>
        <button type="button" class="btn btn-outline btn-sm" onclick={() => (confirming = false)}>Fermer</button></div>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); remove(); }}>
        {#if info?.active_subscription_until}<p class="warn">Votre abonnement est actif jusqu'au {day(info.active_subscription_until)} : il ne sera pas remboursé.</p>{/if}
        <label class="ck"><input type="checkbox" bind:checked={ack} /> Je comprends que mon profil sera masqué immédiatement et mes données anonymisées après {info?.grace_days ?? 30} jours.</label>
        <label>Confirmez avec votre mot de passe<PasswordInput bind:value={password} autocomplete="current-password" /></label>
        <div class="acts"><Btn type="submit" class="btn-primary dgb" loading={busy} disabled={!password || !ack}>Supprimer mon compte</Btn><button type="button" class="btn btn-outline btn-sm" onclick={() => { confirming = false; password = ""; ack = false; }}>Annuler</button></div>
      </form>
    {/if}
  </section>
</div>

<style>
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1rem; align-items: start; }
  .ct { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; } .ct li { display: flex; gap: 0.6rem; align-items: center; } .ct a { color: #0f7d41; font-weight: 600; text-decoration: none; }
  .soc { display: flex; gap: 0.8rem; } .soc a { color: #6b7280; font-size: 0.85rem; }
  details { border-top: 1px solid #f1f2f5; padding: 0.6rem 0; } details:first-of-type { border-top: none; } summary { cursor: pointer; font-weight: 700; } details p { margin: 0.5rem 0 0; color: #4b5563; font-size: 0.9rem; }
  .danger { border: 1px solid #fecaca; } .danger form { max-width: 26rem; display: flex; flex-direction: column; gap: 0.8rem; } .acts { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .dg { border-color: #dc2626 !important; color: #b91c1c !important; width: fit-content; } :global(.dgb) { background: #dc2626 !important; border-color: #dc2626 !important; }
  .blk { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; } .blk ul { margin: 0; padding-left: 1.1rem; } .blk a { color: #0f7d41; font-weight: 700; }
  .warn { margin: 0; color: #92400e; font-size: 0.85rem; } .ck { flex-direction: row !important; align-items: flex-start; gap: 0.5rem; font-weight: 500 !important; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 700; }
</style>
