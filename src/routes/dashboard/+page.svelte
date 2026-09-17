<script lang="ts">
  import Award from "@lucide/svelte/icons/award";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Layers from "@lucide/svelte/icons/layers";
  import Calendar from "@lucide/svelte/icons/calendar";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { me } from "$lib/api/auth";
  import { myCertifications } from "$lib/api/certifications";
  import { myEnrollments, myNiveauEnrollments } from "$lib/api/enrollments";
  import type { Apprenant, Certification, Enrollment, NiveauEnrollmentDetail } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import { localize } from "$lib/i18n/localize";
  import { i18n } from "$lib/stores/locale.svelte";

  let profile = $state<Apprenant | null>(null);
  let enrollments = $state<Enrollment[]>([]);
  let niveauEnrollments = $state<NiveauEnrollmentDetail[]>([]);
  let certifications = $state<Certification[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    if (auth.role !== "apprenant") {
      goto("/login");
    }
  });

  onMount(() => {
    Promise.all([me(), myEnrollments(), myNiveauEnrollments(), myCertifications()])
      .then(([p, e, n, c]) => {
        profile = p;
        enrollments = e;
        niveauEnrollments = n;
        certifications = c;
      })
      .catch((err) => {
        error = (err as Error).message;
      })
      .finally(() => {
        loading = false;
      });
  });

  const dateLocale = { fr: "fr-FR", en: "en-US" } as const;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale[i18n.locale]);
  }
</script>

<h1>{i18n.dict.dashboard.title}</h1>

{#if loading}
  <p class="loading">{i18n.dict.dashboard.loading}</p>
{:else if error}
  <p class="alert alert-error">{error}</p>
{:else}
  <p class="muted">{i18n.dict.dashboard.greeting(profile?.firstname ?? "", profile?.lastname ?? "")}</p>

  <div class="grid-cards section">
    <div class="stat-card row">
      <span class="icon-badge sm"><BookOpen size={18} /></span>
      <div>
        <div class="value">{enrollments.length}</div>
        <div class="muted">{i18n.dict.dashboard.statEnrollments}</div>
      </div>
    </div>
    <div class="stat-card row">
      <span class="icon-badge sm"><CircleCheck size={18} /></span>
      <div>
        <div class="value">{enrollments.filter((e) => e.statut === "termine").length}</div>
        <div class="muted">{i18n.dict.dashboard.statCompleted}</div>
      </div>
    </div>
    <div class="stat-card row">
      <span class="icon-badge sm gold"><Award size={18} /></span>
      <div>
        <div class="value">{certifications.length}</div>
        <div class="muted">{i18n.dict.dashboard.statCertifications}</div>
      </div>
    </div>
  </div>

  <section class="section">
    <h2>{i18n.dict.dashboard.niveauxTitle}</h2>
    {#if niveauEnrollments.length === 0}
      <p class="muted">{i18n.dict.dashboard.noNiveaux}</p>
    {:else}
      <ul class="stack">
        {#each niveauEnrollments as n}
          <li class="card row">
            <span class="icon-badge sm"><Layers size={16} /></span>
            <span>{localize(n.metier_nom, n.metier_nom_en)} — Niveau {n.niveau_numero} ({localize(n.niveau_nom, n.niveau_nom_en)})</span>
            <span class="badge badge-muted" style="margin-left:auto">
              <Calendar size={11} />
              {n.date_debut ? i18n.dict.dashboard.startsOn(formatDate(n.date_debut)) : i18n.dict.dashboard.dateTbd}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2>{i18n.dict.dashboard.enrollmentsTitle}</h2>
    {#if enrollments.length === 0}
      <p class="muted">{i18n.dict.dashboard.noEnrollments}</p>
    {:else}
      <ul class="stack">
        {#each enrollments as e}
          <li class="card row">
            <span>{i18n.dict.dashboard.module(e.module_id)}</span>
            {#if e.statut === "termine"}
              <span class="badge badge-green"><CircleCheck size={11} />{i18n.dict.dashboard.statusDone}</span>
            {:else}
              <span class="badge badge-muted">{i18n.dict.dashboard.statusInProgress}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2>{i18n.dict.dashboard.certificationsTitle}</h2>
    {#if certifications.length === 0}
      <p class="muted">{i18n.dict.dashboard.noCertifications}</p>
    {:else}
      <ul class="stack">
        {#each certifications as c}
          <li class="card row" style="cursor:pointer" onclick={() => goto(`/dashboard/certificat/${c.id}`)}>
            <span class="badge badge-gold"><Award size={11} />{c.code}</span>
            <span class="muted">{i18n.dict.dashboard.obtainedOn(formatDate(c.delivree_at))}</span>
            <span class="muted" style="margin-left:auto;font-size:0.78rem;color:#03a71a">{i18n.dict.dashboard.viewCertificate}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
