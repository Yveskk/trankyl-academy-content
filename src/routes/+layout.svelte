<script lang="ts">
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Footer from "$lib/components/Footer.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import "../app.css";

  let { children } = $props();

  function logout() {
    auth.logout();
  }
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/">
      <span class="brand-mark"><GraduationCap size={19} /></span>
      <span>
        Trankyl
        <span class="brand-sub">Academy</span>
      </span>
    </a>
    <nav>
      <a href="/">Metiers</a>
      <a href="/blog">Blog</a>
      <a href="/faq">FAQ</a>
      <a href="/a-propos">A propos</a>
      <span class="nav-divider"></span>
      {#if auth.role === "apprenant"}
        <a href="/dashboard">Mon espace</a>
        <button class="btn btn-ghost btn-sm" onclick={logout}>Deconnexion</button>
      {:else if auth.role === "admin"}
        <a href="/admin/taxonomy">Taxonomie</a>
        <a href="/admin/curriculum">Curriculum</a>
        <button class="btn btn-ghost btn-sm" onclick={logout}>Deconnexion</button>
      {:else}
        <a href="/login">Connexion</a>
        <a class="btn btn-primary btn-sm" href="/register">Inscription</a>
      {/if}
    </nav>
  </div>
</header>

<main>
  {@render children()}
</main>

<Footer />
