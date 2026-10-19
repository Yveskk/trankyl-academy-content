<script lang="ts">
  import { onMount, untrack } from "svelte";
  import Shield from "@lucide/svelte/icons/shield";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import Bell from "@lucide/svelte/icons/bell";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { afterNavigate, goto, invalidateAll } from "$app/navigation";
  import { navigating, page } from "$app/stores";
  import { me, meClient } from "$lib/api/auth";
  import Footer from "$lib/components/Footer.svelte";
  import BackLink from "$lib/components/BackLink.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import Snackbar from "$lib/components/Snackbar.svelte";
  import TopStrip from "$lib/components/TopStrip.svelte";
  import OrientationWidget from "$lib/components/OrientationWidget.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { navHistory } from "$lib/stores/history.svelte";
  import { backFallback } from "$lib/utils/backTarget";
  import { i18n } from "$lib/stores/locale.svelte";
  import { site } from "$lib/stores/site.svelte";
  import { apiLoading } from "$lib/stores/loading.svelte";
  import { notifications } from "$lib/stores/notifications.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import "../app.css";

  let { children } = $props();
  let isAdminPanel = $derived($page.url.pathname.startsWith("/admin") && $page.url.pathname !== "/admin/login");
  // Espace prestataire (profil, enrôlement, tableau de bord) : application pleine largeur ; l'en-tête du site reste visible, sans pied de page.
  let isProviderSpace = $derived($page.url.pathname === "/prestataire" || $page.url.pathname.startsWith("/prestataire/"));
  // Uniquement les interfaces de chat plein ecran elles-memes (pas leurs
  // sous-pages comme /prestataires/[id] ou /prestataires/liste, qui sont
  // des pages normales avec defilement).
  let isChatPage = $derived(
    $page.url.pathname === "/messagerie" ||
      $page.url.pathname === "/prestataires" ||
      $page.url.pathname === "/client/messagerie"
  );
  // Pages d'authentification : plein ecran, sans pied de page (voir AuthShell).
  const AUTH_PATHS = ["/login", "/register", "/client/login", "/client/register", "/mot-de-passe-oublie", "/admin/login"];
  let isAuthPage = $derived(AUTH_PATHS.includes($page.url.pathname.replace(/\/+$/, "")));
  // Pages publiques "maquette" pleine largeur (bandeau de couverture, sections colorees).
  // Espace client (Mon compte, Mes réservations) : menu latéral + contenu sur toute la largeur.
  let isClientSpace = $derived($page.url.pathname.startsWith("/client/compte") || $page.url.pathname.startsWith("/client/reservations"));
  let isFullBleed = $derived(
    isAuthPage || $page.url.pathname === "/devenir-prestataire" || $page.url.pathname === "/accueil" || $page.url.pathname === "/categories" || $page.url.pathname === "/recherche" || $page.url.pathname.startsWith("/profil/") || isClientSpace
  );
  // Tableau de bord « Trankyl PRO » (compte prestataire complet) : application autonome, sans l'en-tête du site.
  let hideSiteHeader = $derived(isProviderSpace && providerSpace.unlocked);
  let hideFooter = $derived(isAdminPanel || isProviderSpace || isChatPage || isAuthPage);

  // Lien "Retour" sur chaque page publique (sauf l'accueil et les ecrans de chat plein ecran).
  afterNavigate(({ type }) => navHistory.record(type));
  let backTarget = $derived(isAdminPanel || isProviderSpace || isChatPage ? null : backFallback($page.url.pathname));

  let topbarEl: HTMLElement | undefined = $state();
  let mobileMenuOpen = $state(false);
  let userMenuOpen = $state(false);
  let notifPromptDismissed = $state(false);

  let showNotifPrompt = $derived(
    !notifPromptDismissed &&
      !hideSiteHeader &&
      (auth.role === "apprenant" || auth.role === "client") &&
      notifications.permission === "default"
  );

  async function enableNotifications() {
    await notifications.requestPermission();
  }

  onMount(() => {
    if (!topbarEl) return;
    const setTopbarHeight = () => {
      document.documentElement.style.setProperty("--topbar-h", `${topbarEl!.offsetHeight}px`);
    };
    setTopbarHeight();
    const ro = new ResizeObserver(setTopbarHeight);
    ro.observe(topbarEl);
    return () => ro.disconnect();
  });

  $effect(() => {
    if (auth.role === "apprenant" || auth.role === "client") {
      notifications.start(auth.role);
    } else {
      notifications.stop();
    }
  });

  $effect(() => {
    if ($navigating) userMenuOpen = false;
  });

  // Le visiteur change de pays ou de langue (bande verte) : toutes les donnees de la page sont rechargees pour ce pays / cette langue.
  let scopeKey = `${site.country}|${i18n.locale}`;
  $effect(() => {
    const key = `${site.country}|${i18n.locale}`;
    untrack(() => {
      if (key !== scopeKey) {
        scopeKey = key;
        invalidateAll();
      }
    });
  });

  $effect(() => {
    // untrack() : appeler me()/meClient() declenche apiLoading.start() (qui
    // lit ET ecrit apiLoading.activeRequests) de facon synchrone pendant
    // l'execution de cet effet. Sans untrack, Svelte traite cette
    // lecture/ecriture comme une dependance de l'effet lui-meme, qui se
    // redeclenche alors a l'infini (effect_update_depth_exceeded) des la
    // connexion/inscription — la navigation qui suit (goto) ne se produit
    // alors jamais, laissant l'utilisateur bloque sur la page.
    if (auth.role === "apprenant" && !auth.profile) {
      untrack(() => {
        me().then((p) => auth.setProfile({ firstname: p.firstname, lastname: p.lastname })).catch(() => {});
      });
    } else if (auth.role === "client" && !auth.profile) {
      untrack(() => {
        meClient().then((p) => auth.setProfile({ firstname: p.firstname, lastname: p.lastname, image: p.image })).catch(() => {});
      });
    }
  });

  function initials(profile: { firstname: string; lastname: string }): string {
    return `${profile.firstname[0] ?? ""}${profile.lastname[0] ?? ""}`.toUpperCase();
  }

  function logout() {
    notifications.stop();
    auth.logout();
    mobileMenuOpen = false;
    userMenuOpen = false;
    goto("/");
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
    userMenuOpen = false;
  }

  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
  }

  function closeUserMenu() {
    userMenuOpen = false;
  }

  function isActive(pathname: string, exact = false) {
    const currentPath = $page.url.pathname;
    return exact ? currentPath === pathname : currentPath === pathname || currentPath.startsWith(`${pathname}/`);
  }

  const organizationJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Trankyl Academy",
    url: "https://academy.trankyl.com",
    logo: "https://academy.trankyl.com/academiLogo.png",
    description:
      "Trankyl Academy forme et certifie les métiers du service à domicile via une taxonomie de compétences et un curriculum de micro-modules évalués.",
    sameAs: [
      "https://www.facebook.com/trankyl/",
      "https://www.instagram.com/trankyl_me/",
      "https://www.tiktok.com/@trankyl_me",
    ],
  }).replace(/<\//g, "<\\/");
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${organizationJsonLd}</script>`}
</svelte:head>

{#snippet userMenu()}
  {#if auth.profile && auth.role === "client"}
    <!-- Le client va directement sur « Mon compte » (profil, sécurité, fermeture). -->
    <a class="user-chip" class:active={isActive("/client/compte")} href="/client/compte" aria-label="Mon compte">
      <span class="user-avatar">{#if auth.profile.image}<img src={auth.profile.image} alt="" />{:else}{initials(auth.profile)}{/if}</span>
      <span class="user-name">{auth.profile.firstname}</span>
    </a>
  {:else if auth.profile}
    <div class="user-menu-wrap">
      <button
        class="user-chip"
        type="button"
        aria-haspopup="menu"
        aria-expanded={userMenuOpen}
        onclick={toggleUserMenu}
      >
        <span class="user-avatar">{initials(auth.profile)}</span>
        <span class="user-name">{auth.profile.firstname}</span>
        <ChevronDown size={13} class="user-chip-chevron" />
      </button>
      {#if userMenuOpen}
        <button class="user-menu-backdrop" type="button" aria-label="Fermer le menu" onclick={closeUserMenu}></button>
        <div class="user-menu" role="menu">
          <button type="button" role="menuitem" onclick={logout}>{i18n.dict.nav.deconnexion}</button>
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

{#if $navigating || apiLoading.isLoading}
  <div class="nav-progress" aria-hidden="true"></div>
{/if}

{#if !isAdminPanel && !isChatPage && !hideSiteHeader}
  <TopStrip />
{/if}

<header class="topbar" class:admin-header={isAdminPanel} class:ps-hidden={hideSiteHeader} bind:this={topbarEl}>
  <div class="topbar-inner">
    {#if isAdminPanel}
      <!-- <a class="brand admin-brand" href="/admin/dashboard">
        <span class="brand-mark"><Shield size={19} /></span>
        <span>
          Trankyl Academy
          <span class="brand-sub">Administration</span>
        </span>
      </a>
      <nav class="admin-global-nav">
        <span class="admin-context-label">Panneau de gestion</span>
        <span class="nav-divider"></span>
        <a href="/" class="admin-public-link" class:active={isActive("/", true)}><ExternalLink size={14} />Voir le site public</a>
        <button class="btn btn-ghost btn-sm" onclick={logout}>Deconnexion</button>
      </nav>
      <button class="mobile-menu-button" type="button" aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={mobileMenuOpen} onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>
        {#if mobileMenuOpen}<X size={22} />{:else}<Menu size={22} />{/if}
      </button> -->
    {:else}
      <a class="brand" href="https://trankyl.com/">
        <img class="brand-logo" src="/academiLogo.png" alt="Trankyl Academy" />
      </a>
      <nav>
        <a href="/accueil" class:active={isActive("/accueil")}>{i18n.dict.nav.accueil}</a>
        <a href="/" class:active={isActive("/", true)}>{i18n.dict.nav.metiers}</a>
        <a href="/blog" class:active={isActive("/blog")}>{i18n.dict.nav.blog}</a>
        <span class="nav-divider"></span>
        {#if auth.role === "apprenant"}
          <!-- Espace prestataire : « Mon espace » et « Messagerie » (parcours apprenant) n'ont pas lieu d'être ici. -->
          {#if !isProviderSpace}
            <a href="/apprenant" class:active={isActive("/apprenant")}>{i18n.dict.nav.monEspace}</a>
            <a href="/messagerie" class="msg-link" class:active={isActive("/messagerie")}>{i18n.dict.nav.messagerie}{#if notifications.count > 0}<span class="notif-badge">{notifications.count}</span>{/if}</a>
          {/if}
          {@render userMenu()}
        {:else if auth.role === "client"}
          <a href="/client/reservations" class="msg-link" class:active={isActive("/client/reservations")}>Mes réservations</a>
          <a href="/client/messagerie" class="msg-link" class:active={isActive("/client/messagerie")}>Mes demandes{#if notifications.count > 0}<span class="notif-badge">{notifications.count}</span>{/if}</a>
          {@render userMenu()}
        {:else}
          <a class="nav-pill-outline" href="/client/login">{i18n.dict.nav.connexion}</a>
          <a class="btn btn-sm nav-pill-dark" href="/devenir-prestataire">{i18n.dict.nav.inscription}</a>
        {/if}
      </nav>
      <button class="mobile-menu-button" type="button" aria-label={mobileMenuOpen ? i18n.dict.nav.fermerMenu : i18n.dict.nav.ouvrirMenu} aria-expanded={mobileMenuOpen} onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>
        {#if mobileMenuOpen}<X size={22} />{:else}<Menu size={22} />{/if}
      </button>
    {/if}
  </div>
</header>

{#if mobileMenuOpen}
  <button class="mobile-menu-backdrop" type="button" aria-label="Fermer le menu" onclick={closeMobileMenu}></button>
  <aside class="mobile-menu-drawer" aria-label="Menu mobile">
    {#if isAdminPanel}
      <div class="mobile-menu-heading">Panneau de gestion</div>
      <a href="/admin/dashboard" class:active={isActive("/admin/dashboard")} onclick={closeMobileMenu}>Tableau de bord</a>
      <a href="/admin/taxonomy" class:active={isActive("/admin/taxonomy")} onclick={closeMobileMenu}>Taxonomie</a>
      <a href="/admin/curriculum" class:active={isActive("/admin/curriculum")} onclick={closeMobileMenu}>Curriculum</a>
      <a href="/admin/apprenants" class:active={isActive("/admin/apprenants")} onclick={closeMobileMenu}>Apprenants</a>
      <a href="/admin/blog" class:active={isActive("/admin/blog")} onclick={closeMobileMenu}>Blog</a>
      <a href="/admin/contenu" class:active={isActive("/admin/contenu")} onclick={closeMobileMenu}>Contenu du site</a>
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}><ExternalLink size={16} /> Voir le site public</a>
      <button type="button" onclick={logout}>Deconnexion</button>
    {:else}
      <a href="/accueil" class:active={isActive("/accueil")} onclick={closeMobileMenu}>{i18n.dict.nav.accueil}</a>
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}>{i18n.dict.nav.metiers}</a>
      <a href="/blog" class:active={isActive("/blog")} onclick={closeMobileMenu}>{i18n.dict.nav.blog}</a>
      {#if auth.role === "apprenant"}
        {#if auth.profile}
          <button type="button" class="mobile-user-chip" aria-expanded={userMenuOpen} onclick={toggleUserMenu}>
            <span class="user-avatar">{initials(auth.profile)}</span>
            <span class="user-name">{auth.profile.firstname} {auth.profile.lastname}</span>
            <ChevronDown size={15} class="user-chip-chevron" />
          </button>
          {#if userMenuOpen}
            <button type="button" class="mobile-logout-btn" onclick={logout}>{i18n.dict.nav.deconnexion}</button>
          {/if}
        {/if}
        {#if !isProviderSpace}
          <a href="/apprenant" class:active={isActive("/apprenant")} onclick={closeMobileMenu}>{i18n.dict.nav.monEspace}</a>
          <a href="/messagerie" class:active={isActive("/messagerie")} onclick={closeMobileMenu}>{i18n.dict.nav.messagerie}{#if notifications.count > 0} ({notifications.count}){/if}</a>
        {/if}
      {:else if auth.role === "client"}
        {#if auth.profile}
          <a class="mobile-user-chip" href="/client/compte" onclick={closeMobileMenu}>
            <span class="user-avatar">{#if auth.profile.image}<img src={auth.profile.image} alt="" />{:else}{initials(auth.profile)}{/if}</span>
            <span class="user-name">{auth.profile.firstname} {auth.profile.lastname}</span>
          </a>
        {/if}
        <a href="/client/reservations" class:active={isActive("/client/reservations")} onclick={closeMobileMenu}>Mes réservations</a>
        <a href="/client/messagerie" class:active={isActive("/client/messagerie")} onclick={closeMobileMenu}>Mes demandes{#if notifications.count > 0} ({notifications.count}){/if}</a>
      {:else}
        <a href="/client/login" class:active={isActive("/client/login")} onclick={closeMobileMenu}>{i18n.dict.nav.connexion}</a>
        <a class="mobile-menu-cta nav-pill-dark" href="/devenir-prestataire" onclick={closeMobileMenu}>{i18n.dict.nav.inscription}</a>
      {/if}
    {/if}
  </aside>
{/if}

{#if showNotifPrompt}
  <div class="notif-prompt">
    <Bell size={16} />
    <span>Activez les notifications pour être alerté dès qu'un nouveau message arrive.</span>
    <button class="notif-prompt-enable" onclick={enableNotifications}>Activer</button>
    <button class="notif-prompt-dismiss" aria-label="Fermer" onclick={() => (notifPromptDismissed = true)}>
      <X size={14} />
    </button>
  </div>
{/if}

{#if isAdminPanel || isProviderSpace}
  <div class="admin-root-content">
    {@render children()}
  </div>
{:else}
  {#if backTarget && !isAuthPage}
    <div class="back-bar" class:wide={isFullBleed}>
      <BackLink fallback={backTarget} />
    </div>
  {/if}
  <main class="public-main" class:app-page={isChatPage} class:full-bleed={isFullBleed} class:auth-main={isAuthPage}>
    {#if isAuthPage && backTarget}
      <div class="auth-back"><BackLink fallback={backTarget} /></div>
    {/if}
    {@render children()}
  </main>
{/if}

{#if !hideFooter}
  <Footer />
{/if}

{#if !isAdminPanel && !isProviderSpace && !isChatPage}
  <OrientationWidget />
{/if}

<Snackbar />
<ConfirmModal />
