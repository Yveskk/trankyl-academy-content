<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    createChatSession,
    listChatSessions,
    getChatSession,
    sendChatMessage,
    deleteChatSession,
    type ChatSession,
    type ChatSessionDetail,
  } from "$lib/api/chat";
  import { auth } from "$lib/stores/auth.svelte";
  import { renderChatMarkdown } from "$lib/utils/chatMarkdown";
  import { i18n } from "$lib/stores/locale.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import User from "@lucide/svelte/icons/user";
  import Send from "@lucide/svelte/icons/send";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import Baby from "@lucide/svelte/icons/baby";
  import House from "@lucide/svelte/icons/house";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import SprayCan from "@lucide/svelte/icons/spray-can";
  import Loader from "@lucide/svelte/icons/loader";
  import Users from "@lucide/svelte/icons/users";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import LogIn from "@lucide/svelte/icons/log-in";

  // Ecran affiche en arrivant sur /prestataires (depuis le menu) : on laisse
  // la personne choisir entre parcourir la liste elle-meme ou discuter avec
  // SITA, plutot que de l'emmener directement dans le chat.
  let mode = $state<"choice" | "chat">("choice");

  let sessions = $state<ChatSession[]>([]);
  let currentSession = $state<ChatSessionDetail | null>(null);
  let input = $state("");
  let loading = $state(false);
  let chatContainer: HTMLDivElement;
  let showSidebar = $state(true);

  const suggestions = [
    { icon: Baby, text: "Je cherche une nounou pour mon enfant", color: "#ecfdf5" },
    { icon: House, text: "J'ai besoin d'une aide à domicile", color: "#eff6ff" },
    { icon: ChefHat, text: "Je veux un cuisinier pour un événement", color: "#fef3c7" },
    { icon: SprayCan, text: "Je cherche un agent d'entretien", color: "#fce7f3" },
  ];

  // Message d'accueil uniquement — une fois la conversation lancee, SITA
  // adapte elle-meme sa langue a celle utilisee par le client (voir le
  // prompt systeme cote backend), independamment de la langue du site.
  let WELCOME = $derived(
    i18n.locale === "en"
      ? `👋 **Welcome! I'm SITA, Trankyl's AI assistant.**

I'm here to help you find the right certified provider. Describe what you need and I'll connect you with the best professionals.

**How can I help you?**`
      : `👋 **Bienvenue ! Je suis SITA, l'assistante IA de Trankyl Academy.**

Je suis là pour vous aider à trouver le bon prestataire certifié. Décrivez-moi votre besoin et je vous mettrai en relation avec les meilleurs professionnels.

**Comment puis-je vous aider ?**`
  );

  onMount(async () => {
    if (auth.role === "client") {
      sessions = await listChatSessions();
    }
  });

  async function startNewSession() {
    if (auth.role !== "client") {
      goto("/client/login");
      return;
    }
    try {
      const s = await createChatSession();
      sessions = [s, ...sessions];
      currentSession = { ...s, messages: [{ id: 0, role: "assistant", content: WELCOME, created_at: new Date().toISOString() }] };
    } catch (e) {
      console.error(e);
    }
  }

  async function selectSession(id: number) {
    try {
      currentSession = await getChatSession(id);
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteSession(id: number, e: Event) {
    e.stopPropagation();
    if (!confirm("Supprimer cette conversation ?")) return;
    try {
      await deleteChatSession(id);
      sessions = sessions.filter((s) => s.id !== id);
      if (currentSession?.id === id) currentSession = null;
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSend(text?: string) {
    const msg = (text || input.trim()).trim();
    if (!msg || loading) return;

    // Auto-create session if none
    if (!currentSession) {
      await startNewSession();
    }
    if (!currentSession) return;

    // Add user message optimistically
    const userMsg = { id: -1, role: "user", content: msg, created_at: new Date().toISOString() };
    currentSession = { ...currentSession, messages: [...currentSession.messages, userMsg] };
    input = "";
    loading = true;
    scrollToBottom();

    try {
      const result = await sendChatMessage(currentSession.id, msg);
      currentSession = {
        ...currentSession,
        messages: [...currentSession.messages, { ...result }],
      };
      // Update session title in sidebar
      const idx = sessions.findIndex((s) => s.id === currentSession!.id);
      if (idx !== -1 && currentSession.messages.length <= 3) {
        sessions = [...sessions.slice(0, idx), { ...sessions[idx], title: msg.slice(0, 80), updated_at: new Date().toISOString() }, ...sessions.slice(idx + 1)];
      }
    } catch (e) {
      currentSession = {
        ...currentSession,
        messages: [...currentSession.messages, { id: -2, role: "assistant", content: `❌ Erreur: ${(e as Error).message}`, created_at: new Date().toISOString() }],
      };
    } finally {
      loading = false;
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const messages = $derived(currentSession?.messages ?? []);
</script>

<Seo
  title="Assistant de mise en relation — Trankyl Academy"
  description="Discutez avec l'assistant Trankyl Academy pour trouver le bon prestataire certifié."
  noindex
/>

{#if mode === "choice"}
  <div class="choice-screen">
    <img src="/sita.png" alt="SITA" class="choice-logo" />
    <h1>{i18n.dict.prestataires.choiceTitle}</h1>
    <p>{i18n.dict.prestataires.choiceSubtitle}</p>
    <div class="choice-cards">
      <a class="choice-card" href="/prestataires/liste">
        <span class="choice-icon list"><Users size={26} /></span>
        <h2>{i18n.dict.prestataires.choiceListTitle}</h2>
        <p>{i18n.dict.prestataires.choiceListText}</p>
        <span class="choice-cta">{i18n.dict.prestataires.choiceListCta} <ArrowRight size={14} /></span>
      </a>
      <button type="button" class="choice-card" onclick={() => (mode = "chat")}>
        <span class="choice-icon ai"><img src="/sita.png" alt="SITA" /></span>
        <h2>{i18n.dict.prestataires.choiceChatTitle}</h2>
        <p>{i18n.dict.prestataires.choiceChatText}</p>
        <span class="choice-cta">{i18n.dict.prestataires.choiceChatCta} <ArrowRight size={14} /></span>
      </button>
    </div>
  </div>
{:else}
  <div class="chat-layout" class:no-sidebar={auth.role !== "client"}>
    <!-- Sidebar -->
    {#if auth.role === "client"}
      <aside class="chat-sidebar" class:collapsed={!showSidebar}>
        <div class="sidebar-header">
          <h2>Conversations</h2>
          <button class="btn-new" onclick={startNewSession}>
            <Plus size={16} /> Nouvelle
          </button>
        </div>
        <div class="sessions-list">
          {#each sessions as s}
            <div
              class="session-item"
              class:active={currentSession?.id === s.id}
              role="button"
              tabindex="0"
              onclick={() => selectSession(s.id)}
              onkeydown={(e) => e.key === 'Enter' && selectSession(s.id)}
            >
              <MessageSquare size={15} class="session-icon" />
              <span class="session-title">{s.title}</span>
              <button class="btn-delete-sm" onclick={(e) => { e.stopPropagation(); handleDeleteSession(s.id, e); }} title="Supprimer">
                <Trash2 size={12} />
              </button>
            </div>
          {/each}
          {#if sessions.length === 0}
            <p class="empty-sessions">Aucune conversation.</p>
          {/if}
        </div>
      </aside>
    {/if}

    <!-- Main Chat -->
    <div class="chat-main">
      <!-- Header -->
      <div class="chat-header">
        <button class="btn-back" onclick={() => (mode = "choice")} aria-label={i18n.dict.prestataires.back}>
          <ArrowLeft size={18} />
        </button>
        <div class="header-info">
          <img src="/sita.png" alt="SITA" class="sparkle" />
          <div>
            <h1>SITA</h1>
          </div>
        </div>
      </div>

      {#if auth.role !== "client"}
        <!-- Connexion requise avant de pouvoir discuter avec SITA -->
        <div class="login-required">
          <img src="/sita.png" alt="SITA" class="login-required-logo" />
          <h2>{i18n.dict.prestataires.loginRequiredTitle}</h2>
          <p>{i18n.dict.prestataires.loginRequiredText}</p>
          <div class="login-required-actions">
            <a class="btn btn-primary" href="/client/login"><LogIn size={16} /> {i18n.dict.prestataires.loginRequiredLogin}</a>
            <a class="btn btn-outline" href="/client/register">{i18n.dict.prestataires.loginRequiredRegister}</a>
          </div>
        </div>
      {:else}
        <!-- Messages -->
        <div class="chat-container" bind:this={chatContainer}>
          {#if messages.length === 0}
            <!-- Welcome + Suggestions -->
            <div class="welcome-state">
              <div class="welcome-icon"><img src="/sita.png" alt="SITA" /></div>
              <h2>Comment puis-je vous aider ?</h2>
              <p>Décrivez votre besoin et je trouverai le bon prestataire pour vous.</p>
              <div class="suggestions-grid">
                {#each suggestions as s}
                  {@const Icon = s.icon}
                  <button class="suggestion-card" style="background: {s.color}" onclick={() => handleSend(s.text)}>
                    <Icon size={20} />
                    <span>{s.text}</span>
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            <div class="messages-wrapper">
              {#each messages as msg}
                <div class="message" class:user={msg.role === "user"} class:assistant={msg.role === "assistant"}>
                  <div class="msg-avatar">
                    {#if msg.role === "assistant"}<img src="/sita.png" alt="SITA" />{:else}<User size={16} />{/if}
                  </div>
                  <div class="msg-bubble">
                    {@html renderChatMarkdown(msg.content)}
                  </div>
                </div>
              {/each}

              {#if loading}
                <div class="message assistant">
                  <div class="msg-avatar"><img src="/sita.png" alt="SITA" /></div>
                  <div class="msg-bubble typing">
                    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Input -->
        <div class="chat-input-bar">
          <div class="input-row">
            <textarea
              placeholder="Décrivez votre besoin..."
              bind:value={input}
              onkeydown={handleKeydown}
              rows="1"
              disabled={loading}
            ></textarea>
            <button class="send-btn" onclick={() => handleSend()} disabled={!input.trim() || loading}>
              {#if loading}<Loader size={18} class="spin" />{:else}<Send size={18} />{/if}
            </button>
          </div>
          <p class="input-hint">Entrée pour envoyer · Boutons cliquables dans les réponses</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Choice screen */
  .choice-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 100%; padding: 3rem 1.25rem; }
  .choice-logo { width: 72px; height: 72px; object-fit: contain; margin-bottom: 1rem; }
  .choice-screen h1 { font-size: clamp(1.4rem, 2.5vw, 1.9rem); font-weight: 800; color: #123b22; margin: 0 0 0.5rem; }
  .choice-screen > p { color: #6b7c70; font-size: 0.95rem; max-width: 480px; margin: 0 0 2rem; }
  .choice-cards { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 1.25rem; max-width: 720px; width: 100%; }
  .choice-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 0.4rem;
    padding: 1.5rem;
    border: 1px solid rgba(10, 60, 30, .1);
    border-radius: 16px;
    background: #fff;
    font-family: inherit;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 4px 16px rgba(10, 50, 20, .04);
    transition: all 0.15s;
  }
  .choice-card:hover { border-color: #03a71a; box-shadow: 0 8px 22px rgba(3, 167, 26, 0.12); transform: translateY(-2px); text-decoration: none; }
  .choice-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px; margin-bottom: 0.4rem; }
  .choice-icon.list { background: #eaf7ed; color: #087b22; }
  .choice-icon.ai { background: #eef7ff; }
  .choice-icon.ai img { width: 32px; height: 32px; object-fit: contain; }
  .choice-card h2 { font-size: 1.02rem; font-weight: 800; color: #123b22; margin: 0; }
  .choice-card > p { font-size: 0.85rem; color: #6b7c70; margin: 0; }
  .choice-cta { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.5rem; font-size: 0.82rem; font-weight: 700; color: #087b22; }

  /* Login required (chat) */
  .login-required { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem 1.25rem; }
  .login-required-logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 1rem; }
  .login-required h2 { font-size: 1.3rem; font-weight: 800; color: #123b22; margin: 0 0 0.5rem; }
  .login-required p { color: #6b7c70; font-size: 0.9rem; max-width: 420px; margin: 0 0 1.5rem; }
  .login-required-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
  .login-required-actions .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.88rem; text-decoration: none; }
  .login-required-actions .btn-primary { background: linear-gradient(135deg, #04330d, #03a71a); color: #fff; }
  .login-required-actions .btn-outline { border: 1.5px solid #b7dec1; color: #087b22; }

  .btn-back { border: none; background: none; color: #6b7280; cursor: pointer; padding: 0.4rem; border-radius: 8px; display: flex; }
  .btn-back:hover { background: #f3f4f6; }

  .chat-layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 100%; width: 100%; background: #f6f8f7; overflow: hidden; }
  .chat-layout.no-sidebar { grid-template-columns: minmax(0, 1fr); }

  /* Sidebar */
  .chat-sidebar { border-right: 1px solid #dfe8e2; background: #fbfcfb; display: flex; flex-direction: column; min-height: 0; }
  .chat-sidebar.collapsed { display: none; }
  .sidebar-header { padding: 1.25rem 1.35rem; border-bottom: 1px solid #e8eee9; display: flex; justify-content: space-between; align-items: center; }
  .sidebar-header h2 { font-size: 0.95rem; font-weight: 800; margin: 0; color: #123b22; }
  .btn-new { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.5rem 0.75rem; border: 1px solid #b7dec1; border-radius: 8px; background: #eaf7ed; color: #087b22; font-family: inherit; font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: background .15s, transform .15s; }
  .btn-new:hover { background: #d5f2d9; }
  .sessions-list { flex: 1; overflow-y: auto; padding: 0.5rem; }
  .session-item { width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border: none; border-radius: 8px; background: none; cursor: pointer; text-align: left; font-family: inherit; font-size: 0.82rem; color: #374151; transition: background 0.1s; }
  .session-item:hover { background: #f3f4f6; }
  .session-item.active { background: #ecfdf5; color: #047857; }
  .session-item :global(.session-icon) { flex-shrink: 0; color: #9ca3af; }
  .session-item.active :global(.session-icon) { color: #03a71a; }
  .session-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .btn-delete-sm { border: none; background: none; color: #d1d5db; cursor: pointer; padding: 0.2rem; border-radius: 4px; opacity: 0; transition: all 0.1s; }
  .session-item:hover .btn-delete-sm { opacity: 1; }
  .btn-delete-sm:hover { color: #dc2626; background: #fef2f2; }
  .empty-sessions { text-align: center; color: #9ca3af; font-size: 0.82rem; padding: 2rem 1rem; }

  /* Main */
  .chat-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #f6f8f7; }
  .chat-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem clamp(1.25rem, 4vw, 4rem); border-bottom: 1px solid #e1e9e3; background: rgba(255, 255, 255, .94); box-shadow: 0 2px 10px rgba(10, 50, 20, .03); }
  .btn-toggle-sidebar { border: none; background: none; color: #6b7280; cursor: pointer; padding: 0.4rem; border-radius: 8px; }
  .btn-toggle-sidebar:hover { background: #f3f4f6; }
  .header-info { display: flex; align-items: center; gap: 0.6rem; flex: 1; }
  .header-info :global(.sparkle) { width: 38px; height: 38px; object-fit: contain; flex-shrink: 0; }
  .header-info h1 { font-size: 1rem; font-weight: 800; margin: 0; color: #123b22; }
  .header-info p { font-size: 0.75rem; color: #6b7c70; margin: 0.15rem 0 0; }
  .header-info::after { content: "En ligne"; display: inline-flex; align-items: center; margin-left: 1rem; padding: .25rem .55rem; border-radius: 999px; background: #eaf7ed; color: #087b22; font-size: .68rem; font-weight: 700; }

  /* Chat Container */
  .chat-container { flex: 1; overflow-y: auto; padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 6vw, 7rem); background: radial-gradient(circle at 50% 0%, #ffffff 0, #f6f8f7 48%); }
  .messages-wrapper { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 1rem; max-width: 880px; margin: 0 auto; width: 100%; }

  /* Welcome */
  .welcome-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%; text-align: center; max-width: 720px; margin: 0 auto; }
  .welcome-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; }
  .welcome-icon img { width: 84px; height: 84px; object-fit: contain; }
  .welcome-state h2 { font-size: clamp(1.5rem, 2.5vw, 2rem); font-weight: 800; color: #123b22; margin: 0 0 0.45rem; }
  .welcome-state > p { color: #6b7c70; font-size: 0.95rem; margin-bottom: 1.75rem; }

  /* Messages */
  .message { display: flex; gap: 0.5rem; max-width: 75%; }
  .message.user { align-self: flex-end; flex-direction: row-reverse; }
  .msg-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .msg-avatar img { width: 32px; height: 32px; object-fit: contain; }
  .message.user .msg-avatar { background: #e5e7eb; color: #374151; }
  .msg-bubble { padding: 0.75rem 0.9rem; border-radius: 12px; font-size: 0.88rem; line-height: 1.6; color: #111827; }
  .message.assistant .msg-bubble { background: #fff; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
  .message.user .msg-bubble { background: #03a71a; color: #fff; border-bottom-right-radius: 4px; }
  .msg-bubble :global(p) { color: inherit; margin: 0 0 0.5rem; }
  .msg-bubble :global(p:last-child) { margin-bottom: 0; }
  .msg-bubble :global(strong) { font-weight: 700; }
  .msg-bubble :global(em) { font-style: italic; color: #6b7280; }
  .message.user .msg-bubble :global(em) { color: rgba(255, 255, 255, 0.85); }

  /* Interactive Buttons */
  .msg-bubble :global(.chat-btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0.4rem 0.3rem 0.4rem 0;
    padding: 0.4rem 0.85rem;
    border: 1.5px solid #03a71a;
    border-radius: 8px;
    background: #ecfdf5;
    color: #047857;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.15s;
    cursor: pointer;
  }
  .msg-bubble :global(.chat-btn):hover {
    background: #03a71a;
    color: #fff;
    text-decoration: none;
  }

  /* Typing */
  .typing { display: flex; gap: 0.25rem; align-items: center; padding: 0.75rem 1rem; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; animation: bounce 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }

  /* Suggestions */
  .suggestions-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 0.75rem; max-width: 680px; width: 100%; }
  .suggestion-card { display: flex; align-items: center; gap: 0.7rem; min-height: 68px; padding: 0.9rem 1rem; border: 1px solid rgba(10, 60, 30, .1); border-radius: 14px; font-family: inherit; font-size: 0.86rem; font-weight: 700; color: #294436; cursor: pointer; text-align: left; transition: all 0.15s; box-shadow: 0 4px 12px rgba(10, 50, 20, .03); }
  .suggestion-card:hover { border-color: #03a71a; box-shadow: 0 4px 12px rgba(3,167,26,0.08); transform: translateY(-1px); }
  .suggestion-card :global(svg) { color: #03a71a; flex-shrink: 0; }

  /* Input */
  .chat-input-bar { padding: 1rem clamp(1rem, 6vw, 7rem) 1.15rem; border-top: 1px solid #e1e9e3; background: #fff; width: 100%; }
  .chat-input-bar .input-row, .chat-input-bar .input-hint { max-width: 880px; margin-left: auto; margin-right: auto; }
  .input-row { display: flex; gap: 0.5rem; align-items: flex-end; padding: 0.4rem 0.4rem 0.4rem 0.85rem; border: 1.5px solid #d1d5db; border-radius: 12px; background: #f9fafb; transition: border-color 0.15s; }
  .input-row:focus-within { border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3,167,26,0.1); }
  textarea { flex: 1; border: none; background: none; font-family: inherit; font-size: 0.88rem; color: #111827; resize: none; min-height: 22px; max-height: 100px; padding: 0.2rem 0; line-height: 1.5; }
  textarea:focus { outline: none; }
  textarea::placeholder { color: #9ca3af; }
  .send-btn { width: 36px; height: 36px; border: none; border-radius: 8px; background: #03a71a; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .send-btn:hover:not(:disabled) { background: #028a15; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .input-hint { text-align: center; font-size: 0.7rem; color: #9ca3af; margin: 0.4rem 0 0; }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media (max-width: 700px) {
    .chat-layout { grid-template-columns: 1fr; }
    .chat-sidebar { display: none; }
    .chat-sidebar.collapsed { display: flex; position: absolute; z-index: 10; width: 280px; height: 100%; }
    .suggestions-grid { grid-template-columns: 1fr; }
    .header-info::after { display: none; }
    .message { max-width: 95%; }
    .choice-cards { grid-template-columns: 1fr; }
  }
</style>
