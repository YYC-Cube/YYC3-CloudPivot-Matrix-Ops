/**
 * @file: agent-actions.ts
 * @description: 运维执行动作客户端 — GET /actions 回读 · POST /actions/exec 回执（落档 70）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-23
 * @updated: 2026-11-23
 * @status: active
 * @tags: [lib],[actions],[agent],[ops]
 *
 * @brief: 「操作中心」真实动作执行通道——不经 OpsPanel，直接与 yyc3-agent 通信。
 *
 * @details:
 * - GET /actions：白名单动作列表回读（含最近回执摘要）
 * - POST /actions/exec {actionId}：执行并返回回执（exit code / 耗时 / stdout 尾部）
 * - GET /actions/history：回执历史（agent 持久化最近 50 条，0600）
 * - 鉴权与 WS 同一 agent-token；基址与 WS 端点同源（落档 57 口径）
 */

import { getAPIConfig } from "./api-config";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

export interface OpsActionArgRule {
  pattern: string;
  required?: boolean;
  desc: string;
}

export interface OpsActionDef {
  id: string;
  name: string;
  description: string;
  target: string;
  destructive: boolean;
  risk: string;
  timeoutMs: number;
  /** 落档 75：参数 schema 回传（与 agent 校验同源）——面板据此渲染参数输入框 */
  args?: Record<string, OpsActionArgRule> | null;
  lastReceipt?: { receiptId: string; ok: boolean; at: number; durationMs: number } | null;
}

export interface OpsActionReceipt {
  id: string;
  actionId: string;
  name: string;
  target: string;
  startedAt: number;
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  killedByTimeout: boolean;
  ok: boolean;
  stdoutTail: string;
  stdoutTruncated: boolean;
  stderrTail: string;
  stderrTruncated: boolean;
}

function agentBase(): string | null {
  try {
    const url = new URL(
      useSettingsSSOT.getState().values.wsEndpoint || getAPIConfig().wsEndpoint,
    );
    const proto = url.protocol === "wss:" ? "https:" : url.protocol === "ws:" ? "http:" : null;
    if (!proto) { return null; }
    return `${proto}//${url.host}`;
  } catch {
    return null;
  }
}

function authQuery(): string | null {
  const token = useSettingsSSOT.getState().values.wsToken?.trim();
  return token ? `?token=${encodeURIComponent(token)}` : null;
}

/** GET /actions：白名单动作回读 */
export async function fetchOpsActions(): Promise<
  { ok: boolean; reason?: string; actions?: OpsActionDef[]; running?: string[]; source?: string }
> {
  const base = agentBase();
  const q = authQuery();
  if (!base || !q) { return { ok: false, reason: "no-token" }; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // t= 时间戳防启发式缓存（GET /actions 的旧 null-args 响应会导致面板字段缺失）
    const res = await fetch(`${base}/actions${q}&t=${Date.now()}`, { signal: controller.signal });
    if (!res.ok) { return { ok: false, reason: `http-${res.status}` }; }
    const data = await res.json() as { actions?: OpsActionDef[]; running?: string[]; source?: string };
    return { ok: true, actions: data.actions ?? [], running: data.running ?? [], source: data.source };
  } catch {
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** POST /actions/exec：执行白名单动作并取回回执（args 经服务端白名单二次校验） */
export async function execOpsAction(actionId: string, args?: Record<string, string>): Promise<
  { ok: boolean; reason?: string; receipt?: OpsActionReceipt }
> {
  const base = agentBase();
  const q = authQuery();
  if (!base || !q) { return { ok: false, reason: "no-token" }; }
  const controller = new AbortController();
  // 客户端等待上限 = 5 分钟（服务端还有各自超时强杀）
  const timer = setTimeout(() => controller.abort(), 300_000);
  try {
    const res = await fetch(`${base}/actions/exec${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args ? { actionId, args } : { actionId }),
      signal: controller.signal,
    });
    const data = await res.json() as { ok?: boolean; error?: string; receipt?: OpsActionReceipt };
    if (!res.ok || !data.ok) {
      return { ok: false, reason: data.error ?? `http-${res.status}` };
    }
    return { ok: true, receipt: data.receipt };
  } catch (err) {
    return { ok: false, reason: /abort/i.test(String(err)) ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** GET /actions/history：回执历史回读（最近在前） */
export async function fetchOpsActionHistory(): Promise<
  { ok: boolean; reason?: string; receipts?: OpsActionReceipt[] }
> {
  const base = agentBase();
  const q = authQuery();
  if (!base || !q) { return { ok: false, reason: "no-token" }; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${base}/actions/history${q}`, { signal: controller.signal });
    if (!res.ok) { return { ok: false, reason: `http-${res.status}` }; }
    const data = await res.json() as { receipts?: OpsActionReceipt[] };
    return { ok: true, receipts: data.receipts ?? [] };
  } catch {
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
