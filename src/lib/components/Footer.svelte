<script lang="ts">
  import { i18n } from "$lib/stores/locale.svelte";

  const year = new Date().getFullYear();
</script>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="/logo-wh.svg" alt="Trankyl" />
          Trankyl Academy
        </div>
        <p style="color: rgba(255,255,255,.6); font-size: .88rem; max-width: 280px;">
          {i18n.dict.footer.tagline}
        </p>
        <div class="social-icons">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.1c0-.81.22-1.36 1.39-1.36h1.48V5.2A19.8 19.8 0 0 0 14.5 5c-2.15 0-3.62 1.31-3.62 3.72V11H8.5v2.8h2.38V21h2.62Z"
              />
            </svg>
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1" />
            </svg>
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M6.94 8.5H4V20h2.94V8.5ZM5.47 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20 20h-2.94v-6.1c0-1.46-.03-3.34-2.04-3.34-2.04 0-2.35 1.6-2.35 3.24V20H9.73V8.5h2.82v1.57h.04c.39-.74 1.35-1.52 2.79-1.52 2.98 0 3.53 1.96 3.53 4.5V20Z"
              />
            </svg>
          </a>
        </div>
      </div>

      <div>
        <h4>{i18n.dict.footer.apprenantsHeading}</h4>
        <ul>
          <li><a href="/">{i18n.dict.footer.tousLesMetiers}</a></li>
          <li><a href="/register">{i18n.dict.footer.creerUnCompte}</a></li>
          <li><a href="/login">{i18n.dict.footer.connexion}</a></li>
          <li><a href="/dashboard">{i18n.dict.footer.monEspace}</a></li>
        </ul>
      </div>

      <div>
        <h4>{i18n.dict.footer.ressourcesHeading}</h4>
        <ul>
          <li><a href="/blog">{i18n.dict.footer.blog}</a></li>
          <li><a href="/a-propos">{i18n.dict.footer.aPropos}</a></li>
          <li><a href="/contact">{i18n.dict.footer.contact}</a></li>
        </ul>
      </div>

      <div>
        <h4>{i18n.dict.footer.trankylHeading}</h4>
        <ul>
          <li><a href="https://trankyl.com" target="_blank" rel="noreferrer">{i18n.dict.footer.trankylSite}</a></li>
          <li><a href="/admin/login">{i18n.dict.footer.espaceAdmin}</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span>{i18n.dict.footer.copyright(year)}</span>
      <span>{i18n.dict.footer.license}</span>
    </div>
  </div>
</footer>
