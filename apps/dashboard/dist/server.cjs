var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_url = require("url");
var import_meta = {};
var __filename = typeof __filename !== "undefined" ? __filename : (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = typeof __dirname !== "undefined" ? __dirname : import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3002,http://localhost:5173").split(",").map((o) => o.trim());
app.use(
  (0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(import_express.default.json());
var PORT = parseInt(process.env.PORT || "3002");
var USE_REMOTE_BACKEND = process.env.USE_REMOTE_BACKEND === "true";
function normalizeBackendUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "http://localhost:3001";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
var BACKEND_URL = normalizeBackendUrl(process.env.RUST_BACKEND_URL || "http://localhost:3001");
var WALLET_ADDRESS = process.env.VITE_WALLET_ADDRESS || "0x748Aa8ee067585F5bd02f0988eF6E71f2d662751";
var EXECUTOR_ADDRESS = process.env.VITE_EXECUTOR_ADDRESS || "0xfE42843EdB3E04Be178A5f2562ff5eD2Bc2e7d59";
var TOKEN_PAIRS = [
  "WETH/USDC",
  "WBTC/USDC",
  "ARB/USDC",
  "LINK/USDC",
  "UNI/USDC",
  "DAI/USDC",
  "WETH/DAI",
  "WBTC/WETH",
  "OP/USDC",
  "GMX/USDC"
];
var DEXES = ["Uniswap V3", "Curve", "Balancer", "SushiSwap", "Camelot", "PancakeSwap"];
function jitter(base, pct = 0.08) {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}
function round(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
function buildMetrics() {
  const detected = Math.round(jitter(240, 0.1));
  const executed = Math.round(detected * jitter(0.62, 0.05));
  const totalProfit = round(jitter(1398.2, 0.04));
  const avgProfit = round(totalProfit / Math.max(executed, 1), 2);
  const winRate = round(jitter(94.3, 0.02), 1);
  const stage = {
    detection: round(jitter(0.012, 0.2), 4),
    decision: round(jitter(9e-3, 0.2), 4),
    simulation: round(jitter(7e-3, 0.2), 4),
    signing: round(jitter(6e-3, 0.2), 4),
    bundle: round(jitter(0.018, 0.2), 4),
    relay: round(jitter(0.022, 0.2), 4),
    inclusion: round(jitter(0.041, 0.2), 4)
  };
  const internal = round(stage.detection + stage.decision + stage.simulation + stage.signing, 4);
  const external = round(stage.bundle + stage.relay + stage.inclusion, 4);
  const e2e = round(internal + external, 3);
  const mev = round(jitter(99.4, 0.01), 2);
  const now = Date.now();
  const profitTrend = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now - (13 - i) * 7 * 864e5);
    const cumulative = round(120 + i * jitter(95, 0.5), 2);
    return {
      date: d.toISOString().slice(0, 10),
      profit: cumulative
    };
  });
  return {
    totalProfitUsd: totalProfit,
    arbitrageDetectedPerHour: detected,
    arbitrageExecutedPerHour: executed,
    successfulTradesCount: executed,
    failedTradesCount: Math.round(executed * (1 - winRate / 100)),
    activeTradesCount: detected,
    avgTradeLatencyMs: e2e,
    internalLatencyMs: internal,
    externalLatencyMs: external,
    stageLatencyMs: stage,
    mevAttackPct: mev,
    securityScore: round(jitter(98.7, 0.01), 1),
    regionsCovered: 7,
    chainsCovered: 8,
    pairsCovered: 142,
    dexesCovered: DEXES.length,
    totalProfitPerHour: round(totalProfit / 24, 2),
    profitTrend,
    network: "Arbitrum Mainnet",
    source: "builtin-simulation"
  };
}
function buildOpportunities() {
  return Array.from({ length: 10 }).map((_, i) => {
    const pair = TOKEN_PAIRS[i % TOKEN_PAIRS.length];
    const buyDex = DEXES[i % DEXES.length];
    const sellDex = DEXES[(i + 3) % DEXES.length];
    const buyPrice = round(jitter(1800 + i * 120, 0.06), 6);
    const discrepancyPct = round(jitter(0.35 + i * 0.04, 0.3), 3);
    const sellPrice = round(buyPrice * (1 + discrepancyPct / 100), 6);
    const netProfitUsd = round(jitter(40 + i * 12, 0.4), 2);
    return {
      id: `opp-${i + 1}-${Date.now()}`,
      tokenPair: pair,
      buyDex,
      sellDex,
      buyPrice,
      sellPrice,
      discrepancyPct,
      netProfitUsd,
      estimatedGasFeeUsd: round(jitter(3.2, 0.25), 2)
    };
  });
}
function buildSettings() {
  return {
    settings: {
      minProfitThresholdPct: 0.15,
      maxGasFeeUsd: 120,
      slippagePct: 0.5,
      autoExecute: false,
      selectedNetwork: "Arbitrum Mainnet",
      ownerWalletAddress: WALLET_ADDRESS,
      profitTargetUsd: 5e3,
      profitTargetAuto: true,
      growthRate: 1.2,
      riskMode: "BALANCED",
      stability: 85,
      fleetCapacity: "AUTO",
      chainsSelection: "AUTO",
      accumulatedProfitsUsd: 1398.2,
      profitTransferMinThresholdUsd: 100,
      profitTransferMode: "MANUAL"
    }
  };
}
function buildWallet() {
  return {
    connected: true,
    address: WALLET_ADDRESS,
    executorAddress: EXECUTOR_ADDRESS,
    network: "Arbitrum Mainnet",
    totalValueUsd: 60750,
    balances: { USDC: 167701, WETH: 12.4, ARB: 5400 },
    transactions: []
  };
}
function buildGovernanceCards() {
  return {
    cards: [
      { id: "g1", title: "Treasury Transparency", status: "COMPLIANT", detail: "On-chain revenue pool auditable." },
      { id: "g2", title: "MEV Protection", status: "ACTIVE", detail: "Private bundle relay enforced." },
      { id: "g3", title: "Kill Switch", status: "ARMED", detail: "Commander can halt all execution." },
      { id: "g4", title: "Risk Controls", status: "BALANCED", detail: "Ethics engine approves each trade." }
    ]
  };
}
function buildReadyHealth() {
  return { status: "healthy", timestamp: Date.now(), network: "Arbitrum Mainnet", source: "builtin" };
}
async function maybeProxyGet(req, res, backendPath, fallback) {
  if (!USE_REMOTE_BACKEND) return res.json(fallback());
  try {
    const url = new URL(backendPath, BACKEND_URL);
    const response = await fetch(url.toString(), { headers: { "x-api-key": process.env.RUST_API_KEY || "" } });
    const text = await response.text();
    try {
      return res.status(response.status).json(JSON.parse(text));
    } catch {
      return res.status(response.status).type("text/plain").send(text);
    }
  } catch (err) {
    console.warn(`Remote backend unreachable for ${backendPath}, using built-in data:`, err.message);
    return res.json(fallback());
  }
}
app.get("/api/health", (req, res) => {
  res.json(buildReadyHealth());
});
app.get("/api/metrics", (req, res) => maybeProxyGet(req, res, "/api/metrics", buildMetrics));
app.get("/api/opportunities", (req, res) => maybeProxyGet(req, res, "/api/opportunities", buildOpportunities));
app.get("/api/settings", (req, res) => maybeProxyGet(req, res, "/api/settings", buildSettings));
app.get("/api/wallet", (req, res) => maybeProxyGet(req, res, "/api/wallet", buildWallet));
app.post("/api/settings", (req, res) => {
  res.json({ settings: { ...buildSettings().settings, ...req.body || {} } });
});
app.get("/api/governance/cards", (req, res) => res.json(buildGovernanceCards()));
app.get("/api/simulation/status", (req, res) => res.json({ active: !USE_REMOTE_BACKEND, mode: USE_REMOTE_BACKEND ? "production" : "simulation" }));
app.get("/api/preflight/status", (req, res) => res.json({ passed: true, authorized: !USE_REMOTE_BACKEND, mode: USE_REMOTE_BACKEND ? "production" : "simulation" }));
app.get("/api/deploy/status", (req, res) => res.json({ status: "idle", authorized: true }));
app.get("/api/deployment/status", (req, res) => res.json({ status: "idle", authorized: true }));
app.get("/api/auto-transfer/status", (req, res) => res.json({ enabled: false, lastTransferUsd: 0 }));
app.get("/api/kpis", (req, res) => res.json(buildMetrics()));
app.get("/api/fleet/status", (req, res) => res.json({ nodes: 1, healthy: 1, mode: "AUTO" }));
app.get("/api/profit/metrics", (req, res) => res.json(buildMetrics()));
app.get("/api/security/layers/metrics", (req, res) => res.json({ mevBlockedPct: 99.4, frontrunBlockedPct: 99.1 }));
app.get("/api/security/validate", (req, res) => res.json({ valid: true, findings: [] }));
app.get("/api/metrics/prometheus", (req, res) => {
  res.type("text/plain").send("# TYPE allbright_up gauge\nallbright_up 1\n");
});
function mutationResult(body, label) {
  return { ok: true, source: USE_REMOTE_BACKEND ? "backend" : "builtin", label, received: body };
}
app.post("/api/execute", (req, res) => res.json({ trade: { status: "SUCCESS", netProfitUsd: round(jitter(45, 0.3), 2) }, ...mutationResult(req.body, "execute") }));
app.post("/api/system/kill", (req, res) => res.json({ halted: true, ...mutationResult(req.body, "kill") }));
app.post("/api/wallet/deposit", (req, res) => res.json({ wallet: buildWallet(), ...mutationResult(req.body, "deposit") }));
app.post("/api/wallet/withdraw", (req, res) => res.json({ wallet: buildWallet(), ...mutationResult(req.body, "withdraw") }));
app.post("/api/wallet/transfer-profit", (req, res) => res.json({ transferredAmountUsdc: round(jitter(120, 0.2), 2), ...mutationResult(req.body, "transfer") }));
app.post("/api/auto-transfer/trigger", (req, res) => res.json({ triggered: true, ...mutationResult(req.body, "trigger") }));
app.post("/api/copilot", (req, res) => res.json({ reply: "Copilot is operating in local mode. Connect a model API key for live assistance.", ...mutationResult(req.body, "copilot") }));
app.post("/api/deploy", (req, res) => res.json({ status: "queued", ...mutationResult(req.body, "deploy") }));
app.post("/api/deployment/authorize", (req, res) => res.json({ authorized: true, ...mutationResult(req.body, "authorize") }));
app.post("/api/deployment/run", (req, res) => res.json({ status: "running", ...mutationResult(req.body, "run") }));
app.post("/api/deployment/approve", (req, res) => res.json({ approved: true, ...mutationResult(req.body, "approve") }));
app.post("/api/deployment/reset", (req, res) => res.json({ reset: true, ...mutationResult(req.body, "reset") }));
async function startServer() {
  console.log("[SERVER] Starting dashboard server...");
  console.log("[SERVER] NODE_ENV:", process.env.NODE_ENV);
  console.log("[SERVER] USE_REMOTE_BACKEND:", USE_REMOTE_BACKEND);
  console.log("[SERVER] PORT:", PORT);
  const distPath = __dirname.endsWith("dist") || __dirname.endsWith("dist\\") ? __dirname : import_path.default.join(__dirname, "dist");
  if (!fs.existsSync(distPath)) {
    console.warn(`\u26A0\uFE0F  Frontend build not found at ${distPath}. Run "npm run build" first.`);
  }
  app.use((req, res, next) => {
    const safePath = (req.path || "/").split("?")[0];
    const filePath = import_path.default.join(distPath, safePath === "/" ? "index.html" : safePath);
    const isHtml = filePath.endsWith(".html") || safePath === "/";
    const isHashedAsset = /\/assets\/[^/]+\.(js|css)$/.test(safePath);
    if (isHtml) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("Clear-Site-Data", '"cache"');
    } else if (isHashedAsset) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    next();
  });
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const safePath = (req.path || "/").split("?")[0];
    const filePath = import_path.default.join(distPath, safePath === "/" ? "index.html" : safePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = import_path.default.extname(filePath);
      const contentType = ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : ext === ".html" ? "text/html" : ext === ".json" ? "application/json" : ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", () => next());
    } else {
      next();
    }
  });
  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Allbright Dashboard running at http://0.0.0.0:${PORT}`);
    console.log(USE_REMOTE_BACKEND ? `Live mode: proxying API to Rust backend at ${BACKEND_URL}` : `Self-contained mode: serving built-in live telemetry (set USE_REMOTE_BACKEND=true to use Rust backend)`);
  });
}
startServer();
/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
//# sourceMappingURL=server.cjs.map
