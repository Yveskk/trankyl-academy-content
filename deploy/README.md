# Documentation de Déploiement — trankyl-academy-content (GCP, PROD)

Ce site est déployé sur la **même instance** que `trankyl_backend_nodejs` et `trankyl-academy-engine`
(GCP), sur le **même réseau Docker** `e_global`, avec un port dédié :

- **Production** : `academy.trankyl.com` → port hôte **9004** (conteneur 3000).

Le site utilise `@sveltejs/adapter-node` : le build produit un serveur Node autonome (`build/index.js`),
packagé ici dans une image Docker au lieu d'être lancé via PM2 — le résultat est le même (un process Node
qui écoute sur `PORT`), seul le gestionnaire de process change, pour rester cohérent avec le reste de
l'infra Trankyl qui tourne en conteneurs sur cette instance.

---

## ⚠️ Point important : `PUBLIC_API_URL` est figé au build

SvelteKit inline les variables `PUBLIC_*` **dans le bundle au moment du build** (`$env/static/public`,
utilisé par `src/lib/api/client.ts` et `blog.ts`). Il n'est **pas possible** de changer l'URL de l'API après
coup avec une simple variable d'environnement au runtime du conteneur.

`deploy-service.sh` build donc systématiquement avec `PUBLIC_API_URL=https://api.academy.trankyl.com/api/v1`
(l'URL de `trankyl-academy-engine` en prod). Si cette URL change, mettez à jour `API_URL` en haut de
`deploy-service.sh` avant de rebuilder.

---

## 📁 Structure du dossier `deploy`

- `trankyl-academy-content-prod.yml` : Docker Compose de production.
- `deploy-server.sh` : Script de gestion sur le serveur (`redeploy`, `up`, `down`, `logs`, `status`).
- `deploy-service.sh` : Script local de Build (avec le bon `PUBLIC_API_URL`) & Push Docker Hub.
- `.env.prod.example` : Variables runtime (`ORIGIN`, `PORT`).
- `nginx/` : Configuration Nginx (`setup-nginx.sh`).

---

## 🚀 Mise en service

### 1. Build & push de l'image (en local)

```bash
./deploy/deploy-service.sh 0.3.1 --push
```

### 2. DNS

Ajoutez une entrée **A** pour `academy.trankyl.com` pointant vers la même IP que `app-api.trankyl.me`
(c'est la même VM).

### 3. Copie des fichiers sur le serveur

```bash
scp trankyl-academy-content-prod.yml deploy-server.sh .env.prod user@<IP>:~/trankyl/academy-content/
scp -r nginx user@<IP>:~/trankyl/academy-content/
```

Remplissez `.env.prod` à partir de `.env.prod.example` : `ORIGIN` (l'URL publique du site, nécessaire pour
les form actions/CSRF de SvelteKit) et `PORT`.

### 4. Lancer le conteneur

```bash
cd ~/trankyl/academy-content
chmod +x deploy-server.sh
./deploy-server.sh redeploy
```

Vérifier :
```bash
docker ps                    # trankyl_academy_content_prod actif sur le port 9004
curl http://localhost:9004/
```

### 5. Nginx & SSL

```bash
cd ~/trankyl/academy-content/nginx
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
sudo certbot --nginx -d academy.trankyl.com
```

---

## 🛠️ Commandes de gestion courantes

```bash
./deploy-server.sh redeploy
./deploy-server.sh logs
./deploy-server.sh status
./deploy-server.sh down
```

---

## ⚠️ Autres points d'attention

- L'identifiant Docker Hub (`trankyldev/trankyl_academy_content_prod`) doit être créé au préalable sur
  Docker Hub.
- Pensez à ajouter `https://academy.trankyl.com` dans `CORS_ORIGINS` du `.env.prod` de
  `trankyl-academy-engine` (voir son propre `deploy/README.md`), sinon l'API refusera les appels du site
  en prod.
