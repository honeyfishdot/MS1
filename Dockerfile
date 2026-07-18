# Minimal working Dockerfile

FROM node:20-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

COPY apps/dashboard/package*.json ./
RUN npm install --legacy-peer-deps

COPY apps/dashboard/ .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --legacy-peer-deps --only=production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

CMD ["sh", "-c", "PORT=${PORT:-80} node dist/server.cjs"]
