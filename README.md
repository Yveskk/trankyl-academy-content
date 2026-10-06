# trankyl-academy-content


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
