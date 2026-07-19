# AllBright — Deployment Readiness Assessment
**Date:** 2026-07-18  
**Assessed by:** Kilo  
**Scope:** Local development → Production (Render) deployment readiness  
**Classification:** INTERNAL — DO NOT DISTRIBUTE (contains security findings)

---

## Executive Summary

AllBright is **NOT READY** for live production deployment. The dashboard UI is functional and the build pipeline works, but critical security, backend, and safety blockers must be resolved before any real funds are risked.

### Overall Status: 🟡 PARTIAL — Blocked for Live Trading

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard Frontend (React SPA) | ✅ Ready | Builds successfully, serves on :3002 |
| Express Proxy Server | ✅ Ready | Static serving fixed, JWT auth in place |
| Rust Backend (allbright-c2-backend) | ⏳ Compiled, not running | Binary exists, needs startup verification |
| Frontend Build Artifacts | ✅ Present | `dist/` contains index.html + JS/CSS bundles |
| TypeScript / Lint | ✅ Passes | `npm run lint` clean |
| Render Blueprint (`render.yaml`) | ✅ Configured | Two web services + Redis + Postgres |
| Environment Secrets | 🔴 CRITICAL ISSUE | Plaintext private key & API keys in `.env` |
| Paper vs Live Mode | 🔴 CRITICAL | `PAPER_TRADING_MODE=false` in `.env` — live mode active |
| Backend Health (localhost:3001) | 🔴 Not Running | No process listening on port 3001 |
| Local RPC (localhost:8545) | 🔴 Not Running | Required for simulation/live execution |
| Database Migration | ⏳ Unverified | Neon Postgres configured, migration status unknown |
| Security Audit | 🔴 Required | Secrets exposure, missing 2FA, no KYC/AML in production |

---

## 1. Current Local State

### Running Services
- **Dashboard + Express Proxy**: `http://localhost:3002` (PID 14692, Node.js)
- **Rust Backend**: NOT running (port 3001 silent)
- **Local RPC Relay**: NOT running (port 8545 silent)

### Verified Endpoints
```powershell
# Dashboard HTML (production build)
GET http://localhost:3002/
→ 200 OK, serves /assets/index-B1co0ti0.js (678KB React bundle)

# API health (requires Bearer JWT — expected 401 without token)
GET http://localhost:3002/api/health
→ 401 Missing Bearer token (auth middleware working correctly)
```

### Frontend Build
```
dist/
  index.html          0.41 KB
  assets/
    index-B1co0ti0.js 678.71 KB (gzip: 196 KB)
    index-CzKHAzw7.css 55.44 KB (gzip: 9.24 KB)
  server.cjs          9.3 KB
  server.cjs.map      15.3 KB
```
Build command: `npm run build` → `vite build && esbuild server.ts`

---

## 2. Critical Security Findings

### 🔴 CRITICAL: Secrets Exposed in `.env`
The file `apps/dashboard/.env` contains **real production secrets in plaintext**:
- `PRIVATE_KEY=0x019ea2...` (wallet private key)
- `OPENAI_API_KEY=sk-proj-...`
- `OPENROUTER_API_KEY=sk-or-v1-...`
- `GROQ_API_KEY=gsk_...`
- `PIMLICO_API_KEY=pim_...`
- `GEMINI_API_KEY=AIzaSy...`
- `RENDER_API_KEY=rnd_...`
- Database credentials with passwords

**Risk:** Any user with repo access can drain the wallet. These secrets must never be committed to version control.

**Mitigation (immediate):**
1. Rotate ALL exposed keys immediately
2. Move secrets to Render's environment variable dashboard (already configured in `render.yaml` with `sync: false`)
3. Ensure `.env` is in `.gitignore` (confirmed: `apps/**/.env` is ignored)
4. Use a secrets manager (Render Secrets, HashiCorp Vault, or Azure Key Vault)

### 🔴 CRITICAL: Live Trading Mode Active
`apps/dashboard/.env` contains:
```
PAPER_TRADING_MODE=false
```
This means the system is configured for **real on-chain execution** with real funds.

**Risk:** Accidental or unauthorized deployment will execute real flash-loan arbitrage transactions using the configured wallet.

**Mitigation:**
1. Set `PAPER_TRADING_MODE=true` until full safety audit is complete
2. Require multi-sig approval for `PAPER_TRADING_MODE=false` in production
3. Implement hardware wallet signer (Ledger/Trezor) for production

### 🟡 WARNING: Duplicate API Keys
`OPENAI_API_KEY` appears twice in `.env` (lines 50 and 52) with different values. This indicates configuration drift and could cause unpredictable behavior.

---

## 3. Backend Readiness

### Rust Backend (allbright-c2-backend)
- **Compile Status:** ✅ Compiled (1,656 `.rlib` artifacts in `backend/target/`)
- **Runtime Status:** ❌ Not running locally
- **Binary Location:** `backend/target/release/allbright-c2-backend` (if built with `--release`)
- **Docker Image:** ✅ `backend/Dockerfile` configured for Render

### Backend Startup
```powershell
# From repo root:
cd backend
set HTTP_BIND_ADDR=127.0.0.1:3001
.\target\release\allbright-c2-backend.exe
```

### Backend Health Endpoints
| Endpoint | Auth Required | Purpose |
|----------|---------------|---------|
| `/healthz` | No | Liveness probe (used by Render) |
| `/readyz` | No | Readiness probe |
| `/api/metrics` | Yes (`x-api-key`) | 78 KPI telemetry |
| `/api/opportunities` | Yes | Live arbitrage opportunities |
| `/api/deploy` | Yes | Smart contract deployment trigger |
| `/api/execute` | Yes | Execute arbitrage trades |

### Missing Backend Dependencies
1. **PostgreSQL:** Configured via `DATABASE_URL` (Neon), but migration status unverified
2. **Redis:** Configured via `REDIS_URL`, but connection unverified
3. **JWT Secret:** Must be set in production (`JWT_SECRET` in render.yaml is auto-generated)

---

## 4. Production Deployment Path (Render)

### Render Configuration
`render.yaml` defines:
- **2 Web Services:**
  - `allbright-backend` (Docker, port 3001)
  - `allbright-dashboard` (Docker, port 3000 → proxied to backend)
- **1 Redis:** `allbright-redis` (starter plan)
- **1 PostgreSQL:** `allbright-db` (starter plan)

### Environment Variables (Render Dashboard)
**Backend service — must be set manually (`sync: false`):**
| Variable | Required | Notes |
|----------|----------|-------|
| `WALLET_ADDRESS` | Yes | Must match `.env` |
| `PRIVATE_KEY` | Yes | Rotate before deploy |
| `OPENAI_API_KEY` | Yes | Rotate before deploy |
| `OPENROUTER_API_KEY` | Yes | Rotate before deploy |
| `GROQ_API_KEY` | Yes | Rotate before deploy |
| `PIMLICO_API_KEY` | Yes | For account abstraction |
| `FLASHBOTS_AUTH_KEY` | Yes | For MEV protection |
| `CIRCUIT_BREAKER_ADDRESS` | Yes | Emergency stop contract |

**Auto-generated by Render:**
| Variable | Source |
|----------|--------|
| `API_KEY` | `generateValue: true` |
| `JWT_SECRET` | `generateValue: true` |
| `DATABASE_URL` | From `allbright-db` |
| `REDIS_URL` | From `allbright-redis` |
| `RUST_BACKEND_URL` | From `allbright-backend` hostport |
| `RUST_API_KEY` | From backend's `API_KEY` |

---

## 5. Pre-Deployment Checklist

### Security (MUST COMPLETE BEFORE LIVE DEPLOYMENT)
- [ ] Rotate ALL API keys (OpenAI, OpenRouter, Groq, Pimlico, Gemini, Render)
- [ ] Rotate wallet `PRIVATE_KEY` (generate new keypair, update wallet address in contracts if needed)
- [ ] Remove plaintext secrets from local `.env` (use Render dashboard only)
- [ ] Enable hardware wallet signer (Ledger/Trezor) for production execution
- [ ] Implement 2FA/MFA for Render dashboard access
- [ ] Set `ALLOWED_ORIGINS` to production domain only (not `localhost`)
- [ ] Enable KYC/AML checks (`REQUIRE_KYC=true`, `REQUIRE_AML=true`) if serving external users
- [ ] Audit CORS configuration — currently allows all origins if `ALLOWED_ORIGINS` is empty

### Backend
- [ ] Verify Rust backend starts cleanly: `cargo run --release`
- [ ] Verify `/healthz` returns `ok`
- [ ] Run database migrations (`db-init` binary or SQLx migrations)
- [ ] Verify Redis connection
- [ ] Test `/api/metrics` with valid `x-api-key`
- [ ] Test `/api/opportunities` endpoint

### Frontend
- [ ] Verify `npm run build` produces complete `dist/`
- [ ] Verify `dist/` is NOT committed to git
- [ ] Test production build locally: `npm run start`
- [ ] Verify `VITE_API_BASE=/` in `.env.production` (relative path for proxy)

### Integration
- [ ] Test full flow: Dashboard → Express Proxy → Rust Backend → Blockchain
- [ ] Test Commander page deployment pipeline in paper mode
- [ ] Test kill switch (`/api/system/kill`)
- [ ] Test wallet deposit/withdrawal flows
- [ ] Test preflight checks pass

### Production (Render)
- [ ] Push `main` branch to trigger Render deployment
- [ ] Verify backend health check passes (`/healthz`)
- [ ] Verify dashboard health check passes (`/api/health`)
- [ ] Verify Redis and Postgres are connected
- [ ] Test Commander page on production URL
- [ ] Enable Render autoscaling if needed
- [ ] Set up monitoring/alerting (Render already provides basic metrics)

---

## 6. Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Plaintext private key in `.env` | 🔴 Critical | Rotate key, use Render secrets, enable hardware wallet |
| `PAPER_TRADING_MODE=false` | 🔴 Critical | Switch to `true` until safety audit complete |
| Backend not running locally | 🟡 High | Start backend before testing live features |
| No local RPC | 🟡 High | Start `localport-rpc-relay.mjs` for simulation |
| Duplicate API keys in `.env` | 🟡 Medium | Clean up `.env`, use single source of truth |
| Large JS bundle (678KB) | 🟢 Low | Consider code splitting in future |
| No rate limiting on `/api/deploy` | 🟡 Medium | Backend should enforce rate limits |
| JWT secret not set locally | 🟡 Medium | Set `JWT_SECRET` in local `.env` for testing |

---

## 7. Commander → Live Deployment Path

The Commander page (`CommanderView.tsx`) provides a 3-stage pipeline:

1. **Preflight** — Validates on-chain parameters, ABI health, balances, env secrets
2. **Simulation** — Runs paper trading over local forks
3. **Live Engine** — Triggers real on-chain flash-loan arbitrage

### To Go Live (SAFELY):
1. Complete ALL security checklist items above
2. Set `PAPER_TRADING_MODE=true` in Render dashboard
3. Test full pipeline in simulation mode on production URL
4. Verify preflight passes, simulation runs cleanly
5. **Manual approval required:** Switch `PAPER_TRADING_MODE=false` ONLY after:
   - Security audit sign-off
   - Multi-sig wallet setup verified
   - Circuit breaker contract deployed and tested
   - Emergency stop procedures documented and tested
6. Start with minimal capital (test with < $100 equivalent)
7. Monitor closely for first 24-48 hours

---

## 8. Files Referenced

| File | Purpose |
|------|---------|
| `apps/dashboard/server.ts` | Express proxy + static file server |
| `apps/dashboard/package.json` | Build scripts, dependencies |
| `apps/dashboard/.env` | Local secrets (MUST rotate) |
| `apps/dashboard/.env.production` | Production Vite config |
| `apps/dashboard/.env.example` | Template for required vars |
| `apps/dashboard/src/components/CommanderView.tsx` | Deployment pipeline UI |
| `apps/dashboard/src/App.tsx` | Main app, wallet sync, API base |
| `render.yaml` | Render Blueprint (2 web services + Redis + Postgres) |
| `backend/Dockerfile` | Multi-stage Rust build for Render |
| `backend/main.rs` | Rust backend entry point |
| `DASHBOARD_DEPLOYMENT_STATUS.md` | Local deployment status |
| `DEPLOY_DASHBOARD_VERSIONS.md` | Port map and deployment versions |

---

## 9. Immediate Actions Required

1. **DO NOT DEPLOY TO PRODUCTION** until security checklist is complete
2. Rotate `PRIVATE_KEY` and ALL API keys
3. Set `PAPER_TRADING_MODE=true` in Render
4. Start Rust backend locally for testing: `cargo run --release`
5. Run full Commander pipeline in paper mode
6. Complete security audit before considering live mode
