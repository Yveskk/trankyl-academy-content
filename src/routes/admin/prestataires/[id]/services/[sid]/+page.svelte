<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import ServiceForm from "$lib/components/provider/ServiceForm.svelte";
  import { updateVendorService, uploadVendorServiceImage, vendorService, vendorServiceForm } from "$lib/api/adminVendors";
  import type { ServiceDetail, ServiceInput } from "$lib/api/providerServices";
  import { i18n } from "$lib/stores/locale.svelte";

  const id = Number($page.params.id);
  const sid = Number($page.params.sid);
  let service = $state<ServiceDetail | null>(null);
  let error = $state<string | null>(null);
  const api = { load: () => vendorServiceForm(id, i18n.locale), save: (b: ServiceInput) => updateVendorService(id, sid, b), upload: (f: File) => uploadVendorServiceImage(id, f) };

  onMount(async () => {
    try {
      service = await vendorService(id, sid, i18n.locale);
    } catch (e) {
      error = (e as Error).message;
    }
  });
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Modifier le service</h1><p class="pw-sub">Les changements sont visibles immédiatement sur la fiche du prestataire.</p></div></div>
  {#if error}<div class="pw-empty">{error} <a href={`/admin/prestataires/${id}`}>Retour</a></div>
  {:else if !service}<div class="pw-empty">Chargement…</div>
  {:else}{#key service.id}<ServiceForm initial={service} {api} backHref={`/admin/prestataires/${id}`} />{/key}{/if}
</div>
