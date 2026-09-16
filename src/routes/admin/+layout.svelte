<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { auth } from "$lib/stores/auth.svelte";

  let { children } = $props();

  $effect(() => {
    if (auth.role !== "admin" && $page.url.pathname !== "/admin/login") {
      goto("/admin/login");
    }
  });
</script>

{@render children()}
