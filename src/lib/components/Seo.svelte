<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_SITE_URL } from "$env/static/public";

  let {
    title,
    description,
    image,
    noindex = false,
    type = "website",
  }: {
    title: string;
    description: string;
    image?: string;
    noindex?: boolean;
    type?: "website" | "article";
  } = $props();

  let fullTitle = $derived(title.includes("Trankyl Academy") ? title : `${title} — Trankyl Academy`);
  let canonical = $derived(`${PUBLIC_SITE_URL}${$page.url.pathname}`);
  let imageUrl = $derived(image ? (image.startsWith("http") ? image : `${PUBLIC_SITE_URL}${image}`) : undefined);
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

  <meta property="og:type" content={type} />
  <meta property="og:site_name" content="Trankyl Academy" />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:locale" content="fr_FR" />
  {#if imageUrl}
    <meta property="og:image" content={imageUrl} />
  {/if}

  <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  {#if imageUrl}
    <meta name="twitter:image" content={imageUrl} />
  {/if}
</svelte:head>
