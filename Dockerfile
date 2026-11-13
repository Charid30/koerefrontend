# ── Construction de l'application Angular ────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# ── Service : Caddy sert le site et relaie /api vers le backend ──
FROM caddy:2.10-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/Webapp/browser /srv

EXPOSE 80 443
