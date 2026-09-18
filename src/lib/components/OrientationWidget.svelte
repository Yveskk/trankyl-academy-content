<script lang="ts">
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import X from "@lucide/svelte/icons/x";
  import Send from "@lucide/svelte/icons/send";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { orientationChat } from "$lib/api/orientation";
  import { renderChatMarkdown } from "$lib/utils/chatMarkdown";

  interface ChatMsg {
    role: "user" | "assistant";
    content: string;
  }

  const WELCOME = `👋 Bonjour ! Je suis **SITA**, l'assistant IA de Trankyl.

Décrivez-moi ce que vous aimez faire ou l'expérience que vous avez déjà, et je vous orienterai vers la formation qui vous correspond le mieux.`;

  let open = $state(false);
  let messages = $state<ChatMsg[]>([]);
  let input = $state("");
  let loading = $state(false);
  let container: HTMLDivElement | undefined = $state();

  function scrollToBottom() {
    setTimeout(() => {
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }

  function toggle() {
    open = !open;
    if (open) {
      if (messages.length === 0) {
        messages = [{ role: "assistant", content: WELCOME }];
      }
      scrollToBottom();
    }
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    messages = [...messages, { role: "user", content: msg }];
    input = "";
    loading = true;
    scrollToBottom();
    try {
      const { response } = await orientationChat(msg, history);
      messages = [...messages, { role: "assistant", content: response }];
    } catch (e) {
      messages = [...messages, { role: "assistant", content: `❌ ${(e as Error).message}` }];
    } finally {
      loading = false;
      scrollToBottom();
    }
  }
</script>

<div class="orientation-widget">
  {#if open}
    <div class="orientation-panel">
      <div class="orientation-header">
        <span class="orientation-header-title"><Sparkles size={15} /> SITA — Trouvez votre formation</span>
        <button type="button" class="orientation-close" onclick={toggle} aria-label="Fermer">
          <X size={16} />
        </button>
      </div>
      <div class="orientation-messages" bind:this={container}>
        {#each messages as msg}
          <div class="orientation-msg" class:user={msg.role === "user"}>
            {@html renderChatMarkdown(msg.content)}
          </div>
        {/each}
        {#if loading}
          <div class="orientation-msg typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        {/if}
      </div>
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
    </div>
  {/if}

  <button
    type="button"
    class="orientation-fab"
    onclick={toggle}
    aria-label={open ? "Fermer l'assistant d'orientation" : "Ouvrir l'assistant d'orientation"}
  >
    {#if open}
      <X size={22} />
    {:else}
      <MessageCircle size={22} />
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
    background: linear-gradient(135deg, var(--green-deep), var(--green));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(4, 51, 13, 0.28);
    transition: transform 0.15s;
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

  @media (max-width: 480px) {
    .orientation-widget {
      right: 1rem;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
    }
  }
</style>
