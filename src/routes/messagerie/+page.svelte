<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { myConversations, getMessages, sendMessage } from "$lib/api/matching";
  import { searchPrestataires } from "$lib/api/matching";
  import type { Conversation, Message } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import Send from "@lucide/svelte/icons/send";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import UserPlus from "@lucide/svelte/icons/user-plus";

  let conversations = $state<Conversation[]>([]);
  let messages = $state<Message[]>([]);
  let selectedUserId = $state<number | null>(null);
  let newMessage = $state("");
  let loading = $state(true);
  let sending = $state(false);

  $effect(() => {
    if (auth.role !== "apprenant") {
      goto("/login");
      return;
    }
    loadConversations();
  });

  async function loadConversations() {
    loading = true;
    try {
      conversations = await myConversations();
      // Auto-select from URL param
      const urlUserId = $page.url.searchParams.get("user");
      if (urlUserId) {
        selectedUserId = Number(urlUserId);
        await loadMessages(selectedUserId);
      }
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  }

  async function loadMessages(userId: number) {
    selectedUserId = userId;
    try {
      messages = await getMessages(userId);
    } catch {
      messages = [];
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedUserId) return;
    sending = true;
    try {
      await sendMessage({ receiver_id: selectedUserId, content: newMessage.trim() });
      newMessage = "";
      await loadMessages(selectedUserId);
      await loadConversations();
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
</script>

<div class="messaging-layout">
  <!-- Sidebar conversations -->
  <div class="conversations-panel">
    <div class="panel-header">
      <h2><MessageSquare size={18} /> Messagerie</h2>
    </div>
    <div class="conversations-list">
      {#if loading}
        <div class="loading-sm">Chargement...</div>
      {:else if conversations.length === 0}
        <div class="empty-sm">Aucune conversation.</div>
      {:else}
        {#each conversations as conv}
          <button
            class="conversation-item"
            class:active={selectedUserId === conv.other_user_id}
            onclick={() => loadMessages(conv.other_user_id)}
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
    </div>
  </div>

  <!-- Chat area -->
  <div class="chat-panel">
    {#if selectedUserId}
      <div class="chat-messages">
        {#if messages.length === 0}
          <div class="empty-chat">Envoyez le premier message !</div>
        {:else}
          {#each messages as msg}
            <div class="message-bubble" class:sent={msg.sender_id === auth.token ? true : false} class:received={msg.sender_id !== null}>
              <p>{msg.content}</p>
              <span class="msg-time">{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          {/each}
        {/if}
      </div>
      <form class="chat-input" onsubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input
          type="text"
          placeholder="Écrivez votre message..."
          bind:value={newMessage}
          onkeydown={handleKeydown}
        />
        <button type="submit" disabled={!newMessage.trim() || sending}>
          <Send size={18} />
        </button>
      </form>
    {:else}
      <div class="no-chat-selected">
        <MessageSquare size={48} class="icon-gray" />
        <p>Sélectionnez une conversation ou contactez un prestataire depuis la page <a href="/prestataires">Recherche</a>.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .messaging-layout { display: grid; grid-template-columns: 320px 1fr; height: 100%; background: #fff; overflow: hidden; }

  /* Conversations Panel */
  .conversations-panel { border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; min-height: 0; }
  .panel-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
  .panel-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 700; margin: 0; }
  .conversations-list { flex: 1; overflow-y: auto; }
  .conversation-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.1s; }
  .conversation-item:hover { background: #f9fafb; }
  .conversation-item.active { background: #ecfdf5; border-left: 3px solid #03a71a; }
  .conv-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.72rem; flex-shrink: 0; }
  .conv-info { flex: 1; min-width: 0; }
  .conv-name { display: block; font-weight: 700; font-size: 0.85rem; color: #111827; }
  .conv-preview { display: block; font-size: 0.78rem; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .unread-badge { background: #03a71a; color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px; flex-shrink: 0; }
  .loading-sm, .empty-sm { padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.85rem; }

  /* Chat Panel */
  .chat-panel { display: flex; flex-direction: column; min-height: 0; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .message-bubble { max-width: 70%; padding: 0.65rem 1rem; border-radius: 12px; font-size: 0.88rem; line-height: 1.5; }
  .message-bubble.sent { align-self: flex-end; background: #03a71a; color: #fff; border-bottom-right-radius: 4px; }
  .message-bubble.received { align-self: flex-start; background: #f3f4f6; color: #111827; border-bottom-left-radius: 4px; }
  .message-bubble p { margin: 0; }
  .msg-time { display: block; font-size: 0.68rem; opacity: 0.6; margin-top: 0.2rem; text-align: right; }
  .empty-chat { text-align: center; color: #9ca3af; padding: 3rem; font-size: 0.9rem; }
  .chat-input { display: flex; gap: 0.5rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }
  .chat-input input { flex: 1; font-family: inherit; font-size: 0.9rem; padding: 0.65rem 1rem; border: 1.5px solid #d1d5db; border-radius: 10px; background: #f9fafb; }
  .chat-input input:focus { outline: none; border-color: #03a71a; }
  .chat-input button { padding: 0.65rem 1rem; border: none; border-radius: 10px; background: #03a71a; color: #fff; cursor: pointer; display: flex; align-items: center; }
  .chat-input button:hover:not(:disabled) { background: #028a15; }
  .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
  .no-chat-selected { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; gap: 0.5rem; }
  .no-chat-selected :global(.icon-gray) { color: #d1d5db; }
  .no-chat-selected p { font-size: 0.9rem; max-width: 300px; text-align: center; }
  .no-chat-selected a { color: #03a71a; }

  @media (max-width: 700px) {
    .messaging-layout { grid-template-columns: 1fr; }
    .conversations-panel { display: none; }
  }
</style>
