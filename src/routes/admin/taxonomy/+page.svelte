<script lang="ts">
  import { createCompetence, createMetier, createNiveau, getMetier, listMetiers } from "$lib/api/taxonomy";
  import type { MetierDetail } from "$lib/api/types";

  let metiers = $state<MetierDetail[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let newMetier = $state({ code: "", nom: "", description: "" });
  let newNiveau = $state<Record<number, { numero: number; nom: string; description: string }>>({});
  let newCompetence = $state<Record<number, { code: string; titre: string; description: string }>>({});

  async function refresh() {
    loading = true;
    error = null;
    try {
      const list = await listMetiers();
      metiers = await Promise.all(list.map((m) => getMetier(m.code)));
      for (const m of metiers) {
        if (!(m.id in newNiveau)) newNiveau[m.id] = { numero: 1, nom: "", description: "" };
        for (const n of m.niveaux) {
          if (!(n.id in newCompetence)) newCompetence[n.id] = { code: "", titre: "", description: "" };
        }
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  async function handleCreateMetier(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    try {
      await createMetier({
        code: newMetier.code,
        nom: newMetier.nom,
        description: newMetier.description || undefined,
      });
      newMetier = { code: "", nom: "", description: "" };
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function handleCreateNiveau(metierId: number, event: SubmitEvent) {
    event.preventDefault();
    error = null;
    const form = newNiveau[metierId];
    try {
      await createNiveau(metierId, {
        numero: form.numero,
        nom: form.nom,
        description: form.description || undefined,
      });
      newNiveau[metierId] = { numero: form.numero + 1, nom: "", description: "" };
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function handleCreateCompetence(niveauId: number, event: SubmitEvent) {
    event.preventDefault();
    error = null;
    const form = newCompetence[niveauId];
    try {
      await createCompetence(niveauId, {
        code: form.code,
        titre: form.titre,
        description: form.description || undefined,
      });
      newCompetence[niveauId] = { code: "", titre: "", description: "" };
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<h1>Taxonomie</h1>
<p class="muted">Metiers, niveaux et competences du referentiel Trankyl Academy.</p>

<div class="card section">
  <form onsubmit={handleCreateMetier}>
    <h2>Nouveau metier</h2>
    <div class="field">
      <label for="metier-code">Code</label>
      <input id="metier-code" placeholder="ex: nounou" bind:value={newMetier.code} required />
    </div>
    <div class="field">
      <label for="metier-nom">Nom</label>
      <input id="metier-nom" bind:value={newMetier.nom} required />
    </div>
    <div class="field">
      <label for="metier-desc">Description</label>
      <input id="metier-desc" bind:value={newMetier.description} />
    </div>
    <button class="btn btn-primary" type="submit">Creer le metier</button>
  </form>
</div>

{#if error}<p class="alert alert-error">{error}</p>{/if}

{#if loading}
  <p class="loading">Chargement...</p>
{:else}
  {#each metiers as metier}
    <section class="section">
      <div class="row">
        <h2>{metier.nom}</h2>
        <span class="badge badge-muted">{metier.code}</span>
      </div>

      <div class="stack">
        {#each metier.niveaux as niveau}
          <div class="card">
            <h3>Niveau {niveau.numero} — {niveau.nom}</h3>

            {#if niveau.competences.length > 0}
              <ul class="row section">
                {#each niveau.competences as competence}
                  <li class="badge badge-green">{competence.titre} ({competence.code})</li>
                {/each}
              </ul>
            {:else}
              <p class="muted">Aucune competence pour ce niveau.</p>
            {/if}

            {#if newCompetence[niveau.id]}
              <form onsubmit={(e) => handleCreateCompetence(niveau.id, e)}>
                <div class="field">
                  <label for="competence-code-{niveau.id}">Code competence</label>
                  <input
                    id="competence-code-{niveau.id}"
                    placeholder="ex: nounou_hygiene_base"
                    bind:value={newCompetence[niveau.id].code}
                    required
                  />
                </div>
                <div class="field">
                  <label for="competence-titre-{niveau.id}">Titre</label>
                  <input id="competence-titre-{niveau.id}" bind:value={newCompetence[niveau.id].titre} required />
                </div>
                <div class="field">
                  <label for="competence-desc-{niveau.id}">Description</label>
                  <input id="competence-desc-{niveau.id}" bind:value={newCompetence[niveau.id].description} />
                </div>
                <button class="btn btn-outline btn-sm" type="submit">+ Ajouter la competence</button>
              </form>
            {/if}
          </div>
        {/each}
      </div>

      {#if newNiveau[metier.id]}
        <div class="card section">
          <form onsubmit={(e) => handleCreateNiveau(metier.id, e)}>
            <h3>Ajouter un niveau</h3>
            <div class="field">
              <label for="niveau-numero-{metier.id}">Numero</label>
              <input id="niveau-numero-{metier.id}" type="number" bind:value={newNiveau[metier.id].numero} required />
            </div>
            <div class="field">
              <label for="niveau-nom-{metier.id}">Nom du niveau</label>
              <input
                id="niveau-nom-{metier.id}"
                placeholder="ex: bases"
                bind:value={newNiveau[metier.id].nom}
                required
              />
            </div>
            <div class="field">
              <label for="niveau-desc-{metier.id}">Description</label>
              <input id="niveau-desc-{metier.id}" bind:value={newNiveau[metier.id].description} />
            </div>
            <button class="btn btn-outline btn-sm" type="submit">+ Ajouter le niveau</button>
          </form>
        </div>
      {/if}
    </section>
  {/each}
{/if}
