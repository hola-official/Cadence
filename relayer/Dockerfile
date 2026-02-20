FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Runtime image ──
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

# Compiled JS
COPY --from=builder /app/dist ./dist

# SQL migration files (tsc doesn't copy non-TS files)
COPY --from=builder /app/src/db/migrations ./dist/src/db/migrations

# Logo files served by the API (must be at <workdir>/logos)
COPY --from=builder /app/logos ./logos

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
