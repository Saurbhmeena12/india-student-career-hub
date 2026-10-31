# ============================================================================
# India Student & Career Hub — production image
# Works on: Oracle Cloud Always Free VM, any free VPS, Fly.io, local Docker.
# Local SQLite file is stored under /data so it survives container restarts.
# ============================================================================
FROM node:20-bookworm-slim

# sqlite3 needs build tools only while compiling; keep the image small afterwards
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_FILE=/data/database.sqlite

RUN mkdir -p /data uploads && chown -R node:node /data uploads
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
