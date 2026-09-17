#!/bin/bash
set -e

# =========================================================
# Script d'activation de la conf Nginx pour trankyl-academy-content (PROD)
# (a executer sur la meme instance que trankyl_backend_nodejs,
# Nginx doit deja etre installe par son propre setup-nginx.sh)
# Usage: ./setup-nginx.sh
# =========================================================

echo ">>> Activation de la configuration Nginx PROD (academy.trankyl.com)..."
sudo cp academy.trankyl.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/academy.trankyl.com.conf /etc/nginx/sites-enabled/

echo ">>> Test de la configuration Nginx..."
sudo nginx -t

echo ">>> Redémarrage de Nginx..."
sudo systemctl restart nginx

echo ""
echo "============================================"
echo "✅ Nginx configuré avec succès !"
echo "============================================"
echo ""
echo "Prod: http://academy.trankyl.com -> port 9004"
echo ""
echo "⚠️  N'oublie pas de configurer le DNS du sous-domaine pour pointer"
echo "   vers l'IP de ce serveur (la meme IP que app-api.trankyl.me) !"
echo ""
echo "📌 Pour activer SSL (HTTPS) avec Certbot :"
echo "   sudo certbot --nginx -d academy.trankyl.com"
