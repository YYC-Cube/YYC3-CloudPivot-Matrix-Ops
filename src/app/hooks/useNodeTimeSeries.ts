/**
 * @file: useNodeTimeSeries.ts
 * @description: 设备矩阵 · 节点聚合指标时序采样 Hook（落档 51/53）——10s 采样 CPU/内存/GPU/温度聚合，
 *               环形 60 点（≈10 分钟窗口），sessionStorage 会话级持久；启动时从 OpsPanel
 *               /api/metrics/history 回填服务端持久历史（跨会话连续，GPU/温度字段），本地采样续采
 * @author: YanYuCloudCube Team
 * @version: v2.0.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [hook],[monitor],[performance],[time-series]
 *
 * @brief: 对 node-slice 当前聚合口径（与 DevicePerformance 概览卡完全同源）做前端采样，
 *         只记录真实出现过的值；无在线节点时不采样（不制造全 null 点污染窗口）。
 *         模块级单例采样器：首个消费者挂载启动、最后一个卸载停止，组件重挂不重置序列；
 *         服务端持久历史（OpsPanel 自主采样）启动时一次性回填，跨会话连续。
 *
 * @data-sources:
 *   - node-slice（本机 agent WS 快照 + OpsPanel 探针轮询的汇聚态）
 *
 * @honesty: 指标缺失记 null（图表断线呈现），绝不插值、不补零、不伪造曲线。
 */

import { useEffect, useSyncExternalStore } from "react";
import { useNodeSlice } from "../store/slices/node-slice";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";
import type { NodeData } from "../types";

/** 采样间隔（与 useOpsPanelMetrics 探针轮询同节奏） */
const SAMPLE_MS = 10000;
/** 环形窗口容量：60 点 × 10s ≈ 10 分钟 */
const MAX_POINTS = 60;
/** sessionStorage 键（会话级：刷新保留、新标签页独立） */
const STORAGE_KEY = "yyc3-node-ts-v1";

/** 一个采样点：null = 该指标当时无真实来源（断线呈现，不补值） */
export interface NodeTimeSeriesPoint {
  ts: number;
  avgCpu: number | null;
  avgMem: number | null;
  avgGpu: number | null;
  maxTemp: number | null;
}

/** 与 DevicePerformance 概览卡同源的聚合口径（页面卡片与曲线必须一致） */
function samplePoint(): NodeTimeSeriesPoint | null {
  const nodes = useNodeSlice.getState().nodes;
  if (!nodes.length) { return null; } // 无任何节点：暂停采样（不记全 null 点）
  const online = nodes.filter((n) => n.status === "active");
  const avg = (pick: (n: NodeData) => number | undefined): number | null => {
    const vals = online.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    ts: Date.now(),
    avgCpu: avg((n) => n.gpu), // 本机 agent 口径：node.gpu 字段上报真实 CPU 利用率（agent 注记）
    avgMem: avg((n) => n.mem),
    avgGpu: avg((n) => {
      const gpus = n.metrics?.gpus;
      if (!gpus?.length) { return undefined; }
      return gpus.reduce((s, g) => s + (g.util ?? 0), 0) / gpus.length;
    }),
    maxTemp: avg((n) => n.temp),
  };
}

// ── 模块级外部存储（useSyncExternalStore 消费） ──────────────────────────
function loadStored(): NodeTimeSeriesPoint[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) { return []; }
    const parsed = JSON.parse(raw) as NodeTimeSeriesPoint[];
    if (!Array.isArray(parsed)) { return []; }
    return parsed
      .filter((p) => p && typeof p.ts === "number")
      .slice(-MAX_POINTS);
  } catch { return []; } // 解析失败 / 隐私模式：从空窗口开始，不抛错
}

let series: NodeTimeSeriesPoint[] = loadStored();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) { l(); }
}

function persist(): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(series)); } catch { /* 存储不可用：仅内存态 */ }
}

function append(p: NodeTimeSeriesPoint): void {
  series = [...series.slice(-(MAX_POINTS - 1)), p];
  persist();
  emit();
}

// ── 单例采样器（引用计数启停） ──────────────────────────────────────────
let refCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let hydrated = false;

/**
 * 落档 53 · 服务端历史回填：拉 OpsPanel /api/metrics/history（服务端自主采样 +
 * 落盘续接，约 1h 窗口），把 {ts, avg_gpu_util, max_gpu_temp} 映射进环形窗口底部，
 * 使刷新/重开浏览器后曲线立即跨会话连续。本地采样随后继续追加最新点。
 * 口径：服务端无 CPU/内存来源 → 映射为 null（图表断线呈现，不伪造）；
 * 与本地重叠区间以本地点为准（本地点含 CPU/内存更完整）；拉取失败静默回落纯本地。
 */
async function hydrateFromServer(): Promise<void> {
  if (hydrated) { return; }
  hydrated = true;
  try {
    const ssot = useSettingsSSOT.getState();
    const enabled = ssot.toggles.demoMode ? false : ssot.toggles.opsPanelEnabled !== false;
    const base = (ssot.values.opsPanelBaseUrl || "http://127.0.0.1:7864").trim().replace(/\/+$/, "");
    if (!enabled || !base) { return; }
    const res = await fetch(`${base}/api/metrics/history`, { signal: AbortSignal.timeout(6000) });
    const payload = await res.json() as { history?: Array<{ ts: string; avg_gpu_util?: number | null; max_gpu_temp?: number | null }> };
    const serverPts = (payload.history || [])
      .filter((p) => p && typeof p.ts === "string")
      .slice(-MAX_POINTS)
      .map((p) => ({
        ts: new Date(p.ts).getTime(),
        avgCpu: null,
        avgMem: null,
        avgGpu: typeof p.avg_gpu_util === "number" && Number.isFinite(p.avg_gpu_util) ? p.avg_gpu_util : null,
        maxTemp: typeof p.max_gpu_temp === "number" && Number.isFinite(p.max_gpu_temp) ? p.max_gpu_temp : null,
      }))
      .filter((p) => Number.isFinite(p.ts));
    if (!serverPts.length) { return; }
    const serverLast = serverPts[serverPts.length - 1].ts;
    // 本地保留「比服务端末点新」的点（sessionStorage 回放或已采样的最新点）
    const localTail = series.filter((p) => p.ts > serverLast + 2000);
    series = [...serverPts, ...localTail].slice(-MAX_POINTS);
    persist();
    emit();
  } catch { /* 服务端不可达：保持本地窗口（现状行为），不抛错 */ }
}

function startSampler(): void {
  void hydrateFromServer(); // 首消费者挂载即回填服务端历史（一次；失败不重试）
  const tick = () => {
    const p = samplePoint();
    if (p) { append(p); }
  };
  tick(); // 挂载即取首点（数据源已在页面侧启动，能取到当前真实聚合）
  timer = setInterval(tick, SAMPLE_MS);
}

function stopSampler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}

/**
 * 订阅节点聚合指标时序（10s 采样 · 环形 60 点 · 服务端历史回填 + sessionStorage 会话持久）。
 * 返回采样点数组（旧 → 新）；首点到达前为空数组，由消费方显示「采样中…」占位。
 */
export function useNodeTimeSeries(): NodeTimeSeriesPoint[] {
  useEffect(() => {
    refCount += 1;
    if (refCount === 1) { startSampler(); }
    return () => {
      refCount -= 1;
      if (refCount === 0) { stopSampler(); }
    };
  }, []);
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => { listeners.delete(onStoreChange); };
    },
    () => series,
    () => [],
  );
}
