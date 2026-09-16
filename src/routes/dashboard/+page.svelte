<script lang="ts">
  import Award from "@lucide/svelte/icons/award";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import { goto } from "$app/navigation";
  import { me } from "$lib/api/auth";
  import { myCertifications } from "$lib/api/certifications";
  import { myEnrollments } from "$lib/api/enrollments";
  import type { Apprenant, Certification, Enrollment } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";

  let profile = $state<Apprenant | null>(null);
  let enrollments = $state<Enrollment[]>([]);
  let certifications = $state<Certification[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    if (auth.role !== "apprenant") {
      goto("/login");
      return;
    }
    Promise.all([me(), myEnrollments(), myCertifications()])
      .then(([p, e, c]) => {
        profile = p;
        enrollments = e;
        certifications = c;
      })
      .catch((err) => {
        error = (err as Error).message;
      })
      .finally(() => {
        loading = false;
      });
  });
</script>

<h1>Mon espace</h1>

{#if loading}
  <p class="loading">Chargement...</p>
{:else if error}
  <p class="alert alert-error">{error}</p>
{:else}
  <p class="muted">Bonjour {profile?.firstname} {profile?.lastname}</p>

  <div class="grid-cards section">
    <div class="stat-card row">
      <span class="icon-badge sm"><BookOpen size={18} /></span>
      <div>
        <div class="value">{enrollments.length}</div>
        <div class="muted">Inscription(s)</div>
      </div>
    </div>
    <div class="stat-card row">
      <span class="icon-badge sm"><CircleCheck size={18} /></span>
      <div>
        <div class="value">{enrollments.filter((e) => e.statut === "termine").length}</div>
        <div class="muted">Module(s) termine(s)</div>
      </div>
    </div>
    <div class="stat-card row">
      <span class="icon-badge sm gold"><Award size={18} /></span>
      <div>
        <div class="value">{certifications.length}</div>
        <div class="muted">Certification(s)</div>
      </div>
    </div>
  </div>

  <section class="section">
    <h2>Mes inscriptions</h2>
    {#if enrollments.length === 0}
      <p class="muted">Aucune inscription pour le moment.</p>
    {:else}
      <ul class="stack">
        {#each enrollments as e}
          <li class="card row">
            <span>Module #{e.module_id}</span>
            {#if e.statut === "termine"}
              <span class="badge badge-green"><CircleCheck size={11} />termine</span>
            {:else}
              <span class="badge badge-muted">en cours</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2>Mes certifications</h2>
    {#if certifications.length === 0}
      <p class="muted">Aucune certification obtenue pour le moment.</p>
    {:else}
      <ul class="stack">
        {#each certifications as c}
          <li class="card row" style="cursor:pointer" onclick={() => goto(`/dashboard/certificat/${c.id}`)}>
            <span class="badge badge-gold"><Award size={11} />{c.code}</span>
            <span class="muted">obtenue le {new Date(c.delivree_at).toLocaleDateString("fr-FR")}</span>
            <span class="muted" style="margin-left:auto;font-size:0.78rem;color:#03a71a">Voir le certificat →</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
