<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import CalendarCheck from "@lucide/svelte/icons/calendar-check";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import LogOut from "@lucide/svelte/icons/log-out";
  import { auth } from "$lib/stores/auth.svelte";
  import { clientAccount } from "$lib/stores/clientAccount.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { notifications } from "$lib/stores/notifications.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let { children }: { children: Snippet } = $props();
  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  const NAV = $derived([
    { href: "/client/compte", exact: true, icon: LayoutDashboard, label: t("Mon compte", "My account") },
    { href: "/client/compte/securite", icon: ShieldCheck, label: t("Sécurité", "Security") },
    { href: "/client/reservations", icon: CalendarCheck, label: t("Mes réservations", "My bookings") },
    { href: "/client/messagerie", icon: MessagesSquare, label: t("Mes demandes", "My requests"), badge: notifications.count },
  ]);
  const active = (n: { href: string; exact?: boolean }) => ($page.url.pathname.replace(/\/+$/, "") === n.href || (!n.exact && $page.url.pathname.startsWith(n.href + "/")));

  const me = $derived(clientAccount.me);
  const initials = $derived(`${me?.firstname?.[0] ?? auth.profile?.firstname?.[0] ?? ""}${me?.lastname?.[0] ?? auth.profile?.lastname?.[0] ?? ""}`.toUpperCase() || "?");

  $effect(() => {
    if (auth.role !== "client") goto(`/client/login?redirect=${encodeURIComponent($page.url.pathname)}`);
  });
  onMount(() => {
    clientAccount.load().catch((e) => snackbar.error((e as Error).message));
  });

  function logout() {
    notifications.stop();
    clientAccount.clear();
    auth.logout();
    goto("/");
  }
</script>

<div class="espace">
  <aside class="side" aria-label={t("Menu de mon espace", "My space menu")}>
    <a class="who" href="/client/compte" title={t("Mon compte", "My account")}>
      <span class="avatar">{#if me?.image}<img src={me.image} alt="" />{:else}{initials}{/if}</span>
      <span class="id">
        <strong>{me ? `${me.firstname} ${me.lastname}` : (auth.profile ? auth.profile.firstname : "…")}</strong>
        <small>{me?.email ?? ""}</small>
      </span>
    </a>
    <nav>
      {#each NAV as n (n.href)}
        {@const Icon = n.icon}
        <a href={n.href} class:on={active(n)} aria-current={active(n) ? "page" : undefined}>
          <Icon size={18} /><span>{n.label}</span>{#if n.badge}<em>{n.badge}</em>{/if}
        </a>
      {/each}
    </nav>
    <button type="button" class="out" onclick={logout}><LogOut size={18} /><span>{t("Se déconnecter", "Sign out")}</span></button>
  </aside>
  <main class="content">{@render children()}</main>
</div>

<style>
  .espace { width: calc(100% - 3rem); max-width: 1760px; margin: 1.5rem auto 4rem; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 1.5rem; align-items: start; }
  .side { position: sticky; top: 5.5rem; display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 0.75rem; background: linear-gradient(180deg, #0a1f10 0%, #04330d 100%); color: #fff; border-radius: 18px; }
  .who { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.5rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.12); text-decoration: none; color: inherit; }
  .avatar { width: 3rem; height: 3rem; border-radius: 50%; background: #ffc72c; color: #04330d; display: grid; place-items: center; font-weight: 800; flex: none; overflow: hidden; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .id { display: flex; flex-direction: column; min-width: 0; }
  .id strong { font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .id small { color: rgba(255, 255, 255, 0.65); font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  nav { display: flex; flex-direction: column; gap: 0.2rem; padding-top: 0.4rem; }
  nav a, .out { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.9rem; border-radius: 10px; color: rgba(255, 255, 255, 0.78); text-decoration: none; font: inherit; font-weight: 600; font-size: 0.9rem; background: none; border: none; cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s; }
  nav a:hover, .out:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  nav a.on { background: rgba(255, 199, 44, 0.16); color: #ffc72c; }
  nav a em { margin-left: auto; font-style: normal; font-size: 0.7rem; font-weight: 800; background: #03a71a; color: #fff; border-radius: 999px; padding: 0.1rem 0.45rem; }
  .out { margin-top: 0.4rem; border-top: 1px solid rgba(255, 255, 255, 0.12); border-radius: 0 0 10px 10px; padding-top: 0.9rem; }
  .content { min-width: 0; }
  @media (max-width: 860px) {
    .espace { grid-template-columns: minmax(0, 1fr); gap: 1rem; }
    .side { position: static; min-width: 0; padding: 0.7rem; border-radius: 14px; }
    .who { padding-bottom: 0.7rem; }
    nav { flex-direction: row; overflow-x: auto; gap: 0.3rem; padding-bottom: 0.2rem; scrollbar-width: none; }
    nav a { white-space: nowrap; padding: 0.55rem 0.8rem; }
    .out { margin-top: 0; border-top: none; padding-top: 0.7rem; }
  }
</style>
