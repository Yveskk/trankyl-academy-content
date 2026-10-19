<script lang="ts">
  import "$lib/components/provider/work.css";
  import { page } from "$app/stores";
  import ServiceForm from "$lib/components/provider/ServiceForm.svelte";
  import { createVendorService, uploadVendorServiceImage, vendorServiceForm } from "$lib/api/adminVendors";
  import { i18n } from "$lib/stores/locale.svelte";

  const id = Number($page.params.id);
  const api = { load: () => vendorServiceForm(id, i18n.locale), save: (b: Parameters<typeof createVendorService>[1]) => createVendorService(id, b), upload: (f: File) => uploadVendorServiceImage(id, f) };
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Nouveau service</h1><p class="pw-sub">Créé pour le compte du prestataire, dans son pays : visible dès l'enregistrement s'il est coché « visible ».</p></div></div>
  <ServiceForm {api} backHref={`/admin/prestataires/${id}`} />
</div>
