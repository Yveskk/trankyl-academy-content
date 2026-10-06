<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import Send from "@lucide/svelte/icons/send";
  import { orientationChat } from "$lib/api/orientation";
  import { renderChatMarkdown } from "$lib/utils/chatMarkdown";
  import { i18n } from "$lib/stores/locale.svelte";
  import { login } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";

  interface ChatMsg {
    role: "user" | "assistant";
    content: string;
  }

  // Sauvegarde locale de la conversation (par navigateur, jamais envoyee
  // ailleurs) : la personne peut fermer le widget, recharger la page, elle
  // retrouve sa conversation en cours plutot que de repartir de zero.
  const STORAGE_KEY = "trankyl_orientation_chat";

  function loadStoredMessages(): ChatMsg[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistMessages(msgs: ChatMsg[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {
      // stockage indisponible (navigation privee, quota...) — pas bloquant
    }
  }

  // Message d'accueil uniquement — une fois la conversation lancee, SITA
  // adapte elle-meme sa langue a celle utilisee par la personne (voir le
  // prompt systeme cote backend), independamment de la langue du site.
  let WELCOME = $derived(
    i18n.locale === "en"
      ? `👋 Hi! I'm **SITA**, Trankyl's AI assistant.

Tell me what you enjoy doing or the experience you already have, and I'll guide you to the training that suits you best.`
      : `👋 Bonjour ! Je suis **SITA**, l'assistante IA de Trankyl.

Décrivez-moi ce que vous aimez faire ou l'expérience que vous avez déjà, et je vous orienterai vers la formation qui vous correspond le mieux.`
  );

  let open = $state(false);
  let messages = $state<ChatMsg[]>([]);
  let input = $state("");
  let loading = $state(false);
  let container: HTMLDivElement | undefined = $state();

  // Porte de connexion affichee a la place du champ de saisie quand une
  // action du chat (ex: "Passer le test") demande d'etre connecte en tant
  // qu'apprenant avant de continuer.
  let showLoginGate = $state(false);
  let pendingAction = $state<string | null>(null);
  let loginCountryCode = $state("228");
  let loginPhone = $state("");
  let loginPassword = $state("");
  let loginLoading = $state(false);
  let loginError = $state<string | null>(null);

  function scrollToBottom() {
    setTimeout(() => {
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }

  function toggle() {
    open = !open;
    if (open && messages.length === 0) {
      const stored = loadStoredMessages();
      messages = stored.length > 0 ? stored : [{ role: "assistant", content: WELCOME }];
    }
    if (open) scrollToBottom();
  }

  async function sendMessage(msg: string) {
    if (!msg || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    messages = [...messages, { role: "user", content: msg }];
    persistMessages(messages);
    loading = true;
    scrollToBottom();
    try {
      const { response } = await orientationChat(msg, history);
      messages = [...messages, { role: "assistant", content: response }];
    } catch (e) {
      messages = [...messages, { role: "assistant", content: `❌ ${(e as Error).message}` }];
    } finally {
      persistMessages(messages);
      loading = false;
      scrollToBottom();
    }
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    input = "";
    await sendMessage(msg);
  }

  const START_TEST_MESSAGE = "Je veux passer le test de positionnement.";

  function handleChatAction(action: string) {
    if (action !== "start-test") return;
    if (auth.role === "apprenant") {
      sendMessage(START_TEST_MESSAGE);
    } else {
      pendingAction = action;
      loginError = null;
      showLoginGate = true;
    }
  }

  function handleMessagesClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest("[data-chat-action]") as HTMLElement | null;
    if (!target) return;
    event.preventDefault();
    const action = target.dataset.chatAction;
    if (action) handleChatAction(action);
  }

  async function handleGateLogin(event: SubmitEvent) {
    event.preventDefault();
    loginLoading = true;
    loginError = null;
    try {
      const token = await login(`+${loginCountryCode}${loginPhone}`, loginPassword);
      auth.login(token.access_token, "apprenant");
      showLoginGate = false;
      loginPassword = "";
      const action = pendingAction;
      pendingAction = null;
      if (action === "start-test") {
        await sendMessage(START_TEST_MESSAGE);
      }
    } catch (e) {
      loginError = (e as Error).message;
    } finally {
      loginLoading = false;
    }
  }
</script>

<div class="orientation-widget">
  {#if open}
    <div class="orientation-panel">
      <div class="orientation-header">
        <span class="orientation-header-title"><img src="/sita.png" alt="SITA" class="orientation-logo" /> SITA — Trouvez votre formation</span>
        <button type="button" class="orientation-close" onclick={toggle} aria-label="Fermer">
          <X size={16} />
        </button>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="orientation-messages" bind:this={container} onclick={handleMessagesClick}>
        {#each messages as msg}
          <div class="orientation-msg" class:user={msg.role === "user"}>
            {@html renderChatMarkdown(msg.content)}
          </div>
        {/each}
        {#if loading}
          <div class="orientation-msg typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        {/if}
      </div>

      {#if showLoginGate}
        <form class="orientation-login-gate" onsubmit={handleGateLogin}>
          <p class="orientation-gate-text">Connectez-vous pour passer le test et faire valider vos compétences.</p>
          <PhoneField bind:countryCode={loginCountryCode} bind:phone={loginPhone} label="Téléphone" id="orientation-gate-phone" />
          <div class="field">
            <label for="orientation-gate-password">Mot de passe</label>
            <input id="orientation-gate-password" type="password" bind:value={loginPassword} required />
          </div>
          {#if loginError}<p class="orientation-gate-error">{loginError}</p>{/if}
          <div class="orientation-gate-actions">
            <button type="submit" disabled={loginLoading}>{loginLoading ? "Connexion..." : "Se connecter"}</button>
            <button type="button" class="orientation-gate-cancel" onclick={() => (showLoginGate = false)}>Annuler</button>
          </div>
          <a class="orientation-gate-register" href="/register">Pas encore de compte ? Inscrivez-vous</a>
        </form>
      {:else}
        <form
          class="orientation-input-row"
          onsubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input type="text" placeholder="Décrivez ce que vous aimez faire..." bind:value={input} />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer">
            <Send size={16} />
          </button>
        </form>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    class="orientation-fab"
    class:is-open={open}
    onclick={toggle}
    aria-label={open ? "Fermer l'assistant d'orientation" : "Ouvrir l'assistant d'orientation"}
  >
    {#if open}
      <X size={22} />
    {:else}
      <img src="/sita.png" alt="SITA" class="orientation-fab-logo" />
      <span class="orientation-fab-pulse" aria-hidden="true"></span>
    {/if}
  </button>
</div>

<style>
  .orientation-widget {
    position: fixed;
    right: 1.25rem;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 1.25rem);
    z-index: 400;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .orientation-fab {
    position: relative;
    width: 58px;
    height: 58px;
    border-radius: 999px;
    border: none;
    background: none;
    padding: 0;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    filter: drop-shadow(0 8px 16px rgba(4, 51, 13, 0.35));
    transition: transform 0.15s;
  }

  .orientation-fab.is-open {
    background: linear-gradient(135deg, var(--green-deep), var(--green));
    filter: none;
    box-shadow: 0 8px 20px rgba(4, 51, 13, 0.28);
  }

  .orientation-fab:hover {
    transform: translateY(-2px);
  }

  .orientation-fab-pulse {
    position: absolute;
    inset: -6px;
    border-radius: 999px;
    border: 2px solid var(--gold, #fec600);
    opacity: 0.6;
    animation: orientation-pulse 2.2s ease-out infinite;
  }

  @keyframes orientation-pulse {
    0% {
      transform: scale(0.85);
      opacity: 0.7;
    }
    70% {
      transform: scale(1.25);
      opacity: 0;
    }
    100% {
      transform: scale(1.25);
      opacity: 0;
    }
  }

  .orientation-panel {
    width: min(520px, calc(100vw - 2rem));
    height: min(640px, calc(100vh - 6rem));
    background: var(--surface);
    border-radius: 16px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.22);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: orientation-in 0.18s ease-out;
  }

  @keyframes orientation-in {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .orientation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, var(--green-deep), var(--green-dark));
    color: #fff;
    flex-shrink: 0;
  }

  .orientation-header-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .orientation-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .orientation-fab-logo {
    width: 58px;
    height: 58px;
    object-fit: contain;
  }

  .orientation-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: flex;
    padding: 0.2rem;
  }

  .orientation-close:hover {
    color: #fff;
  }

  .orientation-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .orientation-msg {
    max-width: 88%;
    padding: 0.6rem 0.85rem;
    border-radius: 12px;
    background: #f0f2ef;
    color: var(--ink);
    font-size: 0.85rem;
    line-height: 1.5;
    align-self: flex-start;
  }

  .orientation-msg.user {
    background: var(--green);
    color: #fff;
    align-self: flex-end;
  }

  .orientation-msg :global(.chat-btn) {
    display: inline-block;
    margin: 0.35rem 0.3rem 0 0;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: var(--gold-soft);
    color: var(--gold-ink);
    font-weight: 700;
    font-size: 0.78rem;
    text-decoration: none;
  }

  .orientation-msg :global(.chat-btn):hover {
    background: var(--gold, #fec600);
    color: #1a1a1a;
  }

  .orientation-msg.typing {
    display: flex;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
  }

  .orientation-msg.typing .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--muted);
    animation: orientation-typing 1.2s infinite ease-in-out;
  }

  .orientation-msg.typing .dot:nth-child(2) {
    animation-delay: 0.15s;
  }

  .orientation-msg.typing .dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes orientation-typing {
    0%,
    80%,
    100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    40% {
      opacity: 1;
      transform: translateY(-3px);
    }
  }

  .orientation-input-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    max-width: none;
  }

  .orientation-input-row input {
    flex: 1;
    min-width: 0;
    font-family: inherit;
    font-size: 0.85rem;
    padding: 0.5rem 0.7rem;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
  }

  .orientation-input-row button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: none;
    background: var(--green);
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
  }

  .orientation-input-row button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .orientation-login-gate {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0.75rem;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .orientation-gate-text {
    font-size: 0.82rem;
    color: var(--ink-soft);
    margin: 0;
  }

  .orientation-gate-error {
    font-size: 0.78rem;
    color: #b91c1c;
    margin: 0;
  }

  .orientation-gate-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .orientation-gate-actions button[type="submit"] {
    padding: 0.55rem 1rem;
    border: none;
    border-radius: 10px;
    background: var(--green);
    color: #fff;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .orientation-gate-actions button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .orientation-gate-cancel {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .orientation-gate-register {
    font-size: 0.78rem;
    color: var(--green-dark);
    font-weight: 600;
    text-align: center;
  }

  @media (max-width: 480px) {
    .orientation-widget {
      right: 1rem;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
    }
  }
</style>
