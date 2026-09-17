#!/bin/bash
set -e

cd "$(dirname "$0")/.."

VERSION=${1:-"latest"}
PUSH=false
[[ "$2" == "--push" ]] && PUSH=true

IMAGE="trankyldev/trankyl_academy_content_prod"

# PUBLIC_API_URL est inline au build par SvelteKit ($env/static/public), donc
# fixe pour l'image prod : pointe vers l'API trankyl-academy-engine en prod.
API_URL="https://api.academy.trankyl.com/api/v1"

echo "Building $IMAGE:$VERSION (PUBLIC_API_URL=$API_URL)..."
docker build \
  --build-arg PUBLIC_API_URL="$API_URL" \
  -t "$IMAGE:$VERSION" -t "$IMAGE:latest" \
  -f Dockerfile .

if $PUSH; then
  echo "Pushing $IMAGE:$VERSION..."
  docker push "$IMAGE:$VERSION"
  echo "Pushing $IMAGE:latest..."
  docker push "$IMAGE:latest"

  echo ""
  echo "Pour déployer sur le serveur :"
  echo "  cd deploy && ./deploy-server.sh redeploy"
fi

echo "Done."
