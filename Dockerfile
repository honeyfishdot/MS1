# Minimal working Dockerfile
# Build cache buster: 2026-07-19-white-page-fix-v3

FROM node:20-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy package files first for better layer caching
COPY apps/dashboard/package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY apps/dashboard/ .
RUN npm run build

# Verify the build output
RUN ls -la dist/ && echo "Build complete" && head -5 dist/index.html

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --legacy-peer-deps --only=production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

CMD ["node", "dist/server.cjs"]