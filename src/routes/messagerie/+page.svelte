<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { me } from "$lib/api/auth";
  import { myConversations, getMessages, sendMessage } from "$lib/api/matching";
  import { getContactMessages, myContactRequestsAsPrestataire, sendContactMessage } from "$lib/api/contactRequests";
  import type { Conversation, ContactMessage, ContactRequestPrestataire, Message } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import Send from "@lucide/svelte/icons/send";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import Clock from "@lucide/svelte/icons/clock";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Loader from "$lib/components/Loader.svelte";

  type Selection = { kind: "conversation"; userId: number } | { kind: "contact-request"; requestId: number } | null;

  let conversations = $state<Conversation[]>([]);
  let contactRequests = $state<ContactRequestPrestataire[]>([]);
  let messages = $state<Message[]>([]);
  let contactMessages = $state<ContactMessage[]>([]);
  let selection = $state<Selection>(null);
  let newMessage = $state("");
  let loading = $state(true);
  let messagesLoading = $state(false);
  let sending = $state(false);
  let currentUserId = $state<number | null>(null);

  $effect(() => {
    if (auth.role !== "apprenant") {
      goto("/login");
    }
  });

  onMount(async () => {
    loadAll();
    try {
      const profile = await me();
      currentUserId = profile.id;
    } catch {
      // silently fail - le fil de discussion reste utilisable sans le
      // marquage sent/received tant que le profil n'est pas charge
    }
  });

  async function loadAll() {
    loading = true;
    try {
      const [convs, requests] = await Promise.all([myConversations(), myContactRequestsAsPrestataire()]);
      conversations = convs;
      contactRequests = requests;
      const urlUserId = $page.url.searchParams.get("user");
      if (urlUserId) {
        await selectConversation(Number(urlUserId));
      }
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  }

  async function selectConversation(userId: number) {
    selection = { kind: "conversation", userId };
    messagesLoading = true;
    try {
      messages = await getMessages(userId);
    } catch {
      messages = [];
    } finally {
      messagesLoading = false;
    }
  }

  async function selectContactRequest(requestId: number) {
    selection = { kind: "contact-request", requestId };
    const req = contactRequests.find((r) => r.id === requestId);
    if (!req || req.status !== "approved") {
      contactMessages = [];
      return;
    }
    messagesLoading = true;
    try {
      contactMessages = await getContactMessages(requestId);
    } catch {
      contactMessages = [];
    } finally {
      messagesLoading = false;
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selection) return;
    sending = true;
    try {
      if (selection.kind === "conversation") {
        await sendMessage({ receiver_id: selection.userId, content: newMessage.trim() });
        newMessage = "";
        await selectConversation(selection.userId);
      } else {
        await sendContactMessage(selection.requestId, newMessage.trim());
        newMessage = "";
        await selectContactRequest(selection.requestId);
      }
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  let selectedContactRequest = $derived.by(() => {
    if (selection === null || selection.kind !== "contact-request") return null;
    const requestId = selection.requestId;
    return contactRequests.find((r) => r.id === requestId) ?? null;
  });

  function isSelectedContactRequest(id: number): boolean {
    return selection !== null && selection.kind === "contact-request" && selection.requestId === id;
  }

  function isSelectedConversation(userId: number): boolean {
    return selection !== null && selection.kind === "conversation" && selection.userId === userId;
  }

  function initials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("");
  }

  function goBack() {
    selection = null;
  }

  let chatHeaderInfo = $derived.by(() => {
    if (selection === null) return null;
    if (selection.kind === "conversation") {
      const userId = selection.userId;
      const conv = conversations.find((c) => c.other_user_id === userId);
      return conv ? { name: conv.other_user_name, subtitle: null as string | null } : null;
    }
    const req = selectedContactRequest;
    if (!req) return null;
    return {
      name: req.client_nom,
      subtitle: req.status === "pending" ? "En attente de validation admin" : null,
    };
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="messaging-layout">
  <!-- Sidebar conversations -->
  <div class="conversations-panel" class:mobile-hide={selection !== null}>
    <div class="panel-header">
      <h2><MessageSquare size={18} /> Messagerie</h2>
    </div>
    <div class="conversations-list">
      {#if loading}
        <Loader size={24} />
      {:else if conversations.length === 0 && contactRequests.length === 0}
        <div class="empty-sm">Aucune conversation.</div>
      {:else}
        {#if contactRequests.length > 0}
          <div class="section-label">Demandes de clients</div>
          {#each contactRequests as req}
            <button
              class="conversation-item"
              class:active={isSelectedContactRequest(req.id)}
              onclick={() => selectContactRequest(req.id)}
            >
              <div class="conv-avatar">{req.client_nom.split(" ").map((n) => n[0]).join("")}</div>
              <div class="conv-info">
                <span class="conv-name">{req.client_nom}</span>
                {#if req.status === "pending"}
                  <span class="conv-preview status-pending"><Clock size={11} />En attente de validation admin</span>
                {:else}
                  <span class="conv-preview">{req.last_message ?? "Conversation ouverte"}</span>
                {/if}
              </div>
              {#if req.unread_count > 0}
                <span class="unread-badge">{req.unread_count}</span>
              {/if}
            </button>
          {/each}
        {/if}

        {#if conversations.length > 0}
          <div class="section-label">Conversations</div>
          {#each conversations as conv}
            <button
              class="conversation-item"
              class:active={isSelectedConversation(conv.other_user_id)}
              onclick={() => selectConversation(conv.other_user_id)}
            >
              <div class="conv-avatar">{conv.other_user_name.split(" ").map((n) => n[0]).join("")}</div>
              <div class="conv-info">
                <span class="conv-name">{conv.other_user_name}</span>
                <span class="conv-preview">{conv.last_message}</span>
              </div>
              {#if conv.unread_count > 0}
                <span class="unread-badge">{conv.unread_count}</span>
              {/if}
            </button>
          {/each}
        {/if}
      {/if}
    </div>
  </div>

  <!-- Chat area -->
  <div class="chat-panel" class:mobile-hide={selection === null}>
    {#if chatHeaderInfo}
      <div class="chat-header">
        <button class="back-btn" onclick={goBack} aria-label="Retour aux conversations">
          <ArrowLeft size={20} />
        </button>
        <div class="chat-header-avatar">{initials(chatHeaderInfo.name)}</div>
        <div class="chat-header-info">
          <span class="chat-header-name">{chatHeaderInfo.name}</span>
          {#if chatHeaderInfo.subtitle}<span class="chat-header-subtitle">{chatHeaderInfo.subtitle}</span>{/if}
        </div>
      </div>
    {/if}
    {#if selection?.kind === "conversation"}
      <div class="chat-messages">
        {#if messagesLoading}
          <Loader label="Chargement des messages..." />
        {:else if messages.length === 0}
          <div class="empty-chat">Envoyez le premier message !</div>
        {:else}
          {#each messages as msg}
            <div class="message-bubble" class:sent={msg.sender_id === currentUserId} class:received={msg.sender_id !== currentUserId}>
              <p>{msg.content}</p>
              <span class="msg-time">{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          {/each}
        {/if}
      </div>
      <form class="chat-input" onsubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input type="text" placeholder="Écrivez votre message..." bind:value={newMessage} onkeydown={handleKeydown} />
        <button type="submit" disabled={!newMessage.trim() || sending}>
          <Send size={18} />
        </button>
      </form>
    {:else if selection?.kind === "contact-request" && selectedContactRequest?.status === "pending"}
      <div class="no-chat-selected">
        <Clock size={48} class="icon-gray" />
        <p><strong>{selectedContactRequest.client_nom}</strong> souhaite vous contacter. La messagerie s'ouvrira dès qu'un administrateur aura validé la demande.</p>
      </div>
    {:else if selection?.kind === "contact-request"}
      <div class="chat-messages">
        {#if messagesLoading}
          <Loader label="Chargement des messages..." />
        {:else if contactMessages.length === 0}
          <div class="empty-chat">Envoyez le premier message !</div>
        {:else}
          {#each contactMessages as msg}
            <div class="message-bubble" class:sent={msg.sender_role === "prestataire"} class:received={msg.sender_role !== "prestataire"}>
              <p>{msg.content}</p>
              <span class="msg-time">{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          {/each}
        {/if}
      </div>
      <form class="chat-input" onsubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input type="text" placeholder="Écrivez votre message..." bind:value={newMessage} onkeydown={handleKeydown} />
        <button type="submit" disabled={!newMessage.trim() || sending}>
          <Send size={18} />
        </button>
      </form>
    {:else}
      <div class="no-chat-selected">
        <MessageSquare size={48} class="icon-gray" />
        <p>Sélectionnez une conversation à gauche.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .messaging-layout { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; height: 100%; background: #fff; overflow: hidden; }

  /* Conversations Panel */
  .conversations-panel { background: #f7f8fa; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; min-height: 0; }
  .panel-header { height: 64px; display: flex; align-items: center; padding: 0 1.25rem; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; box-sizing: border-box; }
  .panel-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 700; margin: 0; }
  .conversations-list { flex: 1; overflow-y: auto; }
  .section-label { padding: 0.75rem 1.25rem 0.35rem; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
  .conversation-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: none; border: none; border-bottom: 1px solid #eef0f2; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.1s; }
  .conversation-item:hover { background: #eef1f3; }
  .conversation-item.active { background: #e6f7e8; }
  .conv-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; flex-shrink: 0; }
  .conv-info { flex: 1; min-width: 0; }
  .conv-name { display: block; font-weight: 700; font-size: 0.85rem; color: #111827; }
  .conv-preview { display: flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .conv-preview.status-pending { color: #d97706; }
  .unread-badge { background: #03a71a; color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px; flex-shrink: 0; }
  .empty-sm { padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.85rem; }

  /* Chat Panel */
  .chat-panel { display: flex; flex-direction: column; min-height: 0; min-width: 0; width: 100%; background: #fbfaf7; }
  .chat-header { width: 100%; box-sizing: border-box; height: 64px; flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem; padding: 0 1.25rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
  .back-btn { display: none; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: 50%; background: none; color: #374151; cursor: pointer; flex-shrink: 0; margin-left: -0.4rem; }
  .back-btn:hover { background: #f3f4f6; }
  .chat-header-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.72rem; flex-shrink: 0; }
  .chat-header-info { display: flex; flex-direction: column; min-width: 0; }
  .chat-header-name { font-weight: 700; font-size: 0.9rem; color: #111827; }
  .chat-header-subtitle { font-size: 0.75rem; color: #d97706; }
  .chat-messages { width: 100%; box-sizing: border-box; flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .message-bubble { max-width: min(65%, 480px); padding: 0.6rem 0.9rem; border-radius: 12px; font-size: 0.88rem; line-height: 1.5; box-shadow: 0 1px 1px rgba(0,0,0,0.04); }
  .message-bubble.sent { align-self: flex-end; background: #03a71a; color: #fff; border-bottom-right-radius: 4px; }
  .message-bubble.received { align-self: flex-start; background: #fff; color: #111827; border-bottom-left-radius: 4px; }
  .message-bubble p { color: inherit; margin: 0; word-break: break-word; }
  .msg-time { display: block; font-size: 0.68rem; opacity: 0.65; margin-top: 0.25rem; text-align: right; }
  .empty-chat { text-align: center; color: #9ca3af; padding: 3rem; font-size: 0.9rem; }
  .chat-input { width: 100%; max-width: none; box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 0.6rem; padding: 0.85rem 1.25rem; border-top: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; }
  .chat-input input { flex: 1 1 auto; min-width: 0; font-family: inherit; font-size: 0.9rem; padding: 0.7rem 1.1rem; border: none; border-radius: 999px; background: #f3f4f6; }
  .chat-input input:focus { outline: none; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.25); }
  .chat-input button { width: 42px; height: 42px; flex-shrink: 0; border: none; border-radius: 50%; background: #03a71a; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .chat-input button:hover:not(:disabled) { background: #028a15; }
  .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
  .no-chat-selected { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; gap: 0.5rem; text-align: center; padding: 2rem; }
  .no-chat-selected :global(.icon-gray) { color: #d1d5db; }
  .no-chat-selected p { font-size: 0.9rem; max-width: 320px; }

  /* Mobile : vue liste OU vue conversation plein ecran, jamais les deux
     (comme WhatsApp mobile). Le panneau affiche depend de la selection
     courante (etat JS), pas seulement de la largeur d'ecran. */
  @media (max-width: 700px) {
    .messaging-layout { grid-template-columns: 1fr; }
    .conversations-panel.mobile-hide { display: none; }
    .chat-panel.mobile-hide { display: none; }
    .back-btn { display: inline-flex; }
  }
</style>
