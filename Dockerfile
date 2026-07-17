# ALLBRIGHT Dashboard — React + Vite + Express production build for Render
# Single-stage Node.js runtime using server.ts proxy

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

COPY apps/dashboard/package*.json ./
RUN npm ci

COPY apps/dashboard/ .
RUN npm run build

# ============================================================================
# Production Runtime
# ============================================================================
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Render serves on port 10000 by default, but we map to 80 in docker-compose
# Render will set PORT env var automatically
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

# Use PORT env var if provided (Render), default to 80 for docker-compose
CMD ["sh", "-c", "PORT=${PORT:-80} node dist/server.cjs"]
