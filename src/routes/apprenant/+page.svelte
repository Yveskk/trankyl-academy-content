<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Check from "@lucide/svelte/icons/check";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import Award from "@lucide/svelte/icons/award";
  import AcademyHub from "$lib/components/AcademyHub.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { me } from "$lib/api/auth";
  import type { Apprenant, Certification, NiveauEnrollmentDetail } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";

  let profile = $state<Apprenant | null>(null);
  let niveaux = $state<NiveauEnrollmentDetail[]>([]);
  let certs = $state<Certification[]>([]);
  let done = $state(0);

  $effect(() => {
    if (auth.role !== "apprenant") goto("/login", { replaceState: true });
  });
  onMount(async () => {
    try {
      const p = await me();
      // Un prestataire a son propre espace.
      if (p.academy_status === "provider" || p.academy_status === "certified_provider") return void (await goto("/prestataire", { replaceState: true }));
      profile = p;
    } catch {
      // session expiree : la garde ci-dessus renvoie vers la connexion
    }
  });

  const steps = $derived([
    { icon: BookOpen, title: "Choisissez une formation", text: "Parcourez le catalogue et inscrivez-vous à un niveau.", done: niveaux.length > 0 },
    { icon: ClipboardCheck, title: "Suivez les modules", text: "Lisez chaque module et validez les quiz à votre rythme.", done: done > 0 },
    { icon: Award, title: "Obtenez votre certificat", text: "Terminez un niveau : votre certificat est délivré et vérifiable.", done: certs.length > 0 },
  ]);
  const next = $derived(steps.findIndex((s) => !s.done));
</script>

<Seo title="Mon espace apprenant" description="Vos formations, votre progression et vos certificats Trankyl Académie." noindex />

<div class="pw top">
  <header class="hero"><span class="kick">Trankyl Académie</span><h1>Bonjour {profile?.firstname ?? ""}</h1><p>Bienvenue dans votre espace de formation : apprenez, validez vos modules et obtenez vos certificats.</p></header>

  <section class="pw-box path" aria-label="Votre parcours">
    {#each steps as s, i (s.title)}
      {@const Icon = s.icon}
      <div class="st" class:done={s.done} class:now={i === next}>
        <span class="ic">{#if s.done}<Check size={18} />{:else}<Icon size={18} />{/if}</span>
        <div><strong>{i + 1}. {s.title}</strong><p>{s.text}</p></div>
      </div>
    {/each}
  </section>
</div>

<AcademyHub initialTab="mine" onloaded={(d) => { niveaux = d.niveaux; certs = d.certs; done = d.done }} />

<style>
  .hero { background: linear-gradient(135deg, #12924d 0%, #0f7d41 45%, #0a5a2e 100%); color: #fff; border-radius: 20px; padding: 1.6rem 1.8rem; position: relative; overflow: hidden; }
  .hero::after { content: ""; position: absolute; right: -3rem; top: -3rem; width: 14rem; height: 14rem; border-radius: 50%; background: radial-gradient(circle, rgba(255, 199, 44, 0.35), transparent 70%); }
  .hero .kick { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #ffc72c; }
  .pw .hero h1 { color: #fff; margin: 0.3rem 0 0.3rem; } .hero p { margin: 0; max-width: 40rem; color: rgba(255, 255, 255, 0.88); }
  .top { margin-bottom: 1rem; }
  .path { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .st { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.8rem; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; opacity: 0.75; }
  .st.now { border-color: #0f7d41; background: #f3fbf6; opacity: 1; } .st.done { opacity: 1; }
  .ic { flex: none; display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: 10px; background: #e5e7eb; color: #4b5563; }
  .st.now .ic { background: #0f7d41; color: #fff; } .st.done .ic { background: #d7f3df; color: #0f7d41; }
  .st p { margin: 0.2rem 0 0; font-size: 0.84rem; color: #6b7280; }
  @media (max-width: 860px) { .path { grid-template-columns: 1fr; } }
</style>
