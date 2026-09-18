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
          <a href="https://www.facebook.com/trankyl/" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.1c0-.81.22-1.36 1.39-1.36h1.48V5.2A19.8 19.8 0 0 0 14.5 5c-2.15 0-3.62 1.31-3.62 3.72V11H8.5v2.8h2.38V21h2.62Z"
              />
            </svg>
          </a>
          <a href="https://www.instagram.com/trankyl_me/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1" />
            </svg>
          </a>
          <a href="https://www.tiktok.com/@trankyl_me" target="_blank" rel="noreferrer" aria-label="TikTok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1Z"
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
          <li><a href="/impact">{i18n.dict.footer.impact}</a></li>
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
