<script lang="ts" generics="Row">
  import type { Snippet } from "svelte";
  import type { Column } from "./table";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Inbox from "@lucide/svelte/icons/inbox";

  /**
   * Tableau de reference du panneau admin : a utiliser pour toute liste (en-tete fixe, lignes survolables, squelette de
   * chargement, etat vide, pagination serveur, defilement horizontal sur petit ecran).
   *
   * Chaque colonne donne soit `key` (champ de la ligne affiche tel quel), soit `cell` (snippet pour un rendu libre).
   * `actions` est une colonne finale alignee a droite (boutons par ligne). Type `Column` : voir ./table.ts.
   */
  let {
    columns,
    rows,
    rowKey,
    loading = false,
    page = 1,
    pageSize = 20,
    total = 0,
    itemLabel = "éléments",
    emptyTitle = "Aucun résultat",
    emptyText = "",
    onpage,
    onrowclick,
    actions,
    actionsLabel = "Actions",
    actionsWidth = "11rem",
    cellOf,
  }: {
    columns: Column<Row>[];
    rows: Row[];
    rowKey: (row: Row) => string | number;
    loading?: boolean;
    page?: number;
    pageSize?: number;
    total?: number;
    itemLabel?: string;
    emptyTitle?: string;
    emptyText?: string;
    onpage?: (page: number) => void;
    onrowclick?: (row: Row) => void;
    actions?: Snippet<[Row]>;
    actionsLabel?: string;
    actionsWidth?: string;
    /** Rendu commun des colonnes sans `cell` propre (tableaux generes a partir d'une description : voir la page generique). */
    cellOf?: Snippet<[Row, Column<Row>]>;
  } = $props();

  let pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  let from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
  let to = $derived(Math.min(total, page * pageSize));
  // Numeros affiches : premiere, derniere et fenetre autour de la page courante, avec "…" entre les trous.
  let numbers = $derived.by(() => {
    const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
    const sorted = [...keep].sort((a, b) => a - b);
    const out: (number | "gap")[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
      out.push(n);
    });
    return out;
  });
  const value = (row: Row, key: string) => (row as Record<string, unknown>)[key] as string | number | null | undefined;
  const clickable = $derived(!!onrowclick);
</script>

<div class="dt" class:loading>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          {#each columns as c (c.key)}
            <th class:hide={c.hideOnSmall} style:width={c.width} style:text-align={c.align ?? "left"} scope="col">{c.label}</th>
          {/each}
          {#if actions}<th class="act" style:width={actionsWidth} scope="col">{actionsLabel}</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#if loading && rows.length === 0}
          {#each Array(6) as _, i (i)}
            <tr class="sk">
              {#each columns as c (c.key)}<td class:hide={c.hideOnSmall}><span class="bar"></span></td>{/each}
              {#if actions}<td><span class="bar short"></span></td>{/if}
            </tr>
          {/each}
        {:else}
          {#each rows as row (rowKey(row))}
            <tr class:clickable onclick={() => onrowclick?.(row)}>
              {#each columns as c (c.key)}
                <td class:hide={c.hideOnSmall} style:text-align={c.align ?? "left"}>
                  {#if c.cell}{@render c.cell(row)}{:else if cellOf}{@render cellOf(row, c)}{:else}{value(row, c.key) ?? "—"}{/if}
                </td>
              {/each}
              {#if actions}
                <td class="act" onclick={(e) => e.stopPropagation()}>
                  <div class="acts">{@render actions(row)}</div>
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
    {#if !loading && rows.length === 0}
      <div class="empty">
        <Inbox size={28} />
        <strong>{emptyTitle}</strong>
        {#if emptyText}<span>{emptyText}</span>{/if}
      </div>
    {/if}
  </div>

  {#if total > 0}
    <div class="foot">
      <span class="count">{from}–{to} sur {total.toLocaleString("fr-FR")} {itemLabel}</span>
      {#if pages > 1}
        <nav class="pager" aria-label="Pagination">
          <button type="button" onclick={() => onpage?.(page - 1)} disabled={page <= 1 || loading} aria-label="Page précédente"><ChevronLeft size={15} /></button>
          {#each numbers as n}
            {#if n === "gap"}<span class="gap">…</span>{:else}
              <button type="button" class:cur={n === page} aria-current={n === page ? "page" : undefined} onclick={() => onpage?.(n)} disabled={loading}>{n}</button>
            {/if}
          {/each}
          <button type="button" onclick={() => onpage?.(page + 1)} disabled={page >= pages || loading} aria-label="Page suivante"><ChevronRight size={15} /></button>
        </nav>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dt {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(15, 23, 32, 0.04);
  }
  .scroll {
    overflow-x: auto;
    transition: opacity 0.15s;
  }
  .dt.loading .scroll {
    opacity: 0.6;
  }
  table {
    width: 100%;
    min-width: 46rem;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.88rem;
  }
  thead th {
    position: sticky;
    top: 0;
    padding: 0.7rem 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  tbody td {
    padding: 0.8rem 1rem;
    border-bottom: 1px solid #f1f2f4;
    color: #1f2937;
    vertical-align: middle;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  tbody tr:nth-child(even):not(.sk) td {
    background: #fcfcfd;
  }
  tbody tr.clickable {
    cursor: pointer;
  }
  tbody tr:not(.sk):hover td {
    background: #f3f7ff;
  }
  .act {
    text-align: right;
    white-space: nowrap;
  }
  .acts {
    display: inline-flex;
    gap: 0.4rem;
    justify-content: flex-end;
  }
  .bar {
    display: block;
    height: 0.8rem;
    width: 80%;
    border-radius: 6px;
    background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%);
    background-size: 200% 100%;
    animation: sh 1.2s linear infinite;
  }
  .bar.short {
    width: 50%;
    margin-left: auto;
  }
  @keyframes sh {
    to {
      background-position: -200% 0;
    }
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 3rem 1rem;
    color: #9ca3af;
    text-align: center;
  }
  .empty strong {
    color: #4b5563;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.7rem 1rem;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    font-size: 0.8rem;
    color: #6b7280;
  }
  .pager {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .pager button {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .pager button:hover:not(:disabled):not(.cur) {
    background: #f3f4f6;
  }
  .pager button.cur {
    background: #111827;
    border-color: #111827;
    color: #fff;
  }
  .pager button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .gap {
    padding: 0 0.2rem;
  }
  @media (max-width: 900px) {
    .hide {
      display: none;
    }
  }
</style>
