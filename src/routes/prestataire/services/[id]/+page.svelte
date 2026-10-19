<script lang="ts">
  import "$lib/components/provider/work.css";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ServiceForm from "$lib/components/provider/ServiceForm.svelte";
  import { getMyService, type ServiceDetail } from "$lib/api/providerServices";
  import { i18n } from "$lib/stores/locale.svelte";

  let service = $state<ServiceDetail | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      service = await getMyService(Number($page.params.id), i18n.locale);
    } catch (e) {
      error = (e as Error).message;
    }
  });
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Modifier le service</h1><p class="pw-sub">Les changements sont visibles immédiatement sur votre fiche et dans la recherche.</p></div></div>
  {#if error}<div class="pw-empty">{error} <a href="/prestataire/services">Retour à mes services</a></div>
  {:else if !service}<div class="pw-empty">Chargement…</div>
  {:else}{#key service.id}<ServiceForm initial={service} />{/key}{/if}
</div>
