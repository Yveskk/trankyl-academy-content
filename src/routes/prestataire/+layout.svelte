<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Check from "@lucide/svelte/icons/check";
  import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
  import Bell from "@lucide/svelte/icons/bell";
  import CreditCard from "@lucide/svelte/icons/credit-card";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Settings from "@lucide/svelte/icons/settings";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import Inbox from "@lucide/svelte/icons/inbox";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import FileText from "@lucide/svelte/icons/file-text";
  import Wallet from "@lucide/svelte/icons/wallet";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Star from "@lucide/svelte/icons/star";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Gift from "@lucide/svelte/icons/gift";
  import UserRound from "@lucide/svelte/icons/user-round";
  import ClipboardList from "@lucide/svelte/icons/clipboard-list";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import Seo from "$lib/components/Seo.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let { children }: { children: Snippet } = $props();
  let open = $state(false);
  let failed = $state(false);

  const st = $derived(providerSpace.state);
  const path = $derived($page.url.pathname.replace(/\/+$/, "") || "/");
  const here = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  const profileDone = $derived(!!st?.profile.complete);
  const enrollDone = $derived(!!st?.enrollment.submitted && (st?.enrollment.missing.length ?? 1) === 0);
  const doneCount = $derived(1 + (profileDone ? 1 : 0) + (enrollDone ? 1 : 0));
  const minutes = $derived((profileDone ? 0 : 4) + (enrollDone ? 0 : 8));

  $effect(() => {
    if (auth.role !== "apprenant") goto("/login?profil=prestataire&redirect=%2Fprestataire");
  });
  $effect(() => {
    if (providerSpace.forbidden) goto("/apprenant", { replaceState: true }); // un apprenant n'a pas d'espace prestataire
  });
  onMount(async () => {
    try {
      const st = await providerSpace.load();
      if (st?.dashboard_unlocked) providerSpace.refreshNotices();
    } catch (e) {
      failed = true;
      snackbar.error((e as Error).message);
    }
  });
  $effect(() => {
    path;
    open = false;
  });

  function logout() {
    providerSpace.clear();
    auth.logout();
    goto("/");
  }

  const PRO = $derived([
    { href: "/prestataire", exact: true, icon: LayoutDashboard, label: "Tableau de bord" },
    { href: "/prestataire/demandes", icon: Inbox, label: "Demandes", badge: providerSpace.newRequests },
    { href: "/prestataire/services", icon: Briefcase, label: "Mes services" },
    { href: "/prestataire/agenda", icon: CalendarDays, label: "Agenda" },
    { href: "/messagerie", icon: MessageCircle, label: "Chat" },
    { href: "/prestataire/devis", icon: FileText, label: "Devis et factures" },
    { href: "/prestataire/paiements", icon: Wallet, label: "Paiements" },
    { href: "/prestataire/profil-public", icon: ExternalLink, label: "Mon profil public" },
    { href: "/prestataire/avis", icon: Star, label: "Avis" },
    { href: "/prestataire/notifications", icon: Bell, label: "Notifications", badge: providerSpace.unreadNotices },
    { href: "/prestataire/abonnement", icon: CreditCard, label: "Abonnement PRO" },
    { href: "/prestataire/partager", icon: Share2, label: "Partager mon profil" },
    { href: "/prestataire/academie", icon: GraduationCap, label: "Académie" },
    { icon: ShieldCheck, label: "Assurance et protection" },
    { icon: Gift, label: "Parrainage" },
  ]);
</script>

<Seo title="Espace prestataire" description="Votre espace prestataire Trankyl : profil, dossier et tableau de bord." noindex />

{#if !st}
  <div class="ps-boot">{#if failed}<p>Impossible de charger votre espace. <button onclick={() => location.reload()}>Réessayer</button></p>{:else}<span class="ps-spin" aria-label="Chargement"></span>{/if}</div>
{:else if st.dashboard_unlocked}
  <!-- Espace complet : « Trankyl PRO » -->
  <div class="ps-pro">
    <button class="ps-burger" type="button" aria-label="Ouvrir le menu" onclick={() => (open = true)}><Menu size={22} /></button>
    {#if open}<button class="ps-back" type="button" aria-label="Fermer le menu" onclick={() => (open = false)}></button>{/if}
    <aside class="ps-side" class:open>
      <div class="ps-brand"><span>trankyl</span><em>PRO</em><button class="ps-x" type="button" aria-label="Fermer" onclick={() => (open = false)}><X size={20} /></button></div>
      <nav>
        {#each PRO as n (n.label)}
          {@const Icon = n.icon}
          {#if n.href}
            <a href={n.href} class:on={here(n.href, n.exact)} aria-current={here(n.href, n.exact) ? "page" : undefined}><Icon size={17} /><span>{n.label}</span>{#if n.badge}<b class="bd">{n.badge}</b>{/if}</a>
          {:else}
            <span class="soon" title="Bientôt disponible" aria-disabled="true"><Icon size={17} /><span>{n.label}</span>{#if n.badge}<b>{n.badge}</b>{/if}</span>
          {/if}
        {/each}
      </nav>
      <div class="ps-foot">
        <a href="/prestataire/profil" class:on={here("/prestataire/profil")}><UserRound size={17} /><span>Mon profil</span></a>
        <a href="/prestataire/parametres" class:on={here("/prestataire/parametres")}><Settings size={17} /><span>Paramètres et aide</span></a>
        <a href="/prestataire/enrolement" class:on={here("/prestataire/enrolement")}><ClipboardList size={17} /><span>Mon dossier</span></a>
        <button type="button" onclick={logout}><LogOut size={17} /><span>Se déconnecter</span></button>
      </div>
    </aside>
    <main class="ps-main">{@render children()}</main>
  </div>
{:else}
  <!-- Inscription en cours : profil puis formulaire d'enrôlement -->
  <div class="ps-onb">
    <aside class="ps-steps">
      <h2>Votre inscription</h2>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow={doneCount}><span style:width="{(doneCount / 3) * 100}%"></span></div>
      <p class="meta">{doneCount} étape{doneCount > 1 ? "s" : ""} sur 3{minutes ? ` · ~${minutes} min restantes` : ""}</p>
      <ol>
        <li class="done"><span class="row"><span class="dot"><Check size={13} /></span><span>Compte créé</span></span></li>
        <li class:done={profileDone} class:on={here("/prestataire/profil") || path === "/prestataire"}>
          <a href="/prestataire/profil"><span class="dot">{#if profileDone}<Check size={13} />{:else}2{/if}</span><span>Compléter mon profil</span></a>
        </li>
        <li class:done={enrollDone} class:on={here("/prestataire/enrolement")} class:lock={!profileDone}>
          {#if profileDone}
            <a href="/prestataire/enrolement"><span class="dot">{#if enrollDone}<Check size={13} />{:else}3{/if}</span><span>Formulaire d'enrôlement</span></a>
          {:else}
            <span class="row inactive" title="Complétez d'abord votre profil"><span class="dot">3</span><span>Formulaire d'enrôlement</span></span>
          {/if}
        </li>
      </ol>
      <button class="out" type="button" onclick={logout}><LogOut size={15} /> Se déconnecter</button>
    </aside>
    <main class="ps-card">{@render children()}</main>
  </div>
{/if}

<style>
  :global(body) { background: #eef0f3; }
  .ps-boot { min-height: 60vh; display: grid; place-items: center; color: #4b5563; }
  .ps-boot button { background: none; border: none; color: #1c8f4a; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; }
  .ps-spin { width: 2.2rem; height: 2.2rem; border-radius: 50%; border: 3px solid #d6d9df; border-top-color: #2b303a; animation: ps-r 0.8s linear infinite; }
  @keyframes ps-r { to { transform: rotate(360deg); } }

  /* ---- inscription en cours */
  .ps-onb { min-height: calc(100vh - var(--topbar-h, 70px)); display: grid; grid-template-columns: 19rem minmax(0, 1fr); gap: 1.5rem; padding: 1.5rem; max-width: 1280px; margin: 0 auto; align-items: start; }
  .ps-steps { position: sticky; top: calc(var(--topbar-h, 70px) + 1rem); background: linear-gradient(180deg, var(--brand-gray-soft), var(--brand-gray)); color: var(--brand-gray-ink); border-radius: 18px; padding: 1.3rem 1.2rem; }
  .ps-steps h2 { margin: 0 0 0.9rem; font-size: 1.25rem; color: var(--brand-gray-ink); }
  .bar { height: 7px; background: rgba(31, 41, 55, 0.15); border-radius: 99px; overflow: hidden; }
  .bar span { display: block; height: 100%; background: #4b5563; border-radius: 99px; transition: width 0.4s; }
  .meta { margin: 0.5rem 0 1rem; font-size: 0.78rem; color: rgba(31, 41, 55, 0.7); }
  ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  ol li { border-radius: 10px; }
  ol li > a, ol li > .row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.7rem; color: rgba(31, 41, 55, 0.85); text-decoration: none; font-size: 0.9rem; border-radius: 10px; }
  ol li.done > a, ol li.done > .row { color: var(--brand-gray-ink); }
  ol li.on > a { background: #fff; color: var(--brand-gray-ink); font-weight: 800; box-shadow: 0 1px 3px rgba(31, 41, 55, 0.12); }
  ol li .inactive { opacity: 0.55; cursor: not-allowed; }
  .dot { width: 1.4rem; height: 1.4rem; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: 0.72rem; font-weight: 800; background: rgba(31, 41, 55, 0.14); color: #1f2937; }
  li.done .dot { background: #4b5563; color: #fff; }
  li.on .dot { background: #1f2937; color: #fff; }
  .out { margin-top: 1.2rem; display: inline-flex; align-items: center; gap: 0.4rem; background: none; border: none; color: rgba(31, 41, 55, 0.7); font: inherit; font-size: 0.82rem; cursor: pointer; padding: 0.4rem 0.7rem; }
  .out:hover { color: #1f2937; }
  .ps-card { background: #fff; border-radius: 20px; padding: 2rem 2.2rem; min-width: 0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }

  /* ---- espace complet */
  .ps-pro { min-height: 100vh; display: grid; grid-template-columns: 15.5rem minmax(0, 1fr); }
  .ps-side { background: linear-gradient(180deg, var(--brand-gray-soft), var(--brand-gray)); color: var(--brand-gray-ink); display: flex; flex-direction: column; padding: 1.1rem 0.8rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .ps-brand { font-size: 1.35rem; font-weight: 800; padding: 0.3rem 0.7rem 1.1rem; display: flex; align-items: baseline; gap: 0.35rem; }
  .ps-brand em { font-style: normal; font-size: 0.68rem; color: #4b5563; letter-spacing: 0.05em; }
  .ps-x, .ps-burger, .ps-back { display: none; }
  .ps-side nav { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
  .ps-side nav a, .ps-side nav .soon, .ps-foot a, .ps-foot button { display: flex; align-items: center; gap: 0.7rem; padding: 0.62rem 0.8rem; border-radius: 10px; color: rgba(31, 41, 55, 0.85); text-decoration: none; font: inherit; font-size: 0.9rem; font-weight: 600; background: none; border: none; cursor: pointer; text-align: left; width: 100%; }
  .ps-side nav a:hover, .ps-foot a:hover, .ps-foot button:hover { background: rgba(31, 41, 55, 0.08); color: var(--brand-gray-ink); }
  .ps-side nav a.on, .ps-foot a.on { background: #fff; color: var(--brand-gray-ink); font-weight: 800; box-shadow: 0 1px 3px rgba(31, 41, 55, 0.12); }
  .soon { opacity: 0.55; cursor: default; }
  .ps-side nav a .bd { margin-left: auto; font-size: 0.72rem; background: #1f2937; color: #fff; border-radius: 99px; padding: 0.05rem 0.5rem; }
  .soon b { margin-left: auto; font-size: 0.72rem; background: #4b5563; color: #fff; border-radius: 99px; padding: 0.05rem 0.5rem; }
  .ps-foot { border-top: 1px solid rgba(31, 41, 55, 0.15); padding-top: 0.6rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .ps-main { padding: 1.6rem 1.8rem 3rem; min-width: 0; }

  @media (max-width: 900px) {
    .ps-onb { grid-template-columns: minmax(0, 1fr); padding: 0.8rem; }
    .ps-steps { position: static; }
    .ps-card { padding: 1.3rem 1.1rem; }
    .ps-pro { grid-template-columns: minmax(0, 1fr); }
    .ps-burger { display: inline-flex; position: fixed; top: 0.7rem; left: 0.7rem; z-index: 30; width: 2.6rem; height: 2.6rem; align-items: center; justify-content: center; border-radius: 10px; border: none; background: var(--brand-gray); color: var(--brand-gray-ink); cursor: pointer; }
    .ps-side { position: fixed; inset: 0 auto 0 0; height: 100vh; width: 16.5rem; z-index: 50; transform: translateX(-100%); transition: transform 0.25s; }
    .ps-side.open { transform: none; box-shadow: 0 0 40px rgba(0, 0, 0, 0.25); }
    .ps-back { display: block; position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.45); border: none; }
    .ps-x { display: inline-flex; margin-left: auto; background: none; border: none; color: var(--brand-gray-ink); cursor: pointer; }
    .ps-main { padding: 4rem 1rem 2rem; }
  }
</style>
