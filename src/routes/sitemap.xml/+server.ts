import { PUBLIC_SITE_URL } from "$env/static/public";
import { listArticles } from "$lib/api/blog";
import { listMetiers } from "$lib/api/taxonomy";

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function toXml(urls: UrlEntry[]): string {
  const items = urls
    .map((u) => {
      const lastmod = u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : "";
      const changefreq = u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "";
      const priority = u.priority ? `<priority>${u.priority}</priority>` : "";
      return `<url><loc>${u.loc}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export async function GET() {
  const urls: UrlEntry[] = [
    { loc: `${PUBLIC_SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${PUBLIC_SITE_URL}/a-propos`, changefreq: "monthly", priority: "0.5" },
    { loc: `${PUBLIC_SITE_URL}/contact`, changefreq: "monthly", priority: "0.5" },
    { loc: `${PUBLIC_SITE_URL}/blog`, changefreq: "weekly", priority: "0.7" },
    { loc: `${PUBLIC_SITE_URL}/prestataires/liste`, changefreq: "weekly", priority: "0.6" },
  ];

  try {
    const metiers = await listMetiers();
    for (const metier of metiers) {
      if (metier.is_active) {
        urls.push({ loc: `${PUBLIC_SITE_URL}/metiers/${metier.code}`, changefreq: "monthly", priority: "0.8" });
      }
    }
  } catch {
    // API indisponible : on publie quand meme les pages statiques ci-dessus.
  }

  try {
    const articles = await listArticles();
    for (const article of articles) {
      if (article.is_active) {
        urls.push({
          loc: `${PUBLIC_SITE_URL}/blog/${article.slug}`,
          lastmod: article.updated_at,
          changefreq: "monthly",
          priority: "0.6",
        });
      }
    }
  } catch {
    // idem
  }

  return new Response(toXml(urls), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
