/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import * as fs from "fs";
import cors from "cors";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const PORT = parseInt(process.env.PORT || "3002");

// Normalize the backend URL: Render's `hostport`/`host` service properties may
// omit the scheme (e.g. "allbright-backend.onrender.com:443"). new URL() needs
// a scheme, so default to https:// when one is not provided.
function normalizeBackendUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "http://localhost:3001";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // If it looks like host:443 assume https, otherwise https by default in prod.
  return `https://${trimmed}`;
}

const BACKEND_URL = normalizeBackendUrl(process.env.RUST_BACKEND_URL || "http://localhost:3001");
const API_KEY = process.env.RUST_API_KEY || "default-api-key-change-me";

async function proxyRequest(req: express.Request, res: express.Response, backendPath: string) {
  try {
    const url = new URL(backendPath, BACKEND_URL);
    const headers: Record<string, string> = {};
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        ...headers,
        "x-api-key": API_KEY,
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).type("text/plain").send(text);
    }
  } catch (err: any) {
    console.error(`Proxy error for ${backendPath}:`, err.message);
    res.status(502).json({ error: "Backend proxy error", details: err.message });
  }
}

app.get("/api/health", async (req, res) => {
  try {
    const url = new URL("/healthz", BACKEND_URL);
    const response = await fetch(url.toString(), {
      headers: { "x-api-key": API_KEY },
    });
    const text = await response.text();
    res.status(response.status).json({ status: text === "ok" ? "ok" : text, backend: true });
  } catch (err: any) {
    console.error(`Proxy error for /api/health:`, err.message);
    res.status(502).json({ error: "Backend proxy error", details: err.message });
  }
});

app.get("/api/metrics", (req, res) => {
  proxyRequest(req, res, "/api/metrics");
});

app.get("/api/opportunities", (req, res) => {
  proxyRequest(req, res, "/api/opportunities");
});

app.get("/api/settings", (req, res) => {
  proxyRequest(req, res, "/api/settings");
});

app.post("/api/settings", (req, res) => {
  proxyRequest(req, res, "/api/settings");
});

app.get("/api/wallet", (req, res) => {
  proxyRequest(req, res, "/api/wallet");
});

app.post("/api/wallet/deposit", (req, res) => {
  proxyRequest(req, res, "/api/wallet/deposit");
});

app.post("/api/wallet/withdraw", (req, res) => {
  proxyRequest(req, res, "/api/wallet/withdraw");
});

app.post("/api/wallet/transfer-profit", (req, res) => {
  proxyRequest(req, res, "/api/wallet/transfer-profit");
});

app.post("/api/execute", (req, res) => {
  proxyRequest(req, res, "/api/execute");
});

app.post("/api/copilot", (req, res) => {
  proxyRequest(req, res, "/api/copilot");
});

app.get("/api/preflight/status", (req, res) => {
  proxyRequest(req, res, "/api/preflight/status");
});

app.get("/api/simulation/status", (req, res) => {
  proxyRequest(req, res, "/api/simulation/status");
});

app.get("/api/deploy/status", (req, res) => {
  proxyRequest(req, res, "/api/deploy/status");
});

app.post("/api/deploy", (req, res) => {
  proxyRequest(req, res, "/api/deploy");
});

app.get("/api/governance/cards", (req, res) => {
  proxyRequest(req, res, "/api/governance/cards");
});

app.get("/api/security/layers/metrics", (req, res) => {
  proxyRequest(req, res, "/api/security/layers/metrics");
});

app.get("/api/security/validate", (req, res) => {
  proxyRequest(req, res, "/api/security/validate");
});

app.get("/api/kpis", (req, res) => {
  proxyRequest(req, res, "/api/kpis");
});

app.get("/api/fleet/status", (req, res) => {
  proxyRequest(req, res, "/api/fleet/status");
});

app.get("/api/profit/metrics", (req, res) => {
  proxyRequest(req, res, "/api/profit/metrics");
});

app.get("/api/auto-transfer/status", (req, res) => {
  proxyRequest(req, res, "/api/auto-transfer/status");
});

app.post("/api/auto-transfer/trigger", (req, res) => {
  proxyRequest(req, res, "/api/auto-transfer/trigger");
});

app.get("/api/deployment/logs", (req, res) => {
  proxyRequest(req, res, "/api/deployment/logs");
});

app.get("/api/deployment/status", (req, res) => {
  proxyRequest(req, res, "/api/deployment/status");
});

app.post("/api/deployment/authorize", (req, res) => {
  proxyRequest(req, res, "/api/deployment/authorize");
});

app.post("/api/deployment/run", (req, res) => {
  proxyRequest(req, res, "/api/deployment/run");
});

app.post("/api/deployment/approve", (req, res) => {
  proxyRequest(req, res, "/api/deployment/approve");
});

app.post("/api/deployment/reset", (req, res) => {
  proxyRequest(req, res, "/api/deployment/reset");
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite development server - removed for production to avoid runtime dependency
    // In production, static files are served directly from dist/
  } else {
    const distPath = path.join(__dirname, "..", "dist");

    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const safePath = req.path.split("?")[0];
      const filePath = path.join(distPath, safePath === "/" ? "index.html" : safePath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = ext === ".js" ? "application/javascript" :
                           ext === ".css" ? "text/css" :
                           ext === ".html" ? "text/html" :
                           ext === ".json" ? "application/json" :
                           ext === ".png" ? "image/png" :
                           ext === ".svg" ? "image/svg+xml" :
                           "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on("error", () => next());
      } else {
        next();
      }
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Allbright Dashboard running at http://0.0.0.0:${PORT}`);
    console.log(`Proxying API to Rust backend at ${BACKEND_URL}`);
  });
}

startServer();
