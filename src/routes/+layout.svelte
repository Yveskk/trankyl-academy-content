<script lang="ts">
  import { onMount } from "svelte";
  import Shield from "@lucide/svelte/icons/shield";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import Bell from "@lucide/svelte/icons/bell";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { goto } from "$app/navigation";
  import { navigating, page } from "$app/stores";
  import { me, meClient } from "$lib/api/auth";
  import Footer from "$lib/components/Footer.svelte";
  import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
  import Snackbar from "$lib/components/Snackbar.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { apiLoading } from "$lib/stores/loading.svelte";
  import { notifications } from "$lib/stores/notifications.svelte";
  import "../app.css";

  let { children } = $props();
  let isAdminPanel = $derived($page.url.pathname.startsWith("/admin") && $page.url.pathname !== "/admin/login");
  // Uniquement les interfaces de chat plein ecran elles-memes (pas leurs
  // sous-pages comme /prestataires/[id] ou /prestataires/liste, qui sont
  // des pages normales avec defilement).
  let isChatPage = $derived(
    $page.url.pathname === "/messagerie" ||
      $page.url.pathname === "/prestataires" ||
      $page.url.pathname === "/client/messagerie"
  );
  let hideFooter = $derived(isAdminPanel || isChatPage);

  let topbarEl: HTMLElement | undefined = $state();
  let mobileMenuOpen = $state(false);
  let userMenuOpen = $state(false);
  let notifPromptDismissed = $state(false);

  let showNotifPrompt = $derived(
    !notifPromptDismissed &&
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

  $effect(() => {
    if (auth.role === "apprenant" && !auth.profile) {
      me().then((p) => auth.setProfile({ firstname: p.firstname, lastname: p.lastname })).catch(() => {});
    } else if (auth.role === "client" && !auth.profile) {
      meClient().then((p) => auth.setProfile({ firstname: p.firstname, lastname: p.lastname })).catch(() => {});
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
</script>

{#snippet userMenu()}
  {#if auth.profile}
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

<header class="topbar" class:admin-header={isAdminPanel} bind:this={topbarEl}>
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
      <a class="brand" href="/">
        <img class="brand-logo" src="/logo.svg" alt="Trankyl Academy" />
      </a>
      <nav>
        <a href="/" class:active={isActive("/", true)}>{i18n.dict.nav.metiers}</a>
        <a href="/prestataires" class:active={isActive("/prestataires")}>{i18n.dict.nav.prestataires}</a>
        <a href="/blog" class:active={isActive("/blog")}>{i18n.dict.nav.blog}</a>
        <a href="/a-propos" class:active={isActive("/a-propos")}>{i18n.dict.nav.aPropos}</a>
        <span class="nav-divider"></span>
        {#if auth.role === "apprenant"}
          <a href="/dashboard" class:active={isActive("/dashboard")}>{i18n.dict.nav.monEspace}</a>
          <a href="/messagerie" class="msg-link" class:active={isActive("/messagerie")}>{i18n.dict.nav.messagerie}{#if notifications.count > 0}<span class="notif-badge">{notifications.count}</span>{/if}</a>
          {@render userMenu()}
        {:else if auth.role === "client"}
          <a href="/client/messagerie" class="msg-link" class:active={isActive("/client/messagerie")}>Mes demandes{#if notifications.count > 0}<span class="notif-badge">{notifications.count}</span>{/if}</a>
          {@render userMenu()}
        {:else}
          <a href="/login" class:active={isActive("/login")}>{i18n.dict.nav.connexion}</a>
          <a class="btn btn-primary btn-sm" href="/register">{i18n.dict.nav.inscription}</a>
        {/if}
        <LanguageSwitcher />
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
      <a href="/admin/banniere" class:active={isActive("/admin/banniere")} onclick={closeMobileMenu}>Bannière</a>
      <a href="/admin/contenu" class:active={isActive("/admin/contenu")} onclick={closeMobileMenu}>Contenu du site</a>
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}><ExternalLink size={16} /> Voir le site public</a>
      <button type="button" onclick={logout}>Deconnexion</button>
    {:else}
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}>{i18n.dict.nav.metiers}</a>
      <a href="/prestataires" class:active={isActive("/prestataires")} onclick={closeMobileMenu}>{i18n.dict.nav.prestataires}</a>
      <a href="/blog" class:active={isActive("/blog")} onclick={closeMobileMenu}>{i18n.dict.nav.blog}</a>
      <a href="/a-propos" class:active={isActive("/a-propos")} onclick={closeMobileMenu}>{i18n.dict.nav.aPropos}</a>
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
        <a href="/dashboard" class:active={isActive("/dashboard")} onclick={closeMobileMenu}>{i18n.dict.nav.monEspace}</a>
        <a href="/messagerie" class:active={isActive("/messagerie")} onclick={closeMobileMenu}>{i18n.dict.nav.messagerie}{#if notifications.count > 0} ({notifications.count}){/if}</a>
      {:else if auth.role === "client"}
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
        <a href="/client/messagerie" class:active={isActive("/client/messagerie")} onclick={closeMobileMenu}>Mes demandes{#if notifications.count > 0} ({notifications.count}){/if}</a>
      {:else}
        <a href="/login" class:active={isActive("/login")} onclick={closeMobileMenu}>{i18n.dict.nav.connexion}</a>
        <a class="mobile-menu-cta" href="/register" onclick={closeMobileMenu}>{i18n.dict.nav.inscription}</a>
      {/if}
      <div class="mobile-menu-lang">
        <LanguageSwitcher />
      </div>
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

{#if isAdminPanel}
  <div class="admin-root-content">
    {@render children()}
  </div>
{:else}
  <main class="public-main" class:app-page={isChatPage}>
    {@render children()}
  </main>
{/if}

{#if !hideFooter}
  <Footer />
{/if}

<Snackbar />
