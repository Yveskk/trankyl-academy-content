<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import BackLink from "$lib/components/BackLink.svelte";
  import { onMount } from "svelte";
  import { adminMe } from "$lib/api/auth";
  import { adminCountry } from "$lib/stores/adminCountry.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { ADMIN_GROUPS, ADMIN_ROUTES, firstAllowedPath, requiredFor } from "$lib/utils/adminNav";
  import { backFallback } from "$lib/utils/backTarget";
  import UserCog from "@lucide/svelte/icons/user-cog";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Globe from "@lucide/svelte/icons/globe";
  import Home from "@lucide/svelte/icons/home";
  import Layers from "@lucide/svelte/icons/layers";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Users from "@lucide/svelte/icons/users";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Shield from "@lucide/svelte/icons/shield";
  import LayoutTemplate from "@lucide/svelte/icons/layout-template";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Newspaper from "@lucide/svelte/icons/newspaper";
  import Images from "@lucide/svelte/icons/images";
  import PanelsTopLeft from "@lucide/svelte/icons/panels-top-left";
  import Settings from "@lucide/svelte/icons/settings";
  import Star from "@lucide/svelte/icons/star";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import CalendarCheck from "@lucide/svelte/icons/calendar-check";
  import Wallet from "@lucide/svelte/icons/wallet";
  import FileText from "@lucide/svelte/icons/file-text";
  import Ticket from "@lucide/svelte/icons/ticket";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import MapIcon from "@lucide/svelte/icons/map";
  import Tags from "@lucide/svelte/icons/tags";
  import Ruler from "@lucide/svelte/icons/ruler";
  import Gift from "@lucide/svelte/icons/gift";
  import Bell from "@lucide/svelte/icons/bell";
  import UserX from "@lucide/svelte/icons/user-x";
  import ClipboardList from "@lucide/svelte/icons/clipboard-list";
  import CalendarPlus from "@lucide/svelte/icons/calendar-plus";
  import UserRound from "@lucide/svelte/icons/user-round";
  import Crown from "@lucide/svelte/icons/crown";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";

  let { children } = $props();
  let sidebarOpen = $state(false);

  $effect(() => {
    if (auth.role !== "admin" && $page.url.pathname !== "/admin/login") {
      goto("/admin/login");
    }
  });

  // Ferme le tiroir mobile automatiquement a chaque changement de page.
  $effect(() => {
    $page.url.pathname;
    sidebarOpen = false;
  });

  function handleLogout() {
    auth.logout();
    goto("/admin/login");
  }

  const ICONS: Record<string, any> = {
    "/admin/dashboard": Home,
    "/admin/taxonomy": Layers,
    "/admin/curriculum": BookOpen,
    "/admin/apprenants": Users,
    "/admin/inscriptions": GraduationCap,
    "/admin/paiements": Wallet,
    "/admin/devis": FileText,
    "/admin/contacts": MessagesSquare,
    "/admin/reservations": CalendarCheck,
    "/admin/enrolements": ClipboardCheck,
    "/admin/blog": Newspaper,
    "/admin/accueil": PanelsTopLeft,
    "/admin/avis": Star,
    "/admin/prestataires": BadgeCheck,
    "/admin/affiches": Images,
    "/admin/contenu": LayoutTemplate,
    "/admin/configuration": Settings,
    "/admin/utilisateurs": UserCog,
    "/admin/clients": UserRound,
    "/admin/coupons": Ticket,
    "/admin/pays": MapPin,
    "/admin/villes": MapPin,
    "/admin/quartiers": MapIcon,
    "/admin/categories": Layers,
    "/admin/sous-categories": Tags,
    "/admin/unites": Ruler,
    "/admin/parrainage": Gift,
    "/admin/abonnement": Crown,
    "/admin/notifications": Bell,
    "/admin/suppressions": UserX,
    "/admin/demandes": ClipboardList,
    "/admin/nouvelle-reservation": CalendarPlus,
    "https://contrats.trankyl.com/connexion": ExternalLink,
  };

  // Chacun ne voit que les menus dont son role lui donne l'acces.
  let navItems = $derived(ADMIN_ROUTES.filter((r) => r.external || r.perm.some((p) => auth.can(p))).map((r) => ({ ...r, icon: ICONS[r.href] ?? Settings })));
  // Menu lateral par sections : une section sans aucun menu autorise n'apparait pas.
  let navGroups = $derived(ADMIN_GROUPS.map((g) => ({ name: g, items: navItems.filter((i) => i.group === g) })).filter((g) => g.items.length > 0));

  // Droits et profil : relus a chaque ouverture du panneau (un changement de role se voit sans se reconnecter).
  let profileError = $state(false);
  async function loadMe() {
    try {
      auth.admin = await adminMe();
      adminCountry.ensure(auth.admin.id, auth.admin.countries.map((c) => c.code), auth.admin.default_country);
      profileError = false;
    } catch {
      // 401 : le client API deconnecte deja ; autre erreur (reseau) : on propose de reessayer
      profileError = auth.role === "admin";
    }
  }
  onMount(() => {
    if (auth.role === "admin") loadMe();
  });

  let currentPath = $derived($page.url.pathname);
  // Titre de page : celui du menu correspondant (les anciens menus gardent leur titre propre ci-dessous).
  let routeTitle = $derived(
    [...ADMIN_ROUTES].filter((r) => !r.external).sort((a, b) => b.href.length - a.href.length).find((r) => currentPath === r.href || currentPath.startsWith(r.href + "/"))?.label ?? "Admin",
  );
  let myCountries = $derived(auth.admin?.countries ?? []);

  function switchCountry(code: string) {
    if (code === adminCountry.code) return;
    adminCountry.set(code);
    invalidateAll(); // les donnees de la page sont rechargees pour ce pays
  }
  let needed = $derived(requiredFor(currentPath));
  let allowed = $derived(!needed || needed.some((p) => auth.can(p)));
  // Acces direct a une page interdite : retour vers la premiere page autorisee.
  $effect(() => {
    if (auth.admin && !allowed && currentPath !== "/admin/login") goto(firstAllowedPath((k) => auth.can(k)), { replaceState: true });
  });
  let backTarget = $derived(backFallback($page.url.pathname));
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if auth.role === "admin" && $page.url.pathname !== "/admin/login"}
  <div class="admin-layout">
    {#if sidebarOpen}
      <button class="sidebar-backdrop" type="button" aria-label="Fermer le menu" onclick={() => (sidebarOpen = false)}></button>
    {/if}

    <!-- Sidebar -->
    <aside class="admin-sidebar" class:open={sidebarOpen}>
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <img class="brand-logo" src="/logo-wh.svg" alt="Trankyl" />
          <div>
            <span class="brand-name">Trankyl Academy</span>
            <span class="brand-role">Administration</span>
          </div>
        </div>
        <button class="sidebar-close" type="button" aria-label="Fermer le menu" onclick={() => (sidebarOpen = false)}>
          <X size={20} />
        </button>
      </div>

      <nav class="sidebar-nav">
        {#each navGroups as group (group.name)}
          <p class="nav-group">{group.name}</p>
          {#each group.items as item (item.href)}
            {@const Icon = item.icon}
            {@const active = !item.external && (currentPath === item.href || currentPath.startsWith(item.href + "/"))}
            {#if item.external}
              <a href={item.href} class="sidebar-link" target="_blank" rel="noopener noreferrer">
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            {:else}
              <a href={item.href} class="sidebar-link" class:active>
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            {/if}
          {/each}
        {/each}
      </nav>

      <div class="sidebar-footer">
        {#if auth.admin}
          <a href="/admin/mon-compte" class="account" class:active={currentPath.startsWith("/admin/mon-compte")}>
            <span class="avatar">{(auth.admin.firstname[0] ?? "?").toUpperCase()}</span>
            <span class="who">
              <strong>{auth.admin.firstname} {auth.admin.lastname ?? ""}</strong>
              <small>{auth.admin.is_super ? "Super-administrateur" : (auth.admin.role?.name ?? "")}</small>
            </span>
          </a>
        {/if}
        <button class="sidebar-link logout" onclick={handleLogout}>
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="admin-main">
      <div class="admin-topbar">
        <button class="sidebar-toggle" type="button" aria-label="Ouvrir le menu" onclick={() => (sidebarOpen = true)}>
          <Menu size={22} />
        </button>
        <div class="topbar-main">
          {#if backTarget}<BackLink fallback={backTarget} />{/if}
        <h1 class="page-title">
          {#if currentPath.includes("/dashboard")}Tableau de bord
          {:else if currentPath.includes("/taxonomy")}Taxonomie
          {:else if currentPath.includes("/curriculum")}Curriculum
          {:else if currentPath.includes("/apprenants")}Apprenants
          {:else if currentPath.includes("/inscriptions")}Inscriptions
          {:else if currentPath.includes("/paiements")}Paiements
          {:else if currentPath.includes("/devis")}Devis
          {:else if currentPath.includes("/contacts")}Mises en relation
          {:else if currentPath.includes("/reservations")}Réservations
          {:else if currentPath.includes("/enrolements")}Formulaires d'enrôlement
          {:else if currentPath.includes("/blog")}Blog
          {:else if currentPath.includes("/affiches")}Bannière
          {:else if currentPath.includes("/accueil")}Page d'accueil
          {:else if currentPath.includes("/avis")}Avis
          {:else if currentPath.includes("/prestataires")}Prestataires
          {:else if currentPath.includes("/utilisateurs")}Utilisateurs et rôles
          {:else if currentPath.includes("/mon-compte")}Mon compte
          {:else if currentPath.includes("/contenu")}Contenu du site
          {:else if currentPath.includes("/configuration")}Configuration{currentPath.includes("/pays") ? " · Pays" : ""}
          {:else}{routeTitle}
          {/if}
        </h1>
        </div>
        <div class="topbar-right">
          {#if myCountries.length > 0}
            <label class="country-switch" title="Pays dans lequel vous travaillez : toutes les données affichées et modifiées sont celles de ce pays.">
              <Globe size={14} />
              {#if myCountries.length > 1}
                <select value={adminCountry.code} onchange={(e) => switchCountry(e.currentTarget.value)} aria-label="Pays de travail">
                  {#each myCountries as c}<option value={c.code}>{c.code} · {c.name}</option>{/each}
                </select>
              {:else}
                <span>{myCountries[0].code} · {myCountries[0].name}</span>
              {/if}
            </label>
          {/if}
          <span class="admin-badge"><Shield size={12} /> {auth.admin?.is_super ? "Admin" : (auth.admin?.role?.name ?? "Admin")}</span>
        </div>
      </div>
      <div class="admin-content">
        {#if !auth.admin}
          {#if profileError}
            <div class="gate">
              <p>Impossible de charger votre profil (connexion au serveur).</p>
              <button class="btn btn-primary btn-sm" onclick={loadMe}>Réessayer</button>
            </div>
          {:else}
            <div class="gate"><span class="loading-state">Chargement...</span></div>
          {/if}
        {:else if !allowed}
          <div class="gate"><ShieldCheck size={28} /><p>Vous n'avez pas accès à cette page.</p></div>
        {:else}
          {#key adminCountry.code}{@render children()}{/key}
        {/if}
      </div>
    </main>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  /* ===== Admin Layout ===== */
  .admin-layout {
    display: block;
    min-height: calc(100vh - 72px);
    background: #f5f7f6;
  }

  /* ===== Sidebar ===== */
  .admin-sidebar {
    background: linear-gradient(180deg, #0a1f10 0%, #04330d 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    z-index: 100;
  }

  .sidebar-header {
    flex: none;
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar-close {
    display: none;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .sidebar-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .sidebar-toggle {
    display: none;
    border: none;
    background: none;
    color: #374151;
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 8px;
    margin-right: 0.5rem;
    flex-shrink: 0;
  }

  .sidebar-toggle:hover {
    background: #f3f4f6;
  }

  .sidebar-backdrop {
    display: none;
  }

  .brand-name {
    display: block;
    font-weight: 800;
    font-size: 0.95rem;
    color: #fff;
    line-height: 1.2;
  }

  .brand-role {
    display: block;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Les menus defilent entre l'en-tete et le pied de page, qui restent visibles. */
  .sidebar-nav {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
  }
  .sidebar-nav::-webkit-scrollbar {
    width: 6px;
  }
  .sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.22);
    border-radius: 999px;
  }
  .sidebar-nav::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.38);
  }

  .nav-group {
    flex: none;
    margin: 0.9rem 0.6rem 0.2rem;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.38);
  }
  .nav-group:first-child {
    margin-top: 0.1rem;
  }

  .sidebar-link {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.65);
    font-weight: 600;
    font-size: 0.88rem;
    text-decoration: none;
    transition: all 0.15s;
    border: none;
    background: none;
    width: 100%;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .sidebar-link:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    text-decoration: none;
  }

  .sidebar-link.active {
    background: rgba(3, 167, 26, 0.2);
    color: #3ddc4f;
  }

  .account {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.8rem;
    margin-bottom: 0.3rem;
    border-radius: 12px;
    color: #fff;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.06);
  }
  .account:hover,
  .account.active {
    background: rgba(255, 255, 255, 0.14);
  }
  .avatar {
    flex: none;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--gold, #ffc72c);
    color: #1d2621;
    font-weight: 800;
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .who strong {
    font-size: 0.82rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .who small {
    font-size: 0.7rem;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .country-switch {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--border, #e5e7eb);
    background: #fff;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--green-deep, #04330d);
  }
  .country-switch select {
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    padding: 0.1rem 0;
    cursor: pointer;
    width: auto;
  }
  .gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 3rem 1rem;
    color: var(--muted, #6b7280);
    text-align: center;
  }
  .sidebar-footer {
    flex: none;
    padding: 1rem 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .sidebar-link.logout {
    color: rgba(255, 255, 255, 0.5);
  }

  .sidebar-link.logout:hover {
    background: rgba(220, 38, 38, 0.15);
    color: #fca5a5;
  }

  /* ===== Main ===== */
  .admin-main {
    margin-left: 260px;
    min-height: calc(100vh - 72px);
    display: flex;
    flex-direction: column;
  }

  .admin-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .topbar-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    flex: 1;
  }

  .page-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
  }

  .admin-content {
    flex: 1;
    width: min(100%, 1440px);
    margin: 0 auto;
    padding: 2rem clamp(1.25rem, 3vw, 3rem) 3rem;
  }

  /* ===== Responsive ===== */
  @media (max-width: 900px) {
    .admin-layout {
      grid-template-columns: 1fr;
    }

    .admin-sidebar {
      position: fixed;
      transform: translateX(-100%);
      transition: transform 0.25s;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.3);
    }

    .admin-sidebar.open {
      transform: translateX(0);
    }

    .sidebar-close {
      display: inline-flex;
    }

    .sidebar-toggle {
      display: inline-flex;
    }

    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(4, 51, 13, 0.45);
      border: none;
      z-index: 99;
      padding: 0;
      cursor: pointer;
    }

    .admin-main {
      margin-left: 0;
    }
  }

  @media (max-width: 640px) {
    .admin-content {
      padding: 1.25rem 1rem 2rem;
    }
  }
</style>
