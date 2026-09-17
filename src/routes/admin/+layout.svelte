<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { auth } from "$lib/stores/auth.svelte";
  import Home from "@lucide/svelte/icons/home";
  import Layers from "@lucide/svelte/icons/layers";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Users from "@lucide/svelte/icons/users";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Shield from "@lucide/svelte/icons/shield";
  import LayoutTemplate from "@lucide/svelte/icons/layout-template";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Newspaper from "@lucide/svelte/icons/newspaper";
  import Image from "@lucide/svelte/icons/image";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
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

  const navItems = [
    { href: "/admin/dashboard", label: "Tableau de bord", icon: Home },
    { href: "/admin/taxonomy", label: "Taxonomie", icon: Layers },
    { href: "/admin/curriculum", label: "Curriculum", icon: BookOpen },
    { href: "/admin/apprenants", label: "Apprenants", icon: Users },
    { href: "/admin/inscriptions", label: "Inscriptions", icon: GraduationCap },
    { href: "/admin/contacts", label: "Mises en relation", icon: MessagesSquare },
    { href: "/admin/blog", label: "Blog", icon: Newspaper },
    { href: "/admin/banniere", label: "Bannière", icon: Image },
    { href: "/admin/contenu", label: "Contenu du site", icon: LayoutTemplate },
  ];

  let currentPath = $derived($page.url.pathname);
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
        {#each navItems as item}
          {@const Icon = item.icon}
          {@const active = currentPath.startsWith(item.href)}
          <a href={item.href} class="sidebar-link" class:active>
            <Icon size={18} />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>

      <div class="sidebar-footer">
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
        <h1 class="page-title">
          {#if currentPath.includes("/dashboard")}Tableau de bord
          {:else if currentPath.includes("/taxonomy")}Taxonomie
          {:else if currentPath.includes("/curriculum")}Curriculum
          {:else if currentPath.includes("/apprenants")}Apprenants
          {:else if currentPath.includes("/inscriptions")}Inscriptions
          {:else if currentPath.includes("/contacts")}Mises en relation
          {:else if currentPath.includes("/blog")}Blog
          {:else if currentPath.includes("/banniere")}Bannière
          {:else if currentPath.includes("/contenu")}Contenu du site
          {:else}Admin
          {/if}
        </h1>
        <div class="topbar-right">
          <span class="admin-badge"><Shield size={12} /> Admin</span>
        </div>
      </div>
      <div class="admin-content">
        {@render children()}
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

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sidebar-link {
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

  .sidebar-footer {
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
