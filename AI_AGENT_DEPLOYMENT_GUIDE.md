# AllBright AI Agent — Deployment Guide
**Purpose:** Step-by-step instructions for an AI agent to drive AllBright from simulation to live production deployment via the Commander page.  
**Audience:** Autonomous AI agents, deployment automation systems  
**Prerequisites:** Render account, repository access, completed security audit

---

## MISSION CONTEXT

AllBright is a flash-loan arbitrage system. **Live deployment executes REAL on-chain transactions with REAL funds.** This is not a simulation game. Financial loss is possible.

### Current State
- Dashboard UI: Running on `http://localhost:3002`
- Backend: Rust service (compiled, needs startup)
- Render production: `https://ms1-1.onrender.com/` (or as configured)
- **Mode:** `PAPER_TRADING_MODE` controls simulation vs live

---

## PHASE 1: PRE-FLIGHT SAFETY CHECKS (MANDATORY)

**STOP. Do not proceed until all checks pass.**

### 1.1 Verify Paper Trading Mode
```powershell
# Check current mode
$env:PAPER_TRADING_MODE  # Must be "true" for safety
```

If `PAPER_TRADING_MODE=false`:
1. **ABORT** — Live mode must never be activated by automation
2. Alert human operator
3. Switch to `PAPER_TRADING_MODE=true` in Render dashboard

### 1.2 Verify Secrets Are Not Exposed
```powershell
# Check if .env is tracked by git
git ls-files apps/dashboard/.env
# Should return empty. If it returns a path, SECURITY BREACH.
```

If `.env` is tracked:
1. **ABORT** — Secrets may be in git history
2. Alert security team
3. Rotate ALL keys immediately
4. Remove from git history with `git filter-branch` or BFG

### 1.3 Verify Backend Is Running
```powershell
# Check if backend is listening
curl.exe -s http://localhost:3001/healthz
# Expected: "ok"
```

If backend not running:
1. Start backend: `cd backend && cargo run --release`
2. Wait for `healthz` to return `ok`
3. Proceed only after backend is healthy

### 1.4 Verify Dashboard Is Running
```powershell
curl.exe -s http://localhost:3002/
# Expected: HTML with <div id="root">
```

If dashboard not running:
1. Start dashboard: `cd apps/dashboard && npm run dev`
2. Wait for server to listen on port 3002
3. Proceed only after dashboard responds

---

## PHASE 2: LOCAL DEPLOYMENT PIPELINE (PAPER MODE)

### 2.1 Access Commander Page
Navigate to: `http://localhost:3002/`  
Click **Command Console** in sidebar (or navigate to `/#commander`)

### 2.2 Verify Pipeline State
The Commander page shows 3 stages:
1. **PREFLIGHT** — Should show "Ready (Passed)"
2. **SIMULATION** — Should show "Idle (Ready)"
3. **LIVE ENGINE** — Should show "SIMULATION / PAPER"

If Preflight shows "FAILED — Check .env":
1. Check `.env` for missing required variables
2. Verify `VITE_API_BASE` points to correct backend
3. Verify `RUST_BACKEND_URL` is set correctly
4. Fix issues and refresh page

### 2.3 Run Preflight Check
```javascript
// Via browser console or API call:
fetch('/api/preflight/status')
  .then(r => r.json())
  .then(console.log)
// Expected: { passed: true, ... }
```

If preflight fails:
1. Do NOT proceed to simulation
2. Fix all preflight failures
3. Re-run until `passed: true`

### 2.4 Run Simulation
1. On Commander page, ensure **Pipeline Toggles** are set to:
   - Preflight: `Auto` or `Manual`
   - Simulation: `Auto` or `Manual`
2. Click **Deploy to SIMULATION**
3. Confirm dialog: "This triggers a PAPER/simulation deploy only"
4. Monitor progress bar and status updates
5. Expected outcome: `CONTRACT DEPLOYED` with simulated tx hash

### 2.5 Verify Simulation Success
```powershell
# Check deployment status
curl.exe -s http://localhost:3002/api/deploy/status
# Expected: { stage: "Completed" or "Paper", txHash: "0x..." }
```

If simulation fails:
1. Check backend logs
2. Do NOT proceed to live
3. Debug and fix before retrying

---

## PHASE 3: PRODUCTION DEPLOYMENT (RENDER)

**⚠️ WARNING: This phase requires HUMAN APPROVAL. Do not proceed without explicit authorization.**

### 3.1 Push to Render
```powershell
# Ensure all changes are committed
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

Render will automatically:
1. Build Rust backend Docker image
2. Build React dashboard Docker image
3. Deploy both services
4. Run database migrations
5. Start services

### 3.2 Verify Render Deployment
```powershell
# Check backend health
curl.exe -s https://ms1-1.onrender.com/healthz
# Expected: "ok"

# Check dashboard health (no auth required for health check)
curl.exe -s https://ms1-1.onrender.com/api/health
# Expected: 401 (auth required) or proxy response
```

### 3.3 Verify Commander Page on Production
1. Navigate to production URL
2. Open Command Console
3. Verify Preflight passes
4. Run simulation on production
5. Verify simulation succeeds

---

## PHASE 4: LIVE DEPLOYMENT (HUMAN APPROVAL REQUIRED)

**THIS PHASE EXECUTES REAL ON-CHAIN TRANSACTIONS. FINANCIAL LOSS IS POSSIBLE.**

### 4.1 Human Authorization Checklist
Before ANY live deployment, the following MUST be confirmed by a human:

- [ ] Security audit completed and signed off
- [ ] All API keys rotated
- [ ] Hardware wallet signer configured
- [ ] Circuit breaker contract deployed and tested
- [ ] Emergency stop procedures documented
- [ ] Test with minimal capital (< $100 equivalent)
- [ ] Multi-sig approval obtained (if applicable)
- [ ] Legal/compliance review completed

### 4.2 Switch to Live Mode
**ONLY AFTER human authorization:**

1. In Render dashboard, navigate to `allbright-backend` service
2. Go to **Environment** tab
3. Set `PAPER_TRADING_MODE=false`
4. Save and redeploy backend

### 4.3 Verify Live Mode on Commander Page
1. Refresh Commander page
2. Verify "LIVE ENGINE" badge shows **LIVE** (red badge)
3. Verify `backendMode` is `live`

### 4.4 Execute Live Deployment
1. On Commander page, click **Deploy to LIVE**
2. Read and confirm the warning dialog:
   ```
   SYSTEM CONFIRMATION REQUIRED:
   Deploy to LIVE? This triggers REAL on-chain execution with the configured wallet.
   ```
3. Monitor deployment progress
4. Verify tx hash appears
5. Verify on-chain transaction on block explorer (Etherscan, Arbiscan)

### 4.5 Post-Deployment Verification
```powershell
# Check deployment status
curl.exe -s https://ms1-1.onrender.com/api/deploy/status
# Expected: { stage: "Live", txHash: "0x..." }

# Check metrics
curl.exe -s https://ms1-1.onrender.com/api/metrics
# Expected: Real profit/loss data
```

---

## PHASE 5: POST-DEPLOYMENT MONITORING

### 5.1 Immediate Monitoring (First 24 Hours)
1. Watch `/api/metrics` for profit/loss
2. Monitor `/api/opportunities` for execution quality
3. Check `/api/system/kill` — be ready to emergency stop
4. Monitor wallet balance for unexpected changes

### 5.2 Emergency Procedures
If anything goes wrong:
1. Click **Kill Switch** in sidebar
2. Or call: `POST /api/system/kill`
3. Or manually revoke API keys
4. Or pause `PAPER_TRADING_MODE` in Render

---

## API REFERENCE

### Commander Page Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/preflight/status` | GET | Check preflight validation |
| `/api/simulation/status` | GET | Check simulation state |
| `/api/deploy/status` | GET | Check deployment state |
| `/api/deploy` | POST | Trigger deployment |
| `/api/deployment/approve` | POST | Approve staged deployment |
| `/api/system/kill` | POST | Emergency stop all operations |
| `/api/execute` | POST | Execute arbitrage trade |
| `/api/metrics` | GET | Get profit/loss metrics |
| `/api/opportunities` | GET | Get current opportunities |
| `/api/wallet` | GET | Get wallet state |
| `/api/health` | GET | Health check (requires Bearer token) |

### Authentication
All `/api/*` endpoints (except health) require:
```
Authorization: Bearer <JWT_TOKEN>
```
JWT validation uses `JWT_SECRET` from environment.

---

## DECISION TREE

```
START
  │
  ├─ Is PAPER_TRADING_MODE=true?
  │   ├─ YES → Proceed to Phase 2 (Local Simulation)
  │   └─ NO → ABORT. Alert human. Do not proceed.
  │
  ├─ Is .env exposed in git?
  │   ├─ YES → ABORT. Security breach. Rotate all keys.
  │   └─ NO → Continue
  │
  ├─ Is backend running on :3001?
  │   ├─ YES → Continue
  │   └─ NO → Start backend. Retry.
  │
  ├─ Is dashboard running on :3002?
  │   ├─ YES → Continue
  │   └─ NO → Start dashboard. Retry.
  │
  ├─ Does Preflight pass?
  │   ├─ YES → Continue
  │   └─ NO → Fix issues. Do not proceed.
  │
  ├─ Does Simulation succeed?
  │   ├─ YES → Continue
  │   └─ NO → Debug. Do not proceed to live.
  │
  ├─ Is this local or production?
  │   ├─ LOCAL → STOP. Simulation complete.
  │   └─ PRODUCTION → Continue only with HUMAN APPROVAL
  │
  └─ Has human authorized live deployment?
      ├─ YES → Switch PAPER_TRADING_MODE=false → Execute live
      └─ NO → STOP. Do not proceed without authorization.
```

---

## FAILURE MODES & RECOVERY

| Failure | Recovery |
|---------|----------|
| Backend won't start | Check logs, verify Rust binary exists, check env vars |
| Preflight fails | Check `.env`, verify RPC endpoints, check wallet balance |
| Simulation fails | Check backend logs, verify local RPC, check contract addresses |
| Deployment times out | Check `/api/deploy/status`, verify backend mode, check gas prices |
| Live tx fails | Check block explorer, verify nonce, check gas settings |
| Kill switch needed | Call `/api/system/kill`, verify all operations halted |

---

## SUCCESS CRITERIA

### Phase 2 Complete (Simulation)
- [ ] Dashboard loads at `http://localhost:3002`
- [ ] Commander page accessible
- [ ] Preflight shows "Ready (Passed)"
- [ ] Simulation deploys successfully
- [ ] `/api/deploy/status` shows completed stage

### Phase 3 Complete (Production Deploy)
- [ ] Render deployment succeeds
- [ ] Backend healthz returns `ok`
- [ ] Dashboard loads at production URL
- [ ] Commander page works on production
- [ ] Simulation runs on production

### Phase 4 Complete (Live Deployment)
- [ ] Human authorization obtained
- [ ] `PAPER_TRADING_MODE=false` set in Render
- [ ] Live deployment executes via Commander
- [ ] Transaction confirmed on-chain
- [ ] Metrics show real P&L

---

## IMPORTANT REMINDERS

1. **Never** deploy to live without human approval
2. **Never** expose private keys in logs or commits
3. **Always** test in simulation first
4. **Always** have kill switch ready
5. **Always** monitor after deployment
6. **Never** use production funds for testing

---

## SUPPORT

If stuck:
1. Check `DASHBOARD_DEPLOYMENT_STATUS.md` for local state
2. Check `DEPLOYMENT_READINESS.md` for security checklist
3. Check backend logs: `backend_run.log`, `backend_stderr.log`
4. Check dashboard logs: `apps/dashboard/server_test.log`
