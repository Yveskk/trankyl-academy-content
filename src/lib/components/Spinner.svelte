<script lang="ts">
  let { size = "1em" }: { size?: string } = $props();
</script>

<span class="spinner" style="width:{size};height:{size};" role="status" aria-label="Chargement"></span>

<style>
  .spinner {
    display: inline-block;
    flex: none;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: -0.15em;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 1.6s;
    }
  }
</style>
