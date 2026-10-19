<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Award from "@lucide/svelte/icons/award";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Clock from "@lucide/svelte/icons/clock";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Printer from "@lucide/svelte/icons/printer";
  import PlayCircle from "@lucide/svelte/icons/circle-play";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { me } from "$lib/api/auth";
  import { myCertifications } from "$lib/api/certifications";
  import { getModuleQuiz } from "$lib/api/curriculum";
  import { enroll, enrollNiveau, myEnrollments, myNiveauEnrollments } from "$lib/api/enrollments";
  import { submitQuiz } from "$lib/api/quizzes";
  import { getMetier, listMetiers } from "$lib/api/taxonomy";
  import type { Apprenant, Certification, Enrollment, Metier, MetierDetail, ModuleItem, Niveau, NiveauEnrollmentDetail, Quiz, QuizResult } from "$lib/api/types";
  import { localize } from "$lib/i18n/localize";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let { initialTab = "mine", onloaded }: { initialTab?: "mine" | "catalog" | "certs"; onloaded?: (d: { niveaux: NiveauEnrollmentDetail[]; certs: Certification[]; done: number }) => void } = $props();
  let tab = $state<"mine" | "catalog" | "certs">(initialTab);
  let loading = $state(true);
  let profile = $state<Apprenant | null>(null);
  let enrollments = $state<Enrollment[]>([]);
  let niveaux = $state<NiveauEnrollmentDetail[]>([]);
  let certs = $state<Certification[]>([]);
  let metiers = $state<Metier[]>([]);
  let details = $state<Record<string, MetierDetail>>({});
  let openMetier = $state<string | null>(null);
  let busy = $state<number | null>(null);

  onMount(async () => {
    try {
      const [p, e, n, c, m] = await Promise.all([me(), myEnrollments(), myNiveauEnrollments(), myCertifications(), listMetiers()]);
      profile = p;
      enrollments = e;
      niveaux = n;
      certs = c;
      metiers = m.filter((x) => x.is_active);
      onloaded?.({ niveaux: n, certs: c, done: e.filter((x) => x.statut === "termine").length });
      await Promise.all([...new Set(n.map((x) => x.metier_code))].map(loadDetail));
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  async function loadDetail(code: string) {
    if (details[code]) return;
    try {
      details = { ...details, [code]: await getMetier(code) };
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  const doneIds = $derived(new Set(enrollments.filter((e) => e.statut === "termine").map((e) => e.module_id)));
  const startedIds = $derived(new Set(enrollments.map((e) => e.module_id)));
  const enrolledNiveau = $derived(new Set(niveaux.map((n) => n.niveau_id)));
  const modulesOf = (n?: Niveau | null) => (n?.competences ?? []).flatMap((c) => c.modules);
  const niveauOf = (nv: NiveauEnrollmentDetail) => details[nv.metier_code]?.niveaux.find((x) => x.id === nv.niveau_id) ?? null;
  const progress = (n?: Niveau | null) => {
    const mods = modulesOf(n);
    const done = mods.filter((m) => doneIds.has(m.id)).length;
    return { done, total: mods.length, pct: mods.length ? Math.round((100 * done) / mods.length) : 0 };
  };
  const hours = (n?: Niveau | null) => modulesOf(n).reduce((h, m) => h + (m.duree_heures || 0), 0);
  const stat = (m: ModuleItem) => (doneIds.has(m.id) ? "done" : startedIds.has(m.id) ? "going" : "todo");
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

  async function toggleMetier(code: string) {
    openMetier = openMetier === code ? null : code;
    if (openMetier) await loadDetail(code);
  }
  async function join(n: Niveau, code: string) {
    busy = n.id;
    try {
      const e = await enrollNiveau(n.id);
      const meta = metiers.find((m) => m.code === code);
      niveaux = [...niveaux, { ...e, niveau_nom: n.nom, niveau_nom_en: n.nom_en, niveau_numero: n.numero, date_debut: n.date_debut, metier_code: code, metier_nom: meta?.nom ?? code, metier_nom_en: meta?.nom_en ?? null }];
      snackbar.success("Inscription confirmée. Retrouvez la formation dans « Mes formations ».");
      tab = "mine";
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      busy = null;
    }
  }

  // ---------------- module : contenu, inscription, quiz
  let mod = $state<ModuleItem | null>(null);
  let quiz = $state<Quiz | null>(null);
  let answers = $state<Record<number, number>>({});
  let result = $state<QuizResult | null>(null);
  let sending = $state(false);
  const enrollmentOf = $derived(mod ? enrollments.find((e) => e.module_id === mod!.id) ?? null : null);

  async function openModule(m: ModuleItem) {
    mod = m;
    quiz = null;
    answers = {};
    result = null;
    if (m.has_quiz) {
      try {
        quiz = await getModuleQuiz(m.id);
      } catch {
        // quiz indisponible : le contenu reste lisible
      }
    }
  }
  async function startModule() {
    if (!mod) return;
    sending = true;
    try {
      enrollments = [...enrollments, await enroll(mod.id)];
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      sending = false;
    }
  }
  async function send(event: SubmitEvent) {
    event.preventDefault();
    if (!quiz || !mod) return;
    sending = true;
    try {
      result = await submitQuiz(quiz.id, Object.entries(answers).map(([q, c]) => ({ question_id: Number(q), choice_id: c })));
      if (result.reussi) {
        enrollments = enrollments.map((e) => (e.module_id === mod!.id ? { ...e, statut: "termine" } : e));
        certs = await myCertifications().catch(() => certs); // un niveau complété peut délivrer un certificat
      }
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      sending = false;
    }
  }

  // ---------------- certificats
  let cert = $state<Certification | null>(null);
  function certLabel(code: string) {
    const [m, n] = code.split("_niveau_");
    const name = (m ?? code).replace(/_/g, " ");
    return `${name.charAt(0).toUpperCase() + name.slice(1)} — Niveau ${n ?? "?"}`;
  }
</script>

<div class="pw">
  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else}
    <div class="pw-kpis three">
      <div class="pw-kpi"><small>Formations suivies</small><strong>{niveaux.length}</strong></div>
      <div class="pw-kpi"><small>Modules terminés</small><strong>{doneIds.size}</strong></div>
      <div class="pw-kpi"><small>Certificats</small><strong>{certs.length}</strong></div>
    </div>

    <div class="pw-tabs">
      <button class:on={tab === "mine"} onclick={() => (tab = "mine")}>Mes formations <span class="pw-n">{niveaux.length}</span></button>
      <button class:on={tab === "catalog"} onclick={() => (tab = "catalog")}>Catalogue <span class="pw-n">{metiers.length}</span></button>
      <button class:on={tab === "certs"} onclick={() => (tab = "certs")}>Certificats <span class="pw-n">{certs.length}</span></button>
    </div>

    {#if tab === "mine"}
      {#if niveaux.length === 0}
        <div class="pw-box empty"><BookOpen size={30} /><h2>Aucune formation pour le moment</h2><p class="pw-muted">Les formations renforcent votre profil et votre score de confiance. Choisissez-en une dans le catalogue.</p><button class="btn btn-primary" onclick={() => (tab = "catalog")}>Voir le catalogue</button></div>
      {/if}
      {#each niveaux as nv (nv.id)}
        {@const n = niveauOf(nv)}
        {@const p = progress(n)}
        <section class="pw-box">
          <div class="head">
            <div><span class="kick">{localize(nv.metier_nom, nv.metier_nom_en)}</span><h2>Niveau {nv.niveau_numero} — {localize(nv.niveau_nom, nv.niveau_nom_en)}</h2>
              <p class="pw-sm">{nv.date_debut ? `Début : ${date(nv.date_debut)}` : "Date de début à confirmer"}{#if n} · {p.total} module(s) · {hours(n)} h{/if}</p></div>
            <div class="pg"><strong>{p.pct}%</strong><div class="bar"><span style="width:{p.pct}%"></span></div><small>{p.done}/{p.total} terminé(s)</small></div>
          </div>
          {#if !n}<p class="pw-muted">Chargement du programme…</p>{/if}
          {#each n?.competences ?? [] as c (c.id)}
            <div class="comp">
              <h3>{localize(c.titre, c.titre_en)}</h3>
              {#each c.modules as m (m.id)}
                <button class="mod" onclick={() => openModule(m)}>
                  {#if stat(m) === "done"}<CircleCheck size={18} class="ok" />{:else if stat(m) === "going"}<PlayCircle size={18} class="go" />{:else}<span class="ring"></span>{/if}
                  <span class="mt">{localize(m.titre, m.titre_en)}</span>
                  <span class="pw-sm"><Clock size={12} /> {m.duree_heures} h{#if m.has_quiz} · quiz{/if}</span>
                  <span class="pw-badge" class:completed={stat(m) === "done"} class:new={stat(m) === "going"}>{stat(m) === "done" ? "Terminé" : stat(m) === "going" ? "En cours" : "À commencer"}</span>
                </button>
              {/each}
            </div>
          {/each}
        </section>
      {/each}

    {:else if tab === "catalog"}
      <div class="cat">
        {#each metiers as m (m.id)}
          <section class="pw-box">
            <button class="mh" onclick={() => toggleMetier(m.code)} aria-expanded={openMetier === m.code}>
              <span><strong>{localize(m.nom, m.nom_en)}</strong>{#if m.description}<small>{localize(m.description, m.description_en)}</small>{/if}</span>
              <ChevronDown size={18} class={openMetier === m.code ? "up" : ""} />
            </button>
            {#if openMetier === m.code}
              {#if !details[m.code]}<p class="pw-muted">Chargement…</p>{/if}
              {#each details[m.code]?.niveaux ?? [] as n (n.id)}
                <div class="lvl">
                  <div><strong>Niveau {n.numero} — {localize(n.nom, n.nom_en)}</strong>
                    {#if n.description}<p class="pw-sm">{localize(n.description, n.description_en)}</p>{/if}
                    <p class="pw-sm">{modulesOf(n).length} module(s) · {hours(n)} h{n.date_debut ? ` · début le ${date(n.date_debut)}` : ""}</p></div>
                  {#if enrolledNiveau.has(n.id)}<span class="pw-badge completed">Inscrit</span>
                  {:else}<Btn class="btn-primary btn-sm" loading={busy === n.id} onclick={() => join(n, m.code)}>S'inscrire</Btn>{/if}
                </div>
              {/each}
            {/if}
          </section>
        {:else}<div class="pw-empty">Aucune formation disponible.</div>{/each}
      </div>

    {:else}
      {#if certs.length === 0}<div class="pw-box empty"><Award size={30} /><h2>Pas encore de certificat</h2><p class="pw-muted">Terminez tous les modules d'un niveau pour obtenir votre certificat.</p></div>{/if}
      <div class="certs">
        {#each certs as c (c.id)}
          <button class="cc" onclick={() => (cert = c)}><Award size={22} /><span><strong>{certLabel(c.code)}</strong><small>Obtenu le {date(c.delivree_at)}</small></span><em>Voir</em></button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<Modal open={!!mod} title={mod ? localize(mod.titre, mod.titre_en) : ""} subtitle={mod ? `${mod.duree_heures} h${mod.has_quiz ? " · avec quiz" : ""}` : ""} width="40rem" onclose={() => (mod = null)}>
  {#if mod}
    {#if mod.contenu}<p class="body">{localize(mod.contenu, mod.contenu_en)}</p>{:else}<p class="pw-muted">Le contenu de ce module sera bientôt disponible.</p>{/if}
    <div class="act">
      {#if !enrollmentOf}
        <Btn class="btn-primary" loading={sending} onclick={startModule}>Commencer ce module</Btn>
      {:else if enrollmentOf.statut === "termine"}
        <span class="pw-badge completed"><CircleCheck size={12} /> Module terminé</span>
      {:else if quiz}
        <h3>{quiz.titre} <small>(réussite à {quiz.seuil_reussite_pct}%)</small></h3>
        <form onsubmit={send}>
          {#each quiz.questions as q (q.id)}
            <fieldset><legend>{q.texte}</legend>
              {#each q.choix as ch (ch.id)}<label class="opt"><input type="radio" name={`q-${q.id}`} value={ch.id} onchange={() => (answers[q.id] = ch.id)} /> {ch.texte}</label>{/each}
            </fieldset>
          {/each}
          <Btn type="submit" class="btn-primary" loading={sending} disabled={Object.keys(answers).length < quiz.questions.length}>Valider le quiz</Btn>
        </form>
        {#if result}<p class="res" class:ok={result.reussi}>Score : {result.score_pct}% — {result.reussi ? "Réussi !" : "Insuffisant, réessayez."}</p>{/if}
      {:else if mod.has_quiz}<p class="pw-muted">Chargement du quiz…</p>
      {:else}<p class="pw-muted">Ce module n'a pas de quiz : il se valide automatiquement avec votre équipe pédagogique.</p>{/if}
    </div>
  {/if}
</Modal>

<Modal open={!!cert} title="Certificat" width="44rem" onclose={() => (cert = null)}>
  {#if cert && profile}
    <div class="cert-print">
      <div class="cf"><p class="k">Trankyl Académie</p><h2>Certificat de compétence</h2><p>Décerné à</p><p class="nm">{profile.firstname} {profile.lastname}</p>
        <p>pour avoir validé la formation</p><p class="tt">{certLabel(cert.code)}</p><p class="mt2">Délivré le {date(cert.delivree_at)} · Référence {cert.code} · v{cert.taxonomy_version}</p></div>
    </div>
    <div class="act"><button class="btn btn-outline btn-sm" onclick={() => window.print()}><Printer size={15} /> Imprimer / enregistrer en PDF</button></div>
  {/if}
</Modal>

<style>
  .pw-kpis.three { grid-template-columns: repeat(3, 1fr); }
  .empty { align-items: center; text-align: center; padding: 2.5rem; color: #6b7280; } .empty h2 { color: #1d2230; }
  .head { display: flex; justify-content: space-between; gap: 1.2rem; flex-wrap: wrap; } .head h2 { margin: 0.15rem 0; } .head p { margin: 0; }
  .kick { font-size: 0.72rem; font-weight: 800; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; }
  .pg { min-width: 11rem; display: flex; flex-direction: column; gap: 0.25rem; } .pg strong { font-size: 1.4rem; } .pg small { color: #6b7280; }
  .bar { height: 8px; border-radius: 99px; background: #e5e7eb; overflow: hidden; } .bar span { display: block; height: 100%; background: #0f7d41; border-radius: 99px; transition: width 0.4s; }
  .comp h3 { margin: 0.4rem 0; font-size: 0.92rem; color: #374151; }
  .mod { display: grid; grid-template-columns: 1.4rem 1fr auto auto; gap: 0.7rem; align-items: center; width: 100%; text-align: left; padding: 0.6rem 0.8rem; margin-bottom: 0.3rem; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; font: inherit; cursor: pointer; }
  .mod:hover { border-color: #9ca3af; background: #f9fafb; } .mt { font-weight: 600; } .ring { width: 1rem; height: 1rem; border: 2px solid #c4c8d0; border-radius: 50%; }
  :global(.ok) { color: #0f7d41; } :global(.go) { color: #2563eb; } .mod .pw-sm { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
  .cat { display: flex; flex-direction: column; gap: 0.6rem; } .mh { display: flex; justify-content: space-between; align-items: center; gap: 1rem; width: 100%; background: none; border: none; font: inherit; text-align: left; cursor: pointer; padding: 0; }
  .mh span { display: flex; flex-direction: column; } .mh small { color: #6b7280; font-weight: 400; } :global(.up) { transform: rotate(180deg); }
  .lvl { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.7rem 0; border-top: 1px solid #f1f2f5; } .lvl p { margin: 0.15rem 0 0; }
  .certs { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 0.8rem; }
  .cc { display: flex; align-items: center; gap: 0.9rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem; font: inherit; text-align: left; cursor: pointer; color: #b7791f; } .cc:hover { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08); }
  .cc span { display: flex; flex-direction: column; flex: 1; color: #1d2230; } .cc small { color: #6b7280; } .cc em { font-style: normal; font-weight: 700; color: #0f7d41; font-size: 0.85rem; }
  .body { white-space: pre-line; line-height: 1.6; color: #374151; } .act { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.8rem; align-items: flex-start; }
  fieldset { border: 1px solid #e5e7eb; border-radius: 10px; margin: 0 0 0.7rem; padding: 0.7rem 0.9rem; } legend { font-weight: 700; padding: 0 0.3rem; } .opt { display: flex; gap: 0.5rem; align-items: center; padding: 0.2rem 0; font-weight: 500; }
  .res { margin: 0; padding: 0.6rem 0.9rem; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: 700; } .res.ok { background: #d7f3df; color: #1c6b3b; }
  .cert-print { padding: 0.5rem; } .cf { border: 3px double #b7791f; border-radius: 6px; padding: 2rem 1.5rem; text-align: center; background: linear-gradient(135deg, #fffdf5, #fff7df); }
  .cf .k { letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.75rem; color: #6b7280; } .cf h2 { font-family: Georgia, serif; font-size: 1.8rem; margin: 0.4rem 0 1rem; color: #1d2230; }
  .cf .nm { font-family: Georgia, serif; font-size: 1.7rem; font-weight: 700; margin: 0.2rem 0; } .cf .tt { font-size: 1.2rem; font-weight: 800; color: #0f7d41; margin: 0.3rem 0 1rem; } .cf .mt2 { font-size: 0.78rem; color: #6b7280; }
  @media (max-width: 720px) { .mod { grid-template-columns: 1.4rem 1fr; } .mod .pw-sm, .mod .pw-badge { grid-column: 2; } .pw-kpis.three { gap: 0.5rem; } }
  @media print {
    :global(body *) { visibility: hidden; }
    :global(.cert-print), :global(.cert-print *) { visibility: visible; }
    :global(.cert-print) { position: fixed; inset: 0; padding: 2cm; }
  }
</style>
