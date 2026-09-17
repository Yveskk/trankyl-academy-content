# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# PUBLIC_API_URL est inline par Vite/SvelteKit au moment du build ($env/static/public) :
# il faut donc une image par environnement (prod/dev), pas une variable modifiable au runtime.
ARG PUBLIC_API_URL=https://api.academy.trankyl.com/api/v1
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "build/index.js"]
