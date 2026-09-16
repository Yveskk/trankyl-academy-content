<script lang="ts">
  import Shield from "@lucide/svelte/icons/shield";
  import Lock from "@lucide/svelte/icons/lock";
  import { goto } from "$app/navigation";
  import { adminLogin } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";

  let email = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      const token = await adminLogin(email, password);
      auth.login(token.access_token, "admin");
      goto("/admin/dashboard");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-wrapper">
  <div class="login-card">
    <div class="login-header">
      <div class="login-icon">
        <Shield size={28} />
      </div>
      <h1>Administration</h1>
      <p>Trankyl Academy — Panneau de gestion</p>
    </div>

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="email">Adresse email</label>
        <input
          id="email"
          type="email"
          placeholder="admin@trankyl.com"
          bind:value={email}
          required
        />
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <div class="password-input">
          <Lock size={16} class="lock-icon" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            bind:value={password}
            required
          />
        </div>
      </div>
      <button class="login-btn" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>

    {#if error}
      <div class="alert-login">{error}</div>
    {/if}

    <div class="login-footer">
      <a href="/">← Retour au site public</a>
    </div>
  </div>
</div>

<style>
  .login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0a1f10 0%, #04330d 50%, #0a1f10 100%);
    padding: 2rem;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
    padding: 2.5rem 2rem;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #04330d, #03a71a);
    color: #fec600;
    margin-bottom: 1rem;
  }

  .login-header h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #111827;
    margin: 0 0 0.3rem;
  }

  .login-header p {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #374151;
  }

  input {
    font-family: inherit;
    font-size: 0.92rem;
    padding: 0.7rem 0.85rem;
    border: 1.5px solid #d1d5db;
    border-radius: 10px;
    background: #f9fafb;
    color: #111827;
    transition: all 0.15s;
  }

  input:focus {
    outline: none;
    border-color: #03a71a;
    box-shadow: 0 0 0 3px rgba(3, 167, 26, 0.12);
    background: #fff;
  }

  .password-input {
    position: relative;
  }

  .password-input :global(.lock-icon) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .password-input input {
    padding-left: 2.5rem;
    width: 100%;
  }

  .login-btn {
    width: 100%;
    padding: 0.8rem;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #03a71a, #028a15);
    color: #fff;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 0.5rem;
  }

  .login-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #028a15, #016d10);
    box-shadow: 0 4px 12px rgba(3, 167, 26, 0.3);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .alert-login {
    margin-top: 1rem;
    padding: 0.7rem 1rem;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid #fecaca;
    text-align: center;
  }

  .login-footer {
    margin-top: 1.5rem;
    text-align: center;
  }

  .login-footer a {
    font-size: 0.82rem;
    color: #6b7280;
    text-decoration: none;
    font-weight: 600;
  }

  .login-footer a:hover {
    color: #03a71a;
  }
</style>
