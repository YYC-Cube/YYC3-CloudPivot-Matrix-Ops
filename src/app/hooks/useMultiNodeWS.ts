/**
 * @file: useMultiNodeWS.ts
 * @description: M4 方案 A — 多节点 WS 连接池（按用户清单 host/wsPort 直连各节点 agent）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [hook],[monitor],[m4],[multi-node]
 *
 * @brief: 依落档 35 方案 A：node-slice 用户清单中带 host 的节点，逐个建立
 *         ws://{host}:{wsPort|3113}/ws?token= 连接，远端 node_status 快照以
 *         非权威模式归并（不删他节点）；主连接端点（api-config wsEndpoint
 *         所指 host:port）跳过避免重复。断线指数退避重连；远端 WS 不可达时
 *         不改状态——节点状态由 OpsPanel 探针兜底（优先级：WS>探针>user）。
 * @notes: 连接前提：wsToken 已配置（系统设置→WebSocket）；demoMode 开启时停用。
 */

import { useEffect } from "react";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";
import { useNodeSlice } from "../store/slices/node-slice";
import { getAPIConfig } from "../lib/api-config";

interface Conn {
  ws: WebSocket;
  retries: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const MAX_BACKOFF_MS = 30_000;

/** 回环名归一化：localhost / 127.0.0.1 视为同主机 */
function normHost(h: string): string {
  return h === "127.0.0.1" || h === "localhost" ? "localhost" : h;
}

/** 解析主 WS 端点的 host:port（跳过依据；回环归一化） */
function primaryKey(): string {
  try {
    const u = new URL(getAPIConfig().wsEndpoint);
    return `${normHost(u.hostname)}:${u.port || (u.protocol === "wss:" ? "443" : "80")}`;
  } catch {
    return "";
  }
}

export function useMultiNodeWS(): void {
  const wsToken = useSettingsSSOT((s) => s.values.wsToken);
  const demoMode = useSettingsSSOT((s) => s.toggles.demoMode);

  useEffect(() => {
    const token = wsToken.trim();
    if (!token || demoMode) { return; }

    let cancelled = false;
    const conns = new Map<string, Conn>();
    const primary = primaryKey();

    const closeOne = (key: string) => {
      const c = conns.get(key);
      if (!c) { return; }
      conns.delete(key);
      if (c.timer) { clearTimeout(c.timer); }
      try { c.ws.onclose = null; c.ws.close(); } catch { /* ignore */ }
    };

    const openConn = (key: string, host: string, port: number) => {
      if (cancelled || conns.has(key)) { return; }
      let ws: WebSocket;
      try {
        ws = new WebSocket(`ws://${host}:${port}/ws?token=${encodeURIComponent(token)}`);
      } catch { return; }
      const conn: Conn = { ws, retries: 0, timer: null };
      conns.set(key, conn);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; payload?: unknown };
          if (msg.type === "node_status" && Array.isArray(msg.payload)) {
            // 大小写归一 + 身份保留：远端 agent 以主机名大写为 id（YYC3-45），清单惯用小写；
            // 命中既有节点时改写为既有 id，并回填 source/host/wsPort/role 身份字段——
            // 否则 merge 覆盖后丢失 source:"user"，主连接权威合并将失去保护而清除该节点
            const nodes = useNodeSlice.getState().nodes;
            const byLower = new Map(nodes.map((n) => [n.id.toLowerCase(), n]));
            const payload = (msg.payload as Record<string, unknown>[]).map((p) => {
              const hit = byLower.get(String(p.id).toLowerCase());
              if (!hit) { return p; }
              return {
                ...p,
                id: hit.id,
                source: hit.source,
                host: hit.host,
                wsPort: hit.wsPort,
                role: (p.role as string) || hit.role,
              };
            });
            // 非权威归并：远端快照只更新/追加自己的节点，绝不清除他节点
            useNodeSlice.getState().mergeFromWS(payload as never, { authoritative: false });
          }
        } catch { /* 非 JSON 帧忽略 */ }
      };
      const scheduleReconnect = () => {
        if (cancelled || !conns.has(key)) { return; }
        conns.delete(key);
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(conn.retries, 5));
        const t = setTimeout(() => openConn(key, host, port), delay);
        void t;
      };
      ws.onclose = () => { conn.retries += 1; scheduleReconnect(); };
      ws.onerror = () => { /* close 会随后触发，统一走 onclose 重连 */ };
    };

    const sync = () => {
      if (cancelled) { return; }
      const targets = new Map<string, { host: string; port: number }>();
      for (const n of useNodeSlice.getState().nodes) {
        if (n.source !== "user" || !n.host) { continue; }
        const port = n.wsPort || 3113;
        const key = `${normHost(n.host)}:${port}`;
        if (key === primary) { continue; } // 主端点由 useWebSocketData 负责（回环归一化）
        targets.set(key, { host: n.host, port });
      }
      for (const key of [...conns.keys()]) {
        if (!targets.has(key)) { closeOne(key); }
      }
      for (const [key, t] of targets) { openConn(key, t.host, t.port); }
    };

    const unsub = useNodeSlice.subscribe(sync);
    sync();

    return () => {
      cancelled = true;
      unsub();
      for (const key of [...conns.keys()]) { closeOne(key); }
    };
  }, [wsToken, demoMode]);
}
