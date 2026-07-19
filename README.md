# AllBright C2 Arbitrage Flash Loan Engine

**Version:** 119.0.0  
**Architecture:** Multi-Chain (EVM + SVM) Aggregation  
**Runtime:** Rust + Solidity (Ethereum Smart Contracts)

[![Deploy to Render](https://render.com/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/honeyfishdot/MS1)

> **One-click deploy:** The button above provisions the full stack (dashboard + Rust backend + Redis + Postgres) from `render.yaml` (Render Blueprint). After the first deploy, every `git push` to `main` auto-redeploys the affected services.

### Redeploying after a fix (e.g. white-page fix)
If the live site is stale, trigger a manual redeploy — no API key required:
1. Open the Render dashboard → **allbright-dashboard** service.
2. Click **"Manual Deploy"** (or **"Redeploy"**).
3. Wait ~2 min; the new build goes live automatically.

The dashboard is **self-contained**: it serves built-in live telemetry even if the Rust backend / DB are still starting, so it always renders.

## Overview

AllBright C2 is a high-performance arbitrage flash loan engine that aggregates across multiple blockchain networks. It implements a Central Command & Control (C2) server with 100+ specialized AI agents for trading, risk management, security, governance, and infrastructure management.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    HTTP API (Axum)                    │
│                     Port 3000                        │
├─────────────────────────────────────────────────────┤
│                    gRPC (Tonic)                      │
│                     Port 50051                       │
├─────────────────────────────────────────────────────┤
│              AI Agent Registry (100+ agents)          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │Trading│ │Risk  │ │Security│ │Gov   │ │Infra │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
├─────────────────────────────────────────────────────┤
│            Core Engine Components                     │
│  - Flash Loan Arbitrage Engine                        │
│  - Fixed Point Core                                   │
│  - MEV Protection (Flashbots)                         │
│  - Multi-Objective Solver                             │
├─────────────────────────────────────────────────────┤
│              Blockchain Layer (ethers-rs)              │
│  Uniswap │ Aave │ Balancer │ dYdX │ Custom DEXes    │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- **Rust** 1.96+ (MSRV)
- **Node.js** 20+ (for Tauri desktop app and TypeScript tooling)
- **Docker** 24+ (for containerized deployment)
- **PostgreSQL** 15+ (production) or SQLite (development)
- **Foundry** (for Solidity contract development/testing)

## Quick Start (Development)

```bash
# 1. Clone and enter backend directory
cd backend

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# 3. Build
cargo build --release

# 4. Initialize database (if using PostgreSQL)
cargo run --bin db-init

# 5. Run server
cargo run --bin allbright-c2-backend
```

## Docker Deployment

```bash
# Build and run with Docker Compose (from project root)
docker compose up --build

# Or build manually
docker build -f backend/Dockerfile -t allbright-c2 .

# Run
docker run -d \
  --name allbright-c2 \
  -p 3000:3000 \
  -p 50051:50051 \
  -v /path/to/certs:/app/certs \
  -e DATABASE_URL=postgres://... \
  allbright-c2
```

## Kubernetes Deployment

```bash
# Create namespace and deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# Verify
kubectl get pods -n allbright
```

## Smart Contract Development

```bash
# Navigate to contracts directory
cd contracts

# Install dependencies
forge install

# Run tests
forge test

# Deploy (example)
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PK --broadcast
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `C2_BIND_ADDR` | gRPC bind address | `0.0.0.0:50051` |
| `HTTP_BIND_ADDR` | HTTP API bind address | `0.0.0.0:3000` |
| `DATABASE_URL` | Database connection string | `postgres://localhost/allbright` |
| `C2_CERT_DIR` | TLS certificate directory | `./certs` |
| `GROQ_API_KEY` | Groq AI provider API key | (required) |
| `OPENROUTER_API_KEY` | OpenRouter AI provider key | (required) |

## API Endpoints

### HTTP (Port 3000)
- `POST /agent/{id}/execute` - Execute an AI agent by ID
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics (if enabled)

### gRPC (Port 50051)
- `C2Service/Heartbeat` - Node heartbeat
- `C2Service/SyncState` - State synchronization
- `C2Service/SubmitTrade` - Submit trade order

## Project Structure

```
AB4/
├── backend/           # Rust backend (C2 server)
│   ├── main.rs        # Entry point
│   ├── Cargo.toml     # Dependencies
│   ├── Dockerfile     # Production build
│   ├── .env.example   # Environment template
│   ├── contracts/     # Solidity interaction modules
│   ├── ai/            # AI provider integrations
│   ├── learning/      # Machine learning components
│   ├── data/          # Data pipeline modules
│   ├── models/        # ML models
│   ├── src/           # Supplementary binaries
│   └── benches/       # Performance benchmarks
├── contracts/         # Solidity smart contracts
│   ├── FlashLoanArbitrage.sol
│   ├── CircuitBreaker.sol
│   ├── Foundry.toml
│   └── test/
├── src-tauri/         # Tauri desktop application
├── k8s/               # Kubernetes manifests
├── crates/            # Auxiliary Rust crates
│   ├── governance/    # Governance crate
│   └── micropath/     # Micro-path optimization
├── prometheus/        # Prometheus config
├── scripts/           # Utility scripts
├── docker-compose.yml # Orchestration
├── main.tf            # Terraform infrastructure
└── monolith/          # Monolith analysis
```

## Security

- **TLS** - Mutual TLS is supported via certificate directory (`C2_CERT_DIR`)
- **JWT** - JSON Web Token authentication available via `jsonwebtoken` crate
- **AES-256-GCM** - Encrypted vault for sensitive data
- **Argon2id** - Memory-hard password hashing
- **Zeroize** - Secure memory clearing for secrets
- **Secrecy** - Secrets management crate for runtime secret handling
- **Circuit Breaker** - Emergency stop mechanism for flash loan operations

## Performance

- **Fixed Point Core** - Deterministic arithmetic without floating-point errors
- **Fat LTO** - Link-time optimization enabled for release builds
- **SIMD** - SIMD memory operations for hot paths
- **Multi-Objective Solver** - Pareto-optimal trade execution

## License

Proprietary - Allbright DeFi Software Engineering PLC

## Support

For issues, refer to the deployment documentation:
- `DEPLOYMENT.md`
- `DEPLOYMENT_READINESS_AUDIT.md`
- `LIVE_PRODUCTION_MODE_GUIDE.md`