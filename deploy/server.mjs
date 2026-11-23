#!/usr/bin/env node
/**
 * YYC³ CloudPivot Matrix Ops — 本地部署服务器
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
import net from "node:net";
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
/** NAS 统一网关反代（落档 43：api.0379.world / TS 100.65.172.88:8000，vk 认证）
 *  头翻译：面板 provider 统一发 Authorization: Bearer <vk>，NAS 网关收 X-API-Key——
 *  代理层把 Bearer 令牌改写为 X-API-Key 上送（凭据只经 persist/UI，不落代码）。 */
const NAS_PROXY_PREFIX = "/api/v1/llm/nas";

/** 运行时上游（落档 65）——「系统管理 → 数据源」经 /api/config/sources 可改并持久化。
 *  环境变量仅作首次默认值，不再是唯一事实源；改完立即生效、无需重启。 */
const DEFAULT_SOURCES = {
  ollama: process.env.PMO_OLLAMA_URL || `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,
  dgx: process.env.PMO_DGX_URL || "http://100.65.64.49:8888",
  nas: process.env.PMO_NAS_URL || "http://100.65.172.88:8000",
  // 云端上游固定白名单（落档 44），只允许改服务商根地址，不允许改成任意主机
  zhipu: process.env.PMO_ZHIPU_URL || "https://open.bigmodel.cn",
  deepseek: process.env.PMO_DEEPSEEK_URL || "https://api.deepseek.com",
};
const SOURCES_CONFIG_PATH = process.env.PMO_SOURCES_CONFIG
  || path.join(__dirname, ".sources.json");
/** 允许经面板编辑的键：本地自用基础设施（必须在私网）+ 两家云端上游（固定域名白名单） */
const EDITABLE_SOURCE_KEYS = ["ollama", "dgx", "nas"];
const CLOUD_SOURCE_HOSTS = {
  zhipu: ["open.bigmodel.cn"],
  deepseek: ["api.deepseek.com"],
};
const RUNTIME_SOURCES = loadSourcesConfig();

/** 私网/本机/Tailscale/局域网判定——与服务端「不做出网转接」一致 */
function isPrivateHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (!h) { return false; }
  if (h === "localhost" || h === "::1" || h === "[::1]" || h.endsWith(".local")) { return true; }
  if (h.includes(":")) {
    // IPv6：环回 / 链路本地 / 唯一本地地址
    return h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd");
  }
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) { return true; }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) { return true; }
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) { return true; } // Tailscale CGNAT
  return false;
}

/** 校验并归一化上游地址：只允许 http/https、禁止内嵌凭据、禁止私网以外的地址 */
function normalizeUpstreamUrl(raw, key) {
  const text = String(raw || "").trim();
  if (!text) { throw new Error("地址不能为空"); }
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error("地址格式不合法（需要完整 scheme）"); }
  if (!/^https?:$/.test(parsed.protocol)) { throw new Error("只允许 http:// 或 https://"); }
  if (parsed.username || parsed.password) { throw new Error("地址不允许内嵌凭据"); }
  if (CLOUD_SOURCE_HOSTS[key]) {
    if (parsed.protocol !== "https:") { throw new Error(`${key} 上游必须使用 https`); }
    if (!CLOUD_SOURCE_HOSTS[key].includes(parsed.hostname)) {
      throw new Error(`${key} 只允许固定上游域名：${CLOUD_SOURCE_HOSTS[key].join(", ")}`);
    }
  } else if (!isPrivateHost(parsed.hostname)) {
    throw new Error("公网地址被拒绝：本地自用、数据不出本地，只允许本机 / 局域网 / Tailscale");
  }
  return parsed.href.replace(/\/+$/, "");
}

/** 启动装载：文件 > 环境变量默认值；损坏/非法条目忽略并告警（不阻塞启动） */
function loadSourcesConfig() {
  const sources = { ...DEFAULT_SOURCES };
  try {
    if (fs.existsSync(SOURCES_CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(SOURCES_CONFIG_PATH, "utf8"));
      for (const key of Object.keys(sources)) {
        if (typeof saved?.[key] !== "string") { continue; }
        try { sources[key] = normalizeUpstreamUrl(saved[key], key); }
        catch (e) { console.warn(`[sources] 忽略非法配置 ${key}=${saved[key]}：${e.message}`); }
      }
    }
  } catch (e) {
    console.warn(`[sources] 配置读取失败（使用默认值）：${e.message}`);
  }
  return sources;
}

/** 原子落盘（tmp + rename），只存地址，不存任何凭据 */
function persistSourcesConfig(patch) {
  const next = { ...RUNTIME_SOURCES };
  for (const key of Object.keys(patch)) {
    if (!EDITABLE_SOURCE_KEYS.includes(key) && !CLOUD_SOURCE_HOSTS[key]) {
      throw new Error(`源「${key}」不可编辑`);
    }
    next[key] = normalizeUpstreamUrl(patch[key], key);
  }
  const tmp = `${SOURCES_CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, SOURCES_CONFIG_PATH);
  for (const key of Object.keys(next)) { RUNTIME_SOURCES[key] = next[key]; }
  return next;
}

/** 读取 JSON 请求体（上限 64KB） */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) { reject(new Error("请求体过大")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("请求体不是合法 JSON")); }
    });
    req.on("error", reject);
  });
}

/** 云端上游反代白名单（落档 44/65）：地址来自运行时配置，仍只允许固定域名，非开放代理。 */
function getUpstreams() {
  return {
    zhipu: { prefix: "/api/v1/llm/zhipu", url: RUNTIME_SOURCES.zhipu },
    deepseek: { prefix: "/api/v1/llm/deepseek", url: RUNTIME_SOURCES.deepseek },
  };
}

/** 依协议选择 http/https 客户端（落档 65：原实现写死 http.request，https 上游会打错协议） */
function requestClient(url) {
  return url.protocol === "https:" ? https : http;
}

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
  const upstream = new URL(RUNTIME_SOURCES.ollama);
  const target = new URL(ollamaPath, upstream);
  const ollamaUrl = target.href;

  const proxyOptions = {
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    path: (target.pathname + target.search).replace(/^\/{2,}/, "/"),
    method: req.method,
    headers: {
      ...req.headers,
      host: upstream.host,
    },
  };

  // 移除浏览器自动添加的不需要的头
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = requestClient(upstream).request(proxyOptions, (proxyRes) => {
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
 * 将 /api/v1/llm/dgx/xxx 代理到运行时配置的 DGX 上游（vLLM OpenAI 兼容面）
 */
function proxyToDgx(req, res, subPath) {
  const upstream = new URL(RUNTIME_SOURCES.dgx);
  const target = new URL(`/${subPath}`, upstream);
  const proxyOptions = {
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    path: (target.pathname + target.search).replace(/^\/{2,}/, "/"),
    method: req.method,
    headers: { ...req.headers, host: upstream.host },
  };
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = requestClient(upstream).request(proxyOptions, (proxyRes) => {
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
  const upstream = new URL(RUNTIME_SOURCES.nas);
  const target = new URL(`/${subPath}`, upstream);
  const headers = { ...req.headers, host: upstream.host };
  // Bearer → X-API-Key 头翻译（vk- 令牌）：NAS 网关只认 X-API-Key
  const auth = headers["authorization"];
  if (auth && typeof auth === "string" && auth.startsWith("Bearer ") && !headers["x-api-key"]) {
    headers["x-api-key"] = auth.slice("Bearer ".length).trim();
    delete headers["authorization"];
  }
  const proxyOptions = {
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    path: (target.pathname + target.search).replace(/^\/{2,}/, "/"),
    method: req.method,
    headers,
  };
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = requestClient(upstream).request(proxyOptions, (proxyRes) => {
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

  // ── 数据源运行时配置（落档 65：系统管理 → 数据源 的生效面）──
  if (urlPath === "/api/config/sources") {
    setCorsHeaders(res);
    if (method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        sources: RUNTIME_SOURCES,
        editable: EDITABLE_SOURCE_KEYS,
        configPath: SOURCES_CONFIG_PATH,
      }));
      return;
    }
    if (method === "PUT") {
      readJsonBody(req)
        .then((body) => {
          const patch = (body && typeof body === "object" && body.sources && typeof body.sources === "object")
            ? body.sources
            : body;
          const next = persistSourcesConfig(patch || {});
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, sources: next }));
          const ts = new Date().toISOString().slice(11, 19);
          console.log(`[${ts}] CONFIG 数据源上游已更新: ${JSON.stringify(patch)}`);
        })
        .catch((err) => {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });
      return;
    }
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "只支持 GET / PUT" }));
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
    console.log(`[${ts}] PROXY ${method} ${urlPath} → dgx:${new URL(RUNTIME_SOURCES.dgx).host}/${subPath}`);
    return;
  }

  // ── NAS 统一网关代理（vk 认证经 Bearer→X-API-Key 翻译）──
  if (urlPath.startsWith(NAS_PROXY_PREFIX)) {
    const subPath = urlPath.slice(NAS_PROXY_PREFIX.length).replace(/^\//, "");
    setCorsHeaders(res);
    proxyToNas(req, res, subPath);
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] PROXY ${method} ${urlPath} → nas:${new URL(RUNTIME_SOURCES.nas).host}/${subPath}`);
    return;
  }

  // ── 云端上游反代（zhipu/deepseek 白名单，落档 44）──
  for (const [name, up] of Object.entries(getUpstreams())) {
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
// WebSocket 反代（落档 68 / C-2）：ws://<面板同源>/ws → agent ws://127.0.0.1:3113/ws
// 远程（Tailscale/局域网）客户端经 3118 同源连 WS，token 查询参数透传由 agent 校验。
// 落档 57 挂账「远程部署无 /ws 反代」的清账实现：upgrade 握手后字节级双通道转发。
// ============================================================

const AGENT_WS_PORT = parseInt(process.env.PMO_AGENT_WS_PORT || "3113", 10);
const WS_PROXY_PATH = "/ws";

server.on("upgrade", (req, socket, head) => {
  let pathname = "/";
  try {
    pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
  } catch { /* 保持默认 */ }
  if (pathname !== WS_PROXY_PATH) {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  const upstream = net.connect(AGENT_WS_PORT, "127.0.0.1", () => {
    // 原样转发升级请求行与头（Host 改写为 agent 侧，Sec-WebSocket-* 原样透传）
    const headerLines = [`GET ${req.url} HTTP/1.1`];
    for (const [key, value] of Object.entries(req.headers)) {
      if (key === "host") { headerLines.push(`host: 127.0.0.1:${AGENT_WS_PORT}`); continue; }
      if (Array.isArray(value)) { value.forEach((v) => headerLines.push(`${key}: ${v}`)); continue; }
      if (typeof value === "string") { headerLines.push(`${key}: ${value}`); }
    }
    upstream.write(headerLines.join("\r\n") + "\r\n\r\n");
    if (head && head.length > 0) { upstream.write(head); }
    // 上游响应头原样回给客户端（101 等），随后双向管道
    let upgraded = false;
    upstream.on("data", (chunk) => {
      if (!upgraded) {
        // 逐块扫到 \r\n\r\n 再整块转（首包通常已含完整头）
        upgraded = true;
        socket.write(chunk);
        return;
      }
      socket.write(chunk);
    });
    upstream.on("error", () => {
      socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
      socket.destroy();
    });
    socket.on("data", (chunk) => upstream.write(chunk));
  });
  const teardown = () => { socket.destroy(); upstream.destroy(); };
  socket.on("error", teardown);
  socket.on("close", () => upstream.destroy());
  upstream.on("close", () => socket.destroy());
  upstream.on("end", teardown);
});

// ============================================================
// 启动
// ============================================================

server.listen(PORT, HOST, () => {
  const interfaces = getNetworkInterfaces();
  
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  YYC³ CloudPivot Matrix Ops · Local Deploy Server   ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  📂 静态文件:   ${DIST_DIR}`);
  console.log(`  🔗 Ollama 代理: ${OLLAMA_PROXY_PREFIX}/* → ${RUNTIME_SOURCES.ollama}/api/*`);
  console.log(`  🔗 数据源上游: nas=${RUNTIME_SOURCES.nas} dgx=${RUNTIME_SOURCES.dgx}`);
  console.log(`  ⚙️  数据源配置: ${SOURCES_CONFIG_PATH}（经 /api/config/sources 可改，立即生效）`);
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