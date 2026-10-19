<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import { getAgenda, getAvailability, saveAvailability, type Slot, type WorkRequest } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  let slots = $state<Slot[]>([]);
  let missions = $state<WorkRequest[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let dirty = $state(false);

  onMount(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      [slots, { items: missions }] = await Promise.all([getAvailability(), getAgenda(today, 30)]);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  const byDay = $derived(DAYS.map((_, d) => slots.map((s, i) => ({ s, i })).filter((x) => x.s.weekday === d)));
  function add(d: number) {
    slots = [...slots, { weekday: d, start_time: "08:00", end_time: "17:00", is_active: true }];
    dirty = true;
  }
  function remove(i: number) {
    slots = slots.filter((_, k) => k !== i);
    dirty = true;
  }
  async function save() {
    saving = true;
    try {
      slots = await saveAvailability(slots);
      dirty = false;
      snackbar.success("Disponibilités enregistrées : vos clients les voient sur votre fiche.");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      saving = false;
    }
  }
  const grouped = $derived(
    Object.entries(missions.reduce<Record<string, WorkRequest[]>>((a, m) => ((a[m.date ?? ""] ??= []).push(m), a), {})).sort(([x], [y]) => x.localeCompare(y)),
  );
  const long = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "—");
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Agenda</h1><p class="pw-sub">Vos horaires de travail (visibles par les clients) et vos missions des 30 prochains jours.</p></div>
    <Btn class="btn-primary" loading={saving} disabled={!dirty} onclick={save}>Enregistrer mes horaires</Btn></div>
  {#if loading}<div class="pw-empty">Chargement…</div>{:else}
    <div class="pw-grid2">
      <section class="pw-box">
        <h2>Mes horaires hebdomadaires</h2>
        {#each DAYS as day, d (d)}
          <div class="day">
            <strong>{day}</strong>
            <div class="slots">
              {#each byDay[d] as { s, i } (i)}
                <div class="slot" class:off={!s.is_active}>
                  <input type="time" bind:value={s.start_time} oninput={() => (dirty = true)} aria-label="Début" /> –
                  <input type="time" bind:value={s.end_time} oninput={() => (dirty = true)} aria-label="Fin" />
                  <label class="sw"><input type="checkbox" bind:checked={s.is_active} onchange={() => (dirty = true)} /> actif</label>
                  <button type="button" class="x" aria-label="Retirer" onclick={() => remove(i)}><Trash2 size={14} /></button>
                </div>
              {:else}<span class="pw-muted">Repos</span>{/each}
              <button type="button" class="add" onclick={() => add(d)}><Plus size={13} /> Ajouter</button>
            </div>
          </div>
        {/each}
      </section>
      <section class="pw-box">
        <h2>Missions à venir</h2>
        {#if grouped.length === 0}<p class="pw-muted">Aucune mission planifiée dans les 30 prochains jours.</p>{/if}
        {#each grouped as [d, list] (d)}
          <div><strong class="cap">{long(d)}</strong>
            {#each list as m (m.id)}<div class="mis"><span class="t">{m.time ?? "—"}</span><div><strong>{m.service ?? "Service"}</strong><span class="pw-sm">{m.client_name ?? "Client"} · {m.address ?? "—"}</span></div><span class="pw-badge {m.status}">{m.status === "pending" ? "En attente" : "Terminée"}</span></div>{/each}
          </div>
        {/each}
      </section>
    </div>
  {/if}
</div>

<style>
  .day { display: grid; grid-template-columns: 6.5rem 1fr; gap: 0.6rem; padding: 0.55rem 0; border-top: 1px solid #f0f1f3; align-items: start; }
  .slots { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-start; }
  .slot { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .slot.off { opacity: 0.55; }
  .slot input[type="time"] { padding: 0.35rem 0.5rem; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; }
  .sw { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; color: #6b7280; }
  .x, .add { display: inline-flex; align-items: center; gap: 0.25rem; background: none; border: none; cursor: pointer; font: inherit; font-size: 0.8rem; font-weight: 700; padding: 0.2rem 0.4rem; border-radius: 6px; }
  .x { color: #b3261e; }
  .add { color: #1c8f4a; }
  .cap { text-transform: capitalize; font-size: 0.88rem; }
  .mis { display: grid; grid-template-columns: 3.2rem 1fr auto; gap: 0.6rem; align-items: center; padding: 0.55rem 0; border-top: 1px solid #f0f1f3; }
  .mis .t { font-weight: 800; color: #1d2230; }
  .mis > div { display: flex; flex-direction: column; min-width: 0; }
</style>
