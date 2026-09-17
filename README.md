# trankyl-academy-content

Site web (SvelteKit) de Trankyl Academy — taxonomie et curriculum under CC-BY-4.0 license, site code under MIT.

Ce site sert deux publics :

- **Public / apprenants** : parcourir les metiers, s'inscrire a un module, passer le quiz de fin de module,
  suivre sa progression et ses certifications (`/`, `/metiers/[code]`, `/modules/[id]`, `/login`, `/register`,
  `/dashboard`), lire le blog (`/blog`), en savoir plus (`/a-propos`, `/contact`)
- **Admins** : gerer la taxonomie (metiers/niveaux/competences) et le curriculum (modules/quiz) — tout se fait
  ici, cote site, pas de saisie directe en base (`/admin/taxonomy`, `/admin/curriculum`)

Le contenu du blog et de la FAQ est statique (`src/lib/content/`), independant du backend — pas de gestion
d'articles cote admin pour l'instant.

Toutes les donnees viennent de l'API `trankyl-academy-engine` (FastAPI). Ce site n'a pas sa propre base de
donnees.

## Prerequis

- Node.js 20+
- `trankyl-academy-engine` lance en local (ou son URL de prod) pour l'API

## Installation

```bash
npm install
cp .env.example .env   # PUBLIC_API_URL doit pointer vers l'API FastAPI
```

## Developpement

```bash
npm run dev
```

## Creer le premier compte admin

Aucune inscription admin depuis le site (par design) : voir `python -m scripts.create_admin` dans
`trankyl-academy-engine`.

## Build

```bash
npm run build
npm run preview
```

Utilise `@sveltejs/adapter-node` (coherent avec le deploiement EC2 + PM2 du reste de Trankyl). Le build produit
un serveur Node autonome dans `build/` :

```bash
node build/index.js   # ou via PM2, comme trankyl_backend_nodejs
```

Variables lues au demarrage du serveur buildé : `PORT` (defaut 3000), `ORIGIN` (URL publique du site).

## License

- Site code: [MIT](./LICENSE)
- Skills taxonomy and training curriculum: [CC-BY-4.0](./LICENSE-CONTENT) — freely reusable, including
  commercially, as long as Trankyl Academy is credited as the source.
