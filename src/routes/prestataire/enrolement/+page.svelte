<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Check from "@lucide/svelte/icons/check";
  import User from "@lucide/svelte/icons/user";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import PenLine from "@lucide/svelte/icons/pen-line";
  import Clock from "@lucide/svelte/icons/clock";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { getEnrollment, getOnboarding, saveEnrollment, submitEnrollment, type Enrollment, type MissingItem } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import FileDrop from "$lib/components/provider/FileDrop.svelte";
  import SignaturePad from "$lib/components/provider/SignaturePad.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  type Single = "id_file" | "id_file_verso" | "rc_file" | "casier_file";
  type Multi = "diploma_files" | "cv_files" | "cef_files";

  const SECTORS = [["btp", "BTP / Construction"], ["transport", "Transport / Livraison"], ["maison", "Maison / Ménage"], ["jardinage", "Jardinage / Paysagisme"], ["informatique", "Informatique / Tech"], ["beaute", "Beauté / Bien-être"], ["sante", "Santé / Médical"], ["education", "Éducation / Formation"], ["restauration", "Restauration / Alimentation"], ["autre", "Autre"]];
  const FORMS = [["auto_entrepreneur", "Auto-entrepreneur"], ["micro_entreprise", "Micro-entreprise"], ["sarl", "SARL"], ["sa", "SA"], ["sas", "SAS / SASU"], ["ei", "Entreprise individuelle"], ["autre", "Autre"]];
  const LEVELS = [["aucun", "Aucune scolarité"], ["primaire", "Primaire"], ["college", "Collège / BEPC"], ["lycee", "Lycée / BAC"], ["bts", "BTS / DUT"], ["licence", "Licence (Bac+3)"], ["master", "Master (Bac+5)"], ["doctorat", "Doctorat"], ["formation", "Formation professionnelle"], ["autre", "Autre"]];
  const LANGS = ["Français", "Anglais", "Portugais", "Langue locale", "Autre"];
  const IDS: { v: string; label: string; verso: boolean }[] = [
    { v: "CNI", label: "Carte nationale d'identité", verso: true },
    { v: "CARTE_ELECTEUR", label: "Carte d'électeur", verso: true },
    { v: "PERMIS", label: "Permis de conduire", verso: true },
    { v: "PASSEPORT", label: "Passeport", verso: false },
  ];
  const STEPS = ["Profil professionnel", "Pièces et justificatifs", "Récapitulatif et signature"];

  let loading = $state(true);
  let step = $state(0);
  let saving = $state(false);
  let en = $state<Enrollment | null>(null);
  let contractText = $state("");
  let missing = $state<MissingItem[]>([]);

  // étape 1
  let isCompany = $state(false);
  let companyName = $state("");
  let companySector = $state("");
  let companyType = $state("");
  let studyLevel = $state("");
  let languages = $state<string[]>([]);
  let customLanguage = $state("");
  // étape 2
  let idType = $state("");
  let idNumber = $state("");
  let files = $state<Record<Single, File | null>>({ id_file: null, id_file_verso: null, rc_file: null, casier_file: null });
  let cleared = $state<Set<Single>>(new Set());
  let keep = $state<Record<Multi, string[]>>({ diploma_files: [], cv_files: [], cef_files: [] });
  let added = $state<Record<Multi, File[]>>({ diploma_files: [], cv_files: [], cef_files: [] });
  let toggles = $state<Record<string, boolean>>({ casier: false, diploma: false, cv: false, cef: false });
  // étape 3
  let signature = $state("");
  let contractOpen = $state(false);
  let contractAgree = $state(false);
  let draftSignature = $state("");
  let submitError = $state<MissingItem[]>([]);

  const status = $derived(en?.status ?? "none");
  const locked = $derived(status === "pending" || status === "approved");
  const needsVerso = $derived(IDS.find((i) => i.v === idType)?.verso ?? false);
  const url = (k: Single) => (cleared.has(k) ? "" : ((en?.[k] as string) ?? ""));
  const hasFile = (k: Single) => !!files[k] || !!url(k);

  function hydrate(e: Enrollment | null) {
    en = e;
    if (!e) return;
    isCompany = !!e.if_company;
    companyName = e.company_name;
    companySector = e.company_sector;
    companyType = e.company_type;
    studyLevel = e.study_level;
    languages = e.languages ? e.languages.split(",").map((x) => x.trim()).filter(Boolean) : [];
    customLanguage = e.custom_language;
    idType = e.id_type;
    idNumber = e.id_number;
    files = { id_file: null, id_file_verso: null, rc_file: null, casier_file: null };
    cleared = new Set();
    keep = { diploma_files: [...e.diploma_files], cv_files: [...e.cv_files], cef_files: [...e.cef_files] };
    added = { diploma_files: [], cv_files: [], cef_files: [] };
    toggles = { casier: !!e.casier_file || toggles.casier, diploma: e.diploma_files.length > 0 || toggles.diploma, cv: e.cv_files.length > 0 || toggles.cv, cef: e.cef_files.length > 0 || toggles.cef };
    signature = e.signature ?? "";
  }

  onMount(async () => {
    try {
      const st = await providerSpace.load(true);
      if (st && !st.profile.complete) {
        snackbar.error("Complétez d'abord votre profil.");
        await goto("/prestataire/profil", { replaceState: true });
        return;
      }
      const r = await getEnrollment();
      contractText = r.contract_text ?? "";
      missing = r.missing;
      hydrate(r.enrollment);
      if (r.enrollment && r.enrollment.status !== "draft" && r.enrollment.status !== "rejected") step = 2;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  function toggleLang(l: string) {
    languages = languages.includes(l) ? languages.filter((x) => x !== l) : [...languages, l];
  }
  function chooseKind(company: boolean) {
    isCompany = company;
    if (!company) {
      companyName = companySector = companyType = "";
    }
  }
  function pickSingle(k: Single, f: File) {
    files[k] = f;
    cleared.delete(k);
    cleared = new Set(cleared);
  }
  function clearSingle(k: Single) {
    files[k] = null;
    if (en?.[k]) cleared = new Set(cleared).add(k);
  }
  function addMulti(k: Multi, f: File) {
    if (keep[k].length + added[k].length >= 3) return void snackbar.error("3 fichiers maximum par rubrique.");
    added[k] = [...added[k], f];
  }

  function buildFd(): FormData {
    const fd = new FormData();
    fd.set("is_professional", isCompany ? "1" : "0");
    fd.set("is_expert", "0");
    fd.set("if_company", isCompany ? "1" : "0");
    fd.set("company_name", companyName.trim());
    fd.set("company_sector", companySector);
    fd.set("company_type", companyType);
    fd.set("study_level", studyLevel);
    fd.set("languages", languages.join(", "));
    fd.set("custom_language", languages.includes("Autre") ? customLanguage.trim() : "");
    fd.set("id_type", idType);
    fd.set("id_number", idNumber.trim());
    (Object.keys(files) as Single[]).forEach((k) => {
      if (files[k]) fd.append(k, files[k]!, files[k]!.name);
    });
    fd.set("clear", JSON.stringify([...cleared]));
    (Object.keys(keep) as Multi[]).forEach((k) => {
      fd.set(`keep_${k}`, JSON.stringify(keep[k]));
      added[k].forEach((f) => fd.append(k, f, f.name));
    });
    if (signature && signature !== en?.signature) fd.set("signature", signature);
    return fd;
  }

  async function persist(silent = true): Promise<boolean> {
    saving = true;
    try {
      const r = await saveEnrollment(buildFd());
      missing = r.missing;
      hydrate(r.enrollment);
      return true;
    } catch (e) {
      snackbar.error((e as Error).message);
      return false;
    } finally {
      saving = false;
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (isCompany && (!companyName.trim() || !companySector || !companyType)) return "Renseignez le nom, le secteur et la forme juridique de votre entreprise.";
      if (!studyLevel) return "Choisissez votre niveau d'études.";
      if (!languages.length) return "Choisissez au moins une langue.";
      if (languages.includes("Autre") && !customLanguage.trim()) return "Précisez l'autre langue.";
    }
    if (step === 1) {
      if (!idType) return "Choisissez le type de pièce d'identité.";
      if (!hasFile("id_file")) return "Ajoutez le recto de votre pièce d'identité.";
      if (needsVerso && !hasFile("id_file_verso")) return "Ajoutez le verso de votre pièce d'identité.";
      if (isCompany && !hasFile("rc_file")) return "Le registre de commerce est obligatoire pour une entreprise.";
    }
    return null;
  }

  async function next() {
    const err = validateStep();
    if (err) return void snackbar.error(err);
    if (!locked && !(await persist())) return;
    step += 1;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    step -= 1;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openContract() {
    draftSignature = signature;
    contractAgree = false;
    contractOpen = true;
  }
  function validateContract() {
    if (!contractAgree) return void snackbar.error("Cochez la case pour accepter le contrat.");
    if (!draftSignature) return void snackbar.error("Signez dans la zone prévue.");
    signature = draftSignature;
    contractOpen = false;
  }

  const clientMissing = $derived.by(() => {
    const m: string[] = [];
    if (!studyLevel) m.push("Niveau d'études");
    if (!languages.length) m.push("Langues");
    if (isCompany && (!companyName.trim() || !companySector || !companyType)) m.push("Informations de l'entreprise");
    if (!idType) m.push("Type de pièce");
    if (!hasFile("id_file")) m.push("Pièce d'identité (recto)");
    if (needsVerso && !hasFile("id_file_verso")) m.push("Pièce d'identité (verso)");
    if (isCompany && !hasFile("rc_file")) m.push("Registre de Commerce");
    if (!signature) m.push("Signature du contrat");
    return m;
  });

  async function submit() {
    if (clientMissing.length) return void snackbar.error("Il manque : " + clientMissing.join(", "));
    submitError = [];
    if (!(await persist())) return;
    saving = true;
    try {
      const st = await submitEnrollment();
      providerSpace.set(await getOnboarding().catch(() => st));
      snackbar.success("Dossier envoyé ! Notre équipe l'examine et vous prévient par e-mail.");
      await goto("/prestataire");
    } catch (e) {
      const err = e as { data?: { missing?: MissingItem[] }; message: string };
      if (err.data?.missing) submitError = err.data.missing;
      snackbar.error(err.message);
    } finally {
      saving = false;
    }
  }

  const label = (list: string[][], v: string) => list.find((x) => x[0] === v)?.[1] ?? "—";
  const stepLabel = $derived(`ÉTAPE ${step + 1} SUR 3`);
</script>

<div class="en">
  <p class="ey">{locked ? "MON DOSSIER" : "FORMULAIRE D'ENRÔLEMENT"} · {stepLabel}</p>

  {#if loading}
    <p class="muted">Chargement…</p>
  {:else}
    {#if status === "pending"}
      <div class="ban info"><Clock size={17} /><div><strong>Dossier en cours d'examen.</strong> Notre équipe vérifie vos informations. Vous recevrez un e-mail dès la décision ; le formulaire est verrouillé en attendant.</div></div>
    {:else if status === "approved"}
      <div class="ban ok"><ShieldCheck size={17} /><div><strong>Dossier approuvé.</strong>{#if en?.admin_note} Message de l'équipe : {en.admin_note}{/if}</div></div>
    {:else if status === "rejected"}
      <div class="ban bad"><CircleAlert size={17} /><div><strong>Dossier refusé.</strong> {en?.admin_note ?? ""} Corrigez les éléments signalés puis renvoyez votre dossier.</div></div>
    {/if}

    <div class="tabs" aria-label="Étapes">
      {#each STEPS as s, i (s)}
        <button type="button" class:on={i === step} class:done={i < step} onclick={() => i <= step && (step = i)} disabled={i > step}><span>{#if i < step}<Check size={12} />{:else}{i + 1}{/if}</span>{s}</button>
      {/each}
    </div>

    <h1>{STEPS[step]}</h1>

    {#if step === 0}
      <p class="lead">Dites-nous qui vous êtes et ce que vous savez faire. Ces informations restent privées et servent à valider votre dossier.</p>
      <div class="sec">
        <p class="q">Quel est votre profil ?</p>
        <div class="kinds">
          <button type="button" class:sel={!isCompany} disabled={locked} onclick={() => chooseKind(false)}><span class="ic"><User size={18} /></span><div><b>Particulier</b><small>Indépendant ponctuel</small></div>{#if !isCompany}<i><Check size={12} /></i>{/if}</button>
          <button type="button" class:sel={isCompany} disabled={locked} onclick={() => chooseKind(true)}><span class="ic"><Briefcase size={18} /></span><div><b>Entreprise</b><small>Activité déclarée</small></div>{#if isCompany}<i><Check size={12} /></i>{/if}</button>
        </div>
      </div>
      {#if isCompany}
        <div class="sec">
          <div class="field"><label for="cn">Nom de l'entreprise *</label><input id="cn" bind:value={companyName} maxlength="190" disabled={locked} /></div>
          <p class="q">Secteur d'activité *</p>
          <div class="chips">{#each SECTORS as [v, l] (v)}<button type="button" class:on={companySector === v} disabled={locked} onclick={() => (companySector = v)}>{l}</button>{/each}</div>
          <div class="field"><label for="ct">Forme juridique *</label><select id="ct" bind:value={companyType} disabled={locked}><option value="">Choisissez…</option>{#each FORMS as [v, l] (v)}<option value={v}>{l}</option>{/each}</select></div>
        </div>
      {/if}
      <div class="sec">
        <p class="q">Votre niveau d'études *</p>
        <div class="chips">{#each LEVELS as [v, l] (v)}<button type="button" class:on={studyLevel === v} disabled={locked} onclick={() => (studyLevel = v)}>{l}</button>{/each}</div>
      </div>
      <div class="sec">
        <p class="q">Langues parlées *</p>
        <div class="chips">{#each LANGS as l (l)}<button type="button" class:on={languages.includes(l)} disabled={locked} onclick={() => toggleLang(l)}>{#if languages.includes(l)}<Check size={13} />{/if} {l}</button>{/each}</div>
        {#if languages.includes("Autre")}<div class="field"><label for="cl">Précisez la langue</label><input id="cl" bind:value={customLanguage} maxlength="190" disabled={locked} /></div>{/if}
      </div>
    {:else if step === 1}
      <p class="lead">Ces documents servent à vérifier votre identité. Une photo nette, bien éclairée, sans reflet. Formats : JPG, PNG, WebP ou PDF · 5 Mo maximum.</p>
      <div class="sec">
        <div class="field"><label for="it">Type de pièce *</label><select id="it" bind:value={idType} disabled={locked}><option value="">Choisissez…</option>{#each IDS as i (i.v)}<option value={i.v}>{i.label}</option>{/each}</select></div>
        <div class="field"><label for="in">Numéro de la pièce</label><input id="in" bind:value={idNumber} maxlength="60" disabled={locked} /></div>
        <div class="drops">
          <FileDrop label="Recto" required hint="Photo nette de la face avant." url={url("id_file")} file={files.id_file} disabled={locked} onpick={(f) => pickSingle("id_file", f)} onclear={() => clearSingle("id_file")} />
          {#if needsVerso}
            <FileDrop label="Verso" required hint="Photo nette de la face arrière." url={url("id_file_verso")} file={files.id_file_verso} disabled={locked} onpick={(f) => pickSingle("id_file_verso", f)} onclear={() => clearSingle("id_file_verso")} />
          {/if}
        </div>
      </div>
      {#if isCompany}
        <div class="sec">
          <p class="q">Documents de l'entreprise</p>
          <div class="drops">
            <FileDrop label="Registre de commerce / Kbis" required hint="Obligatoire pour les entreprises." url={url("rc_file")} file={files.rc_file} disabled={locked} camera={false} onpick={(f) => pickSingle("rc_file", f)} onclear={() => clearSingle("rc_file")} />
          </div>
          <label class="chk"><input type="checkbox" bind:checked={toggles.cef} disabled={locked} /> J'ai des cartes CEF à ajouter</label>
          {#if toggles.cef}
            <div class="drops">
              {#each keep.cef_files as u, i (u)}<FileDrop label={`Carte CEF ${i + 1}`} url={u} disabled={locked} onpick={() => {}} onclear={() => (keep.cef_files = keep.cef_files.filter((x) => x !== u))} />{/each}
              {#each added.cef_files as f, i (f)}<FileDrop label={`Nouvelle carte CEF ${i + 1}`} file={f} disabled={locked} onpick={() => {}} onclear={() => (added.cef_files = added.cef_files.filter((x) => x !== f))} />{/each}
              {#if !locked && keep.cef_files.length + added.cef_files.length < 3}<FileDrop label="Ajouter une carte CEF" hint="3 fichiers maximum." onpick={(f) => addMulti("cef_files", f)} onclear={() => {}} />{/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="sec">
          <p class="q">Diplômes et CV <small>(facultatif)</small></p>
          <label class="chk"><input type="checkbox" bind:checked={toggles.diploma} disabled={locked} /> J'ai des diplômes / certifications</label>
          {#if toggles.diploma}
            <div class="drops">
              {#each keep.diploma_files as u, i (u)}<FileDrop label={`Diplôme ${i + 1}`} url={u} disabled={locked} onpick={() => {}} onclear={() => (keep.diploma_files = keep.diploma_files.filter((x) => x !== u))} />{/each}
              {#each added.diploma_files as f, i (f)}<FileDrop label={`Nouveau diplôme ${i + 1}`} file={f} disabled={locked} onpick={() => {}} onclear={() => (added.diploma_files = added.diploma_files.filter((x) => x !== f))} />{/each}
              {#if !locked && keep.diploma_files.length + added.diploma_files.length < 3}<FileDrop label="Ajouter un diplôme" hint="3 fichiers maximum." onpick={(f) => addMulti("diploma_files", f)} onclear={() => {}} />{/if}
            </div>
          {/if}
          <label class="chk"><input type="checkbox" bind:checked={toggles.cv} disabled={locked} /> J'ai un CV</label>
          {#if toggles.cv}
            <div class="drops">
              {#each keep.cv_files as u, i (u)}<FileDrop label={`CV ${i + 1}`} url={u} disabled={locked} camera={false} onpick={() => {}} onclear={() => (keep.cv_files = keep.cv_files.filter((x) => x !== u))} />{/each}
              {#each added.cv_files as f, i (f)}<FileDrop label={`Nouveau CV ${i + 1}`} file={f} disabled={locked} camera={false} onpick={() => {}} onclear={() => (added.cv_files = added.cv_files.filter((x) => x !== f))} />{/each}
              {#if !locked && keep.cv_files.length + added.cv_files.length < 3}<FileDrop label="Ajouter un CV" hint="3 fichiers maximum." camera={false} onpick={(f) => addMulti("cv_files", f)} onclear={() => {}} />{/if}
            </div>
          {/if}
        </div>
      {/if}
      <div class="sec">
        <label class="chk"><input type="checkbox" bind:checked={toggles.casier} disabled={locked} /> J'ai un casier judiciaire (bulletin n°3) à ajouter <small>(facultatif)</small></label>
        {#if toggles.casier}
          <div class="drops"><FileDrop label="Casier judiciaire" hint="Bulletin n°3." url={url("casier_file")} file={files.casier_file} disabled={locked} camera={false} onpick={(f) => pickSingle("casier_file", f)} onclear={() => clearSingle("casier_file")} /></div>
        {/if}
      </div>
    {:else}
      <p class="lead">Vérifiez vos informations, puis signez le contrat de partenariat pour envoyer votre dossier.</p>
      <div class="recap">
        <div><small>Profil</small><b>{isCompany ? `Entreprise · ${companyName || "—"}` : "Particulier"}</b></div>
        {#if isCompany}<div><small>Secteur / forme</small><b>{label(SECTORS, companySector)} · {label(FORMS, companyType)}</b></div>{/if}
        <div><small>Niveau d'études</small><b>{label(LEVELS, studyLevel)}</b></div>
        <div><small>Langues</small><b>{languages.join(", ") || "—"}{languages.includes("Autre") && customLanguage ? ` (${customLanguage})` : ""}</b></div>
        <div><small>Pièce d'identité</small><b>{IDS.find((i) => i.v === idType)?.label ?? "—"}{hasFile("id_file") ? " · recto ✓" : ""}{needsVerso && hasFile("id_file_verso") ? " · verso ✓" : ""}</b></div>
        {#if isCompany}<div><small>Registre de commerce</small><b>{hasFile("rc_file") ? "Reçu ✓" : "—"}</b></div>{/if}
      </div>

      <div class="sign">
        <div>
          <strong>Contrat de partenariat</strong>
          <p class="muted">Lisez le contrat puis signez. Votre signature fait foi d'acceptation.</p>
        </div>
        {#if signature}<img src={signature} alt="Ma signature" />{/if}
        {#if !locked}<Btn class="btn-outline btn-sm" onclick={openContract}><PenLine size={15} /> {signature ? "Modifier la signature" : "Lire et signer"}</Btn>{/if}
        {#if en?.contract_pdf}<a class="dl" href={en.contract_pdf} target="_blank" rel="noopener noreferrer">Voir le contrat signé</a>{/if}
      </div>

      {#if !locked && clientMissing.length}
        <div class="ban bad"><CircleAlert size={17} /><div><strong>Il manque encore :</strong> {clientMissing.join(" · ")}</div></div>
      {/if}
      {#if submitError.length}
        <div class="ban bad"><CircleAlert size={17} /><div><strong>Le serveur signale :</strong> {submitError.map((m) => m.label).join(" · ")}</div></div>
      {/if}
    {/if}

    <div class="bar">
      <Btn class="btn-outline" onclick={back} disabled={step === 0 || saving}><ArrowLeft size={16} /> Précédent</Btn>
      {#if step < 2}
        <Btn class="btn-primary" onclick={next} loading={saving}>{locked ? "Suivant" : "Enregistrer et continuer"} <ArrowRight size={16} /></Btn>
      {:else if !locked}
        <Btn class="btn-primary" onclick={submit} loading={saving} disabled={clientMissing.length > 0}>Soumettre mon dossier</Btn>
      {:else}
        <Btn class="btn-primary" onclick={() => goto("/prestataire")}>Retour au tableau de bord</Btn>
      {/if}
    </div>
  {/if}
</div>

<Modal open={contractOpen} title="Contrat de partenariat" width="40rem" onclose={() => (contractOpen = false)}>
  <pre class="contract">{contractText}</pre>
  <label class="chk"><input type="checkbox" bind:checked={contractAgree} /> J'ai lu et j'accepte le contrat de partenariat Trankyl.</label>
  <p class="q">Votre signature</p>
  <SignaturePad bind:value={draftSignature} />
  {#snippet footer()}
    <Btn class="btn-outline" onclick={() => (contractOpen = false)}>Annuler</Btn>
    <Btn class="btn-primary" onclick={validateContract}>Valider la signature</Btn>
  {/snippet}
</Modal>

<style>
  .en { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
  .ey { margin: 0; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: #6b7280; }
  h1 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.2rem); color: #1d2230; }
  .lead { margin: 0; color: #6b7280; max-width: 38rem; }
  .muted { margin: 0; color: #6b7280; font-size: 0.85rem; }
  .tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.8rem; border-radius: 99px; border: 1.5px solid #e1e3e8; background: #fff; font: inherit; font-size: 0.8rem; font-weight: 700; color: #6b7280; cursor: pointer; }
  .tabs button span { width: 1.2rem; height: 1.2rem; border-radius: 50%; background: #e8eaee; display: grid; place-items: center; font-size: 0.68rem; }
  .tabs button.on { background: #ffc72c; border-color: #ffc72c; color: #1d2230; }
  .tabs button.on span { background: var(--brand-gray); color: var(--brand-gray-ink); }
  .tabs button.done span { background: #ffc72c; color: #1d2230; }
  .tabs button:disabled { cursor: default; opacity: 0.6; }
  .ban { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.88rem; line-height: 1.4; }
  .ban.info { background: #eaf1fb; color: #1d4a85; }
  .ban.ok { background: #e4f5ea; color: #1c6b3b; }
  .ban.bad { background: #fdeceb; color: #9b1c1c; }
  .sec { display: flex; flex-direction: column; gap: 0.8rem; padding: 1rem 0; border-top: 1px solid #eef0f3; }
  .q { margin: 0; font-weight: 800; font-size: 0.92rem; color: #1d2230; }
  .q small { font-weight: 500; color: #6b7280; }
  .kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
  .kinds button { position: relative; display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.8rem; border-radius: 12px; border: 1.5px solid #e1e3e8; background: #fff; font: inherit; cursor: pointer; }
  .kinds button.sel { border-color: #1c8f4a; background: #eaf6ee; }
  .kinds .ic { width: 2.1rem; height: 2.1rem; border-radius: 9px; display: grid; place-items: center; background: #f1f2f5; }
  .kinds .sel .ic { background: #ffc72c; }
  .kinds b { display: block; font-size: 0.9rem; }
  .kinds small { color: #8b909c; font-size: 0.74rem; }
  .kinds i { position: absolute; top: 0.6rem; right: 0.6rem; width: 1.15rem; height: 1.15rem; border-radius: 50%; background: #1c8f4a; color: #fff; display: grid; place-items: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  .chips button { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.45rem 0.9rem; border-radius: 99px; border: 1.5px solid #d6d9df; background: #fff; font: inherit; font-size: 0.84rem; font-weight: 600; cursor: pointer; }
  .chips button.on { background: #1c8f4a; border-color: #1c8f4a; color: #fff; }
  .kinds button:disabled, .chips button:disabled { cursor: default; }
  .drops { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.8rem; }
  .chk { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; }
  .chk small { color: #6b7280; font-weight: 500; }
  .recap { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 0.7rem; }
  .recap div { background: #f6f7f9; border-radius: 12px; padding: 0.7rem 0.9rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .recap small { color: #6b7280; font-size: 0.74rem; }
  .recap b { font-size: 0.9rem; color: #1d2230; overflow-wrap: anywhere; }
  .sign { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 1rem; border: 1.5px solid #e1e3e8; border-radius: 14px; }
  .sign > div { flex: 1; min-width: 14rem; }
  .sign img { height: 3.2rem; border: 1px solid #e1e3e8; border-radius: 8px; background: #fff; padding: 0.2rem; }
  .dl { font-size: 0.82rem; font-weight: 700; color: #1c8f4a; }
  .bar { display: flex; justify-content: space-between; gap: 0.8rem; padding-top: 1rem; border-top: 1px solid #eef0f3; flex-wrap: wrap; }
  .contract { white-space: pre-wrap; font: inherit; font-size: 0.84rem; line-height: 1.55; background: #f6f7f9; border-radius: 12px; padding: 1rem; max-height: 14rem; overflow: auto; margin: 0 0 0.8rem; }
  @media (max-width: 640px) { .kinds { grid-template-columns: 1fr; } }
</style>
