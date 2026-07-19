#!/usr/bin/env bash
# Render build script for the AllBright dashboard service.
# Forces a clean install + production build so the served bundle and the
# runtime-generated index.html always reference the same asset hash.
# (Prevents the stale-index.html / deleted-JS 100% white page.)
set -euo pipefail

cd apps/dashboard

echo "==> Installing dependencies"
npm ci --legacy-peer-deps || npm install --legacy-peer-deps

echo "==> Building dashboard (SPA + dist/server.cjs)"
npm run build

echo "==> Build complete"
ls -la dist
echo "Assets:"
ls -la dist/assets
