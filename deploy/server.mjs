#!/usr/bin/env node
/**
 * YYC³ CloudPivot Intelli-Matrix — 本地部署服务器
 * ================================================
 * 
 * 功能:
 *   1. 静态文件托管 (Vite build 产物 dist/)
 *   2. Ollama API 反向代理 (/api/v1/llm/ollama/* → localhost:11434/api/*)
 *   3. SPA 路由回退 (所有非 API/非文件路由 → index.html)
 *   4. CORS 全放行 (内网部署)
 *   5. Gzip 压缩 (可选)
 *
 * 零依赖 — 仅使用 Node.js 内置模块 (http, fs, path, url)
 *
 * 用法:
 *   node deploy/server.mjs                    # 默认 0.0.0.0:3118
 *   PORT=8080 node deploy/server.mjs          # 自定义端口
 *   OLLAMA_HOST=192.168.3.10 node deploy/mjs  # 自定义 Ollama 地址
 *
 * 环境变量:
 *   PORT          — 监听端口 (默认 3118)
 *   HOST          — 监听地址 (默认 0.0.0.0, 局域网可访问)
 *   OLLAMA_HOST   — Ollama 主机 (默认 127.0.0.1)
 *   OLLAMA_PORT   — Ollama 端口 (默认 11434)
 *   DIST_DIR      — 静态文件目录 (默认 ../dist, 相对于此脚本)
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";

// ============================================================
// 配置
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3118", 10);
const HOST = process.env.HOST || "0.0.0.0";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1";
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || "11434", 10);
const DIST_DIR = path.resolve(__dirname, process.env.DIST_DIR || "../dist");

/** Ollama 代理前缀 */
const OLLAMA_PROXY_PREFIX = "/api/v1/llm/ollama";
/** DGX vLLM 反代（落档 39：浏览器直连被 CORS 拒，走面板同源代理） */
const DGX_PROXY_PREFIX = "/api/v1/llm/dgx";
const DGX_UPSTREAM = (() => {
  try { return new URL(process.env.PMO_DGX_URL || "http://100.65.64.49:8888"); }
  catch { return new URL("http://100.65.64.49:8888"); }
})();

/** NAS 统一网关反代（落档 43：api.0379.world / TS 100.65.172.88:8000，vk 认证）
 *  头翻译：面板 provider 统一发 Authorization: Bearer <vk>，NAS 网关收 X-API-Key——
 *  代理层把 Bearer 令牌改写为 X-API-Key 上送（凭据只经 persist/UI，不落代码）。 */
const NAS_PROXY_PREFIX = "/api/v1/llm/nas";
const NAS_UPSTREAM = (() => {
  try { return new URL(process.env.PMO_NAS_URL || "http://100.65.172.88:8000"); }
  catch { return new URL("http://100.65.172.88:8000"); }
})();

/** 云端上游同源反代白名单（落档 44）：浏览器直连 bigmodel 被 CORS 阻断（实证），
 *  deepseek 虽放行但统一走反代可规避 Electron/离线差异。仅允许固定上游，非开放代理。 */
const UPSTREAMS = {
  zhipu: { prefix: "/api/v1/llm/zhipu", url: process.env.PMO_ZHIPU_URL || "https://open.bigmodel.cn" },
  deepseek: { prefix: "/api/v1/llm/deepseek", url: process.env.PMO_DEEPSEEK_URL || "https://api.deepseek.com" },
};

/** MIME 类型映射 */
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".map":  "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt":  "text/plain; charset=utf-8",
  ".xml":  "text/xml; charset=utf-8",
};

// ============================================================
// CORS 头 (内网全放行)
// ============================================================

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Api-Key");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ============================================================
// Ollama 反向代理
// ============================================================

/**
 * 将 /api/v1/llm/ollama/xxx 代理到 http://OLLAMA_HOST:OLLAMA_PORT/api/xxx
 */
function proxyToOllama(req, res, subPath) {
  const ollamaPath = `/api/${subPath}`;
  const ollamaUrl = `http://${OLLAMA_HOST}:${OLLAMA_PORT}${ollamaPath}`;

  const proxyOptions = {
    hostname: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: ollamaPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${OLLAMA_HOST}:${OLLAMA_PORT}`,
    },
  };

  // 移除浏览器自动添加的不需要的头
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${ollamaUrl} → ${err.message}`);
    setCorsHeaders(res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Ollama proxy error",
      message: err.message,
      target: ollamaUrl,
      suggestion: "请确认 Ollama 已启动: ollama serve",
    }));
  });

  // 转发请求体 (POST/PUT)
  req.pipe(proxyReq, { end: true });
}

/**
 * 将 /api/v1/llm/dgx/xxx 代理到 DGX_UPSTREAM/xxx（vLLM OpenAI 兼容面）
 */
function proxyToDgx(req, res, subPath) {
  const target = new URL(`/${subPath}`, DGX_UPSTREAM);
  const proxyOptions = {
    hostname: DGX_UPSTREAM.hostname,
    port: DGX_UPSTREAM.port || 80,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, host: DGX_UPSTREAM.host },
  };
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${target.href} → ${err.message}`);
    setCorsHeaders(res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "DGX proxy error", message: err.message, target: target.href }));
  });
  req.pipe(proxyReq, { end: true });
}

function proxyToNas(req, res, subPath) {
  const target = new URL(`/${subPath}`, NAS_UPSTREAM);
  const headers = { ...req.headers, host: NAS_UPSTREAM.host };
  // Bearer → X-API-Key 头翻译（vk- 令牌）：NAS 网关只认 X-API-Key
  const auth = headers["authorization"];
  if (auth && typeof auth === "string" && auth.startsWith("Bearer ") && !headers["x-api-key"]) {
    headers["x-api-key"] = auth.slice("Bearer ".length).trim();
    delete headers["authorization"];
  }
  const proxyOptions = {
    hostname: NAS_UPSTREAM.hostname,
    port: NAS_UPSTREAM.port || 80,
    path: target.pathname + target.search,
    method: req.method,
    headers,
  };
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${target.href} → ${err.message}`);
    setCorsHeaders(res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "NAS proxy error", message: err.message, target: target.href }));
  });
  req.pipe(proxyReq, { end: true });
}

/** 云端上游反代（落档 44）：固定白名单上游，https 直连，透传认证头 */
function proxyToUpstream(req, res, upstreamUrl, subPath) {
  const upstream = new URL(upstreamUrl);
  const target = new URL(`/${subPath}`, upstream);
  // URL 归一：//v1/... → /v1/...（前端可能拼出双斜杠）
  const safePath = (target.pathname + target.search).replace(/^\/{2,}/, "/");
  const headers = { ...req.headers, host: upstream.host };
  delete headers["origin"];
  delete headers["referer"];
  const proxyOptions = {
    hostname: upstream.hostname,
    port: upstream.port || 443,
    path: safePath,
    method: req.method,
    headers,
  };
  const proxyReq = https.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${target.href} → ${err.message}`);
    setCorsHeaders(res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "upstream proxy error", message: err.message, target: target.href }));
  });
  req.pipe(proxyReq, { end: true });
}

// ============================================================
// 静态文件服务
// ============================================================

function serveStatic(req, res) {
  const urlPath = new URL(req.url || "/", `http://${HOST}`).pathname;
  
  // 安全: 防止路径遍历
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(DIST_DIR, safePath);

  // 检查文件是否存在
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // 缓存策略: 带 hash 的资源长缓存, 其他短缓存
    const isHashed = /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "public, max-age=60";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    });
    createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

// ============================================================
// SPA 回退 (index.html)
// ============================================================

function serveSPAFallback(req, res) {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("index.html not found. Did you run `pnpm build`?");
  }
}

// ============================================================
// 请求处理
// ============================================================

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  const urlPath = new URL(req.url || "/", `http://${HOST}`).pathname;

  // ── CORS 预检 ──
  if (method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Ollama 代理 ──
  if (urlPath.startsWith(OLLAMA_PROXY_PREFIX)) {
    const subPath = urlPath.slice(OLLAMA_PROXY_PREFIX.length).replace(/^\//, "");
    setCorsHeaders(res);
    proxyToOllama(req, res, subPath);
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] PROXY ${method} ${urlPath} → ollama:${OLLAMA_PORT}/api/${subPath}`);
    return;
  }

  // ── DGX vLLM 代理 ──
  if (urlPath.startsWith(DGX_PROXY_PREFIX)) {
    const subPath = urlPath.slice(DGX_PROXY_PREFIX.length).replace(/^\//, "");
    setCorsHeaders(res);
    proxyToDgx(req, res, subPath);
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] PROXY ${method} ${urlPath} → dgx:${DGX_UPSTREAM.port}/${subPath}`);
    return;
  }

  // ── NAS 统一网关代理（vk 认证经 Bearer→X-API-Key 翻译）──
  if (urlPath.startsWith(NAS_PROXY_PREFIX)) {
    const subPath = urlPath.slice(NAS_PROXY_PREFIX.length).replace(/^\//, "");
    setCorsHeaders(res);
    proxyToNas(req, res, subPath);
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] PROXY ${method} ${urlPath} → nas:${NAS_UPSTREAM.host}/${subPath}`);
    return;
  }

  // ── 云端上游反代（zhipu/deepseek 白名单，落档 44）──
  for (const [name, up] of Object.entries(UPSTREAMS)) {
    if (urlPath.startsWith(up.prefix)) {
      const subPath = urlPath.slice(up.prefix.length).replace(/^\//, "");
      setCorsHeaders(res);
      proxyToUpstream(req, res, up.url, subPath);
      const ts = new Date().toISOString().slice(11, 19);
      console.log(`[${ts}] PROXY ${method} ${urlPath} → ${name}:${new URL(up.url).host}/${subPath}`);
      return;
    }
  }

  // ── 静态文件 ──
  if (serveStatic(req, res)) {
    return;
  }

  // ── SPA 回退 ──
  serveSPAFallback(req, res);
});

// ============================================================
// 启动
// ============================================================

server.listen(PORT, HOST, () => {
  const interfaces = getNetworkInterfaces();
  
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  YYC³ CloudPivot Intelli-Matrix · Local Deploy Server   ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  📂 静态文件:   ${DIST_DIR}`);
  console.log(`  🔗 Ollama 代理: ${OLLAMA_PROXY_PREFIX}/* → http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/*`);
  console.log("");
  console.log("  🌐 访问地址:");
  console.log(`     Local:   http://localhost:${PORT}`);
  for (const addr of interfaces) {
    console.log(`     Network: http://${addr}:${PORT}`);
  }
  console.log("");
  console.log("  📡 Ollama 端点测试:");
  console.log(`     curl http://localhost:${PORT}${OLLAMA_PROXY_PREFIX}/tags`);
  console.log(`     curl -X POST http://localhost:${PORT}${OLLAMA_PROXY_PREFIX}/chat \\`);
  console.log(`       -H 'Content-Type: application/json' \\`);
  console.log(`       -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"hi"}],"stream":false}'`);
  console.log("");
  console.log("  按 Ctrl+C 停止服务器");
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n  🛑 服务器已停止\n");
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

// ============================================================
// 工具函数
// ============================================================

function getNetworkInterfaces() {
  const addrs = [];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          addrs.push(net.address);
        }
      }
    }
  } catch {
    addrs.push("192.168.3.x");
  }
  return addrs;
}