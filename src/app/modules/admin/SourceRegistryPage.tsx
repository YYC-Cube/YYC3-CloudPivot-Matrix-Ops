/**
 * @file: SourceRegistryPage.tsx
 * @description: 系统管理 → 数据源 — 数据源注册表（增删改测 · 本地自用约束）落档 58
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [page],[admin],[data-source]
 */

import { useMemo, useState } from "react";
import {
  Check, Database, Pencil, PlugZap, Plus, RefreshCw, ShieldCheck, Trash2, X,
} from "lucide-react";
import {
  resolveSourceUrl, setSourceUrl, useSourceRegistry,
  type DataSourceEntry, type SourceKind, type SourceTestResult,
} from "../../store/slices/source-registry-slice";
import { useSettingsSSOT } from "../../store/slices/settings-ssot-slice";
import { GlassCard } from "../shared/GlassCard";

const KIND_LABELS: Record<SourceKind, string> = {
  "agent-ws": "节点代理 WS",
  opspanel: "OpsPanel",
  ollama: "Ollama",
  "nas-gateway": "NAS 网关",
  "dgx-vllm": "DGX vLLM",
  "reverse-proxy": "本地反代",
  db: "数据库",
  fs: "文件接口",
};

const KIND_TEST_PATH: Partial<Record<SourceKind, string>> = {
  opspanel: "/api/nodes",
  ollama: "/api/tags",
  "nas-gateway": "/v1/models",
  "dgx-vllm": "/v1/models",
  "reverse-proxy": "/",
};

/** 私网 / 本机 / Tailscale 判定：本地自用项目只允许这些目标 */
function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "::1" || h === "[::1]" || h.endsWith(".local")) { return true; }
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) { return true; }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) { return true; }
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) { return true; } // Tailscale CGNAT
  return false;
}

function validateSourceUrl(raw: string, kind: SourceKind): string | null {
  const url = raw.trim();
  if (!url) { return "地址不能为空"; }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch { return "地址格式不合法（需要完整 scheme）"; }
  const schemeOk = kind === "agent-ws"
    ? /^wss?:$/.test(parsed.protocol)
    : /^https?:$/.test(parsed.protocol);
  if (!schemeOk) {
    return kind === "agent-ws" ? "节点代理需 ws:// 或 wss://" : "该源需 http:// 或 https://";
  }
  if (parsed.username || parsed.password) { return "地址不允许内嵌凭据"; }
  if (!isLocalHost(parsed.hostname)) {
    return "公网地址被拒绝：本项目本地自用、数据不出本地，只允许本机 / 局域网 / Tailscale";
  }
  return null;
}

async function testHttp(url: string, path: string): Promise<SourceTestResult> {
  const started = performance.now();
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}${path}`, { signal: AbortSignal.timeout(6000) });
    const latencyMs = Math.round(performance.now() - started);
    return {
      at: Date.now(),
      ok: res.ok,
      detail: `HTTP ${res.status} · ${path}`,
      latencyMs,
    };
  } catch (err) {
    return {
      at: Date.now(),
      ok: false,
      detail: `不可达 / 跨域：${err instanceof Error ? err.message : String(err)}`,
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

function testAgentWs(url: string, token: string): Promise<SourceTestResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const target = token
      ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      : url;
    let settled = false;
    const done = (ok: boolean, detail: string) => {
      if (settled) { return; }
      settled = true;
      try { socket.close(); } catch { /* ignore */ }
      resolve({ at: Date.now(), ok, detail, latencyMs: Math.round(performance.now() - started) });
    };
    let socket: WebSocket;
    try {
      socket = new WebSocket(target);
    } catch (err) {
      resolve({ at: Date.now(), ok: false, detail: `无法建立连接：${String(err)}`, latencyMs: 0 });
      return;
    }
    const timer = setTimeout(() => done(false, "连接超时（6s）"), 6000);
    socket.onopen = () => {
      clearTimeout(timer);
      done(true, "WebSocket 已连通");
    };
    socket.onerror = () => {
      clearTimeout(timer);
      done(false, "连接失败（检查端点/令牌）");
    };
  });
}

export function SourceRegistryPage() {
  const sources = useSourceRegistry((s) => s.sources);
  const addSource = useSourceRegistry((s) => s.addSource);
  const updateSource = useSourceRegistry((s) => s.updateSource);
  const removeSource = useSourceRegistry((s) => s.removeSource);
  const recordTest = useSourceRegistry((s) => s.recordTest);
  const wsToken = useSettingsSSOT((s) => s.values.wsToken);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const [addKind, setAddKind] = useState<SourceKind>("ollama");
  const [addLabel, setAddLabel] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addNote, setAddNote] = useState("");

  const stats = useMemo(() => {
    const enabled = sources.filter((s) => s.enabled).length;
    const tested = sources.filter((s) => s.lastTest);
    const ok = tested.filter((s) => s.lastTest?.ok).length;
    return { total: sources.length, enabled, ok, tested: tested.length };
  }, [sources]);

  const runTest = async (entry: DataSourceEntry) => {
    setTestingId(entry.id);
    const url = resolveSourceUrl(entry);
    let result: SourceTestResult;
    if (entry.kind === "agent-ws") {
      result = await testAgentWs(url, wsToken?.trim() || "");
    } else if (entry.kind === "db") {
      result = { at: Date.now(), ok: false, detail: "未接：仓库内无 /api/db 后端，先补服务端再启用", latencyMs: 0 };
    } else if (entry.kind === "fs") {
      result = await testHttp(url, `/files${wsToken ? `?token=${encodeURIComponent(wsToken)}` : ""}`);
    } else {
      result = await testHttp(url, KIND_TEST_PATH[entry.kind] || "/");
    }
    recordTest(entry.id, result);
    setTestingId(null);
  };

  const runTestAll = async () => {
    setTestingAll(true);
    for (const entry of sources.filter((s) => s.enabled)) {
      // 顺序执行，避免同时打满本机服务
      await runTest(entry);
    }
    setTestingAll(false);
  };

  const beginEdit = (entry: DataSourceEntry) => {
    setEditingId(entry.id);
    setDraft(resolveSourceUrl(entry));
    setError(null);
  };

  const saveEdit = (entry: DataSourceEntry) => {
    const invalid = validateSourceUrl(draft, entry.kind);
    if (invalid) { setError(invalid); return; }
    setSourceUrl(entry, draft);
    setEditingId(null);
    setError(null);
  };

  const submitAdd = () => {
    const invalid = validateSourceUrl(addUrl, addKind);
    if (invalid) { setError(invalid); return; }
    addSource({ kind: addKind, label: addLabel, url: addUrl.trim(), note: addNote });
    setAddLabel(""); setAddUrl(""); setAddNote(""); setError(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="source-registry-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>数据源</h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              本地自用 · 数据不出本地 · 只允许本机 / 局域网 / Tailscale；增删改测均在此完成
            </p>
          </div>
        </div>
        <button
          onClick={runTestAll}
          disabled={testingAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] disabled:opacity-50"
          style={{ fontSize: "0.75rem" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testingAll ? "animate-spin" : ""}`} />
          {testingAll ? "测试中…" : "测试全部启用源"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "数据源总数", value: stats.total, color: "#00d4ff" },
          { label: "已启用", value: stats.enabled, color: "#00ff88" },
          { label: "已测试", value: stats.tested, color: "#aa55ff" },
          { label: "测试通过", value: stats.ok, color: "#ffdd00" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-3">
            <div style={{ fontSize: "1.3rem", color: s.color, fontFamily: "'Orbitron', sans-serif" }}>{s.value}</div>
            <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-[rgba(255,51,102,0.25)] bg-[rgba(255,51,102,0.08)] text-[rgba(255,180,200,0.95)]" style={{ fontSize: "0.75rem" }}>
          {error}
        </div>
      )}

      <GlassCard className="p-3">
        <div className="space-y-2">
          {sources.map((entry) => {
            const url = resolveSourceUrl(entry);
            const test = entry.lastTest;
            return (
              <div
                key={entry.id}
                data-testid={`source-row-${entry.id}`}
                className="p-3 rounded-xl bg-[rgba(0,30,60,0.35)] border border-[rgba(0,180,255,0.08)]"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{entry.label}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.7)]" style={{ fontSize: "0.6rem" }}>
                        {KIND_LABELS[entry.kind]}
                      </span>
                      {entry.binding && (
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(170,85,255,0.12)] text-[rgba(200,150,255,0.85)]" style={{ fontSize: "0.6rem" }}>
                          系统设置同步
                        </span>
                      )}
                      {!entry.enabled && (
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]" style={{ fontSize: "0.6rem" }}>
                          已停用
                        </span>
                      )}
                    </div>

                    {editingId === entry.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] font-mono"
                          style={{ fontSize: "0.72rem" }}
                          aria-label={`编辑 ${entry.label} 地址`}
                        />
                        <button onClick={() => saveEdit(entry)} className="p-1.5 rounded-lg text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)]" aria-label="保存">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); setError(null); }} className="p-1.5 rounded-lg text-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,212,255,0.1)]" aria-label="取消">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-[rgba(0,212,255,0.45)] font-mono truncate" style={{ fontSize: "0.7rem" }}>{url}</p>
                    )}

                    {entry.note && (
                      <p className="mt-1 text-[rgba(0,212,255,0.28)]" style={{ fontSize: "0.65rem" }}>{entry.note}</p>
                    )}

                    <p className="mt-1" style={{ fontSize: "0.65rem" }}>
                      {test ? (
                        <span className={test.ok ? "text-[rgba(0,255,136,0.8)]" : "text-[rgba(255,120,140,0.85)]"}>
                          {test.ok ? "✅" : "❌"} {test.detail} · {test.latencyMs}ms · {new Date(test.at).toLocaleTimeString("zh-CN", { hour12: false })}
                        </span>
                      ) : (
                        <span className="text-[rgba(0,212,255,0.25)]">未测试</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => runTest(entry)}
                      disabled={testingId === entry.id}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.7)] hover:text-[#00d4ff] disabled:opacity-40"
                      style={{ fontSize: "0.68rem" }}
                    >
                      <PlugZap className={`w-3.5 h-3.5 ${testingId === entry.id ? "animate-pulse" : ""}`} />
                      测试
                    </button>
                    <button
                      onClick={() => beginEdit(entry)}
                      className="p-1.5 rounded-lg text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]"
                      aria-label={`编辑 ${entry.label}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateSource(entry.id, { enabled: !entry.enabled })}
                      className="px-2 py-1.5 rounded-lg border border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff]"
                      style={{ fontSize: "0.68rem" }}
                    >
                      {entry.enabled ? "停用" : "启用"}
                    </button>
                    <button
                      onClick={() => removeSource(entry.id)}
                      disabled={Boolean(entry.binding)}
                      title={entry.binding ? "系统必需源，不可删除" : "删除"}
                      className="p-1.5 rounded-lg text-[rgba(255,120,140,0.6)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.1)] disabled:opacity-25"
                      aria-label={`删除 ${entry.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-[#00ff88]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>新增数据源</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={addKind}
            onChange={(e) => setAddKind(e.target.value as SourceKind)}
            className="px-2 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]"
            style={{ fontSize: "0.75rem" }}
            aria-label="数据源类型"
          >
            {(Object.keys(KIND_LABELS) as SourceKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          <input
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="名称（如 本机 Ollama 备实例）"
            className="px-2 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]"
            style={{ fontSize: "0.75rem" }}
            aria-label="数据源名称"
          />
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="地址（http:// 或 ws://，仅私网）"
            className="px-2 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] font-mono"
            style={{ fontSize: "0.72rem" }}
            aria-label="数据源地址"
          />
          <div className="flex gap-2">
            <input
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="备注（可选）"
              className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]"
              style={{ fontSize: "0.72rem" }}
              aria-label="数据源备注"
            />
            <button
              onClick={submitAdd}
              className="px-3 py-2 rounded-lg bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)] text-[#00ff88] shrink-0"
              style={{ fontSize: "0.75rem" }}
            >
              添加
            </button>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
          <ShieldCheck className="w-3 h-3" />
          公网地址会被拒绝；绑定源（agent / OpsPanel）请在「系统设置 → WebSocket」修改，页面内也可直接编辑，写回同一事实源。
        </p>
      </GlassCard>
    </div>
  );
}
