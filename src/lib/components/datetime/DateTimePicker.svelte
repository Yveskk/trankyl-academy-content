<script lang="ts">
  import { i18n } from "$lib/stores/locale.svelte";
  import DatePicker from "./DatePicker.svelte";
  import TimePicker from "./TimePicker.svelte";
  import { todayIso } from "./calendar-utils";

  /** Date + heure (« AAAA-MM-JJTHH:MM »), meme format que le champ natif datetime-local qu'il remplace. */
  let {
    value = $bindable(""),
    min,
    max,
    id,
    disabled = false,
    clearable = true,
    step = 15,
    onchange,
  }: { value?: string; min?: string; max?: string; id?: string; disabled?: boolean; clearable?: boolean; step?: number; onchange?: (value: string) => void } = $props();

  const en = $derived(i18n.locale === "en");
  const date = $derived(value.slice(0, 10));
  const time = $derived(value.length >= 16 ? value.slice(11, 16) : "");

  function setDate(d: string) {
    value = d ? `${d}T${time || "09:00"}` : "";
    onchange?.(value);
  }
  function setTime(t: string) {
    if (!t) return;
    value = `${date || todayIso()}T${t}`;
    onchange?.(value);
  }
</script>

<div class="dt">
  <DatePicker value={date} {min} {max} {id} {disabled} {clearable} onchange={setDate} aria-label={en ? "Date" : "Date"} />
  <TimePicker value={time} {step} {disabled} onchange={setTime} aria-label={en ? "Time" : "Heure"} placeholder="--:--" />
</div>

<style>
  .dt {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 7.2rem;
    gap: 0.5rem;
  }
</style>
