# Image du cœur de l'agent natif EMDC Copilote.
# Service autonome, hors n8n, tournant sur le VPS dans le réseau docker `emdc`.
FROM node:20-alpine

WORKDIR /app

# Dépendances d'abord (bon cache Docker)
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3100

# Le .env est injecté au lancement (docker-compose), jamais dans l'image.
CMD ["node", "src/server.js"]
