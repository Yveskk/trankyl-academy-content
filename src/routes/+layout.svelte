<script lang="ts">
  import { onMount } from "svelte";
  import Shield from "@lucide/svelte/icons/shield";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import { navigating, page } from "$app/stores";
  import Footer from "$lib/components/Footer.svelte";
  import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
  import Snackbar from "$lib/components/Snackbar.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { notifications } from "$lib/stores/notifications.svelte";
  import "../app.css";

  let { children } = $props();
  let isAdminPanel = $derived($page.url.pathname.startsWith("/admin") && $page.url.pathname !== "/admin/login");
  let isChatPage = $derived(
    $page.url.pathname.startsWith("/messagerie") || $page.url.pathname.startsWith("/prestataires")
  );
  let hideFooter = $derived(isAdminPanel || isChatPage);

  let topbarEl: HTMLElement | undefined = $state();
  let mobileMenuOpen = $state(false);

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
    if (auth.role === "apprenant") {
      notifications.start();
    } else {
      notifications.stop();
    }
  });

  function logout() {
    notifications.stop();
    auth.logout();
    mobileMenuOpen = false;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function isActive(pathname: string, exact = false) {
    const currentPath = $page.url.pathname;
    return exact ? currentPath === pathname : currentPath === pathname || currentPath.startsWith(`${pathname}/`);
  }
</script>

{#if $navigating}
  <div class="nav-progress" aria-hidden="true"></div>
{/if}

<header class="topbar" class:admin-header={isAdminPanel} bind:this={topbarEl}>
  <div class="topbar-inner">
    {#if isAdminPanel}
      <a class="brand admin-brand" href="/admin/dashboard">
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
      </button>
    {:else}
      <a class="brand" href="/">
        <img class="brand-logo" src="/logo.svg" alt="Trankyl" />
        <span>
          Trankyl
          <span class="brand-sub">Academy</span>
        </span>
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
          <button class="btn btn-ghost btn-sm" onclick={logout}>{i18n.dict.nav.deconnexion}</button>
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
      <a href="/admin/contenu" class:active={isActive("/admin/contenu")} onclick={closeMobileMenu}>Contenu du site</a>
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}><ExternalLink size={16} /> Voir le site public</a>
      <button type="button" onclick={logout}>Deconnexion</button>
    {:else}
      <div class="mobile-menu-heading">{i18n.dict.nav.navigation}</div>
      <a href="/" class:active={isActive("/", true)} onclick={closeMobileMenu}>{i18n.dict.nav.metiers}</a>
      <a href="/prestataires" class:active={isActive("/prestataires")} onclick={closeMobileMenu}>{i18n.dict.nav.prestataires}</a>
      <a href="/blog" class:active={isActive("/blog")} onclick={closeMobileMenu}>{i18n.dict.nav.blog}</a>
      <a href="/a-propos" class:active={isActive("/a-propos")} onclick={closeMobileMenu}>{i18n.dict.nav.aPropos}</a>
      {#if auth.role === "apprenant"}
        <a href="/dashboard" class:active={isActive("/dashboard")} onclick={closeMobileMenu}>{i18n.dict.nav.monEspace}</a>
        <a href="/messagerie" class:active={isActive("/messagerie")} onclick={closeMobileMenu}>{i18n.dict.nav.messagerie}{#if notifications.count > 0} ({notifications.count}){/if}</a>
        <button type="button" onclick={logout}>{i18n.dict.nav.deconnexion}</button>
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
