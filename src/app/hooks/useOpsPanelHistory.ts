/**
 * @file: useOpsPanelHistory.ts
 * @description: OpsPanel 探针历史时序 Hook（落档 51）——轮询 /api/history，
 *               获取每节点可达性/探针耗时真实时序（OpsPanel 唯一服务端留存时序）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [hook],[monitor],[ops-panel],[time-series]
 *
 * @brief: /api/history 采样点实测仅 {ts, reachable, probe_ms}（app.py:160），
 *         本 Hook 原样透传，不做任何推断补值；探针不可达时如实置 error，
 *         保留最近一次成功载荷（面板不空白也不撒谎）。
 *
 * @data-sources:
 *   - ${base}/api/history → { history: { [nodeId]: { ts, reachable, probe_ms }[] } }
 */

import { useEffect, useRef, useState } from "react";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

const POLL_MS = 10000;

/** /api/history 单采样点（服务端原样字段，无扩展） */
export interface OpsHistoryPoint {
  ts: string;
  reachable: boolean;
  probe_ms: number;
}

export interface OpsPanelHistoryState {
  /** nodeId → 采样点数组（旧 → 新，服务端窗口原序） */
  history: Record<string, OpsHistoryPoint[]>;
  /** 首次加载未完成时 true */
  loading: boolean;
  /** 最近一轮拉取失败原因（成功后清空）；失败时保留上次成功数据 */
  error: string | null;
}

export function useOpsPanelHistory(): OpsPanelHistoryState {
  const enabled = useSettingsSSOT((s) => (s.toggles.demoMode ? false : s.toggles.opsPanelEnabled !== false));
  const base = useSettingsSSOT((s) => s.values.opsPanelBaseUrl);
  const [state, setState] = useState<OpsPanelHistoryState>({ history: {}, loading: true, error: null });
  const enabledRef = useRef(enabled);
  const baseRef = useRef(base);
  enabledRef.current = enabled;
  baseRef.current = base;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pull = async () => {
      if (cancelled) { return; }
      const b = (baseRef.current || "http://127.0.0.1:7864").trim().replace(/\/+$/, "");
      if (!enabledRef.current || !b) {
        setState((s) => ({ ...s, loading: false, error: null }));
        timer = setTimeout(pull, POLL_MS);
        return;
      }
      try {
        const res = await fetch(`${b}/api/history`, { signal: AbortSignal.timeout(5000) });
        const payload = await res.json() as { history?: Record<string, OpsHistoryPoint[]> };
        const history: Record<string, OpsHistoryPoint[]> = {};
        for (const [id, points] of Object.entries(payload.history || {})) {
          if (!Array.isArray(points)) { continue; }
          history[id] = points.filter((p) => p && typeof p.ts === "string" && typeof p.reachable === "boolean");
        }
        if (!cancelled) { setState({ history, loading: false, error: null }); }
      } catch (e) {
        // 探针历史不可达：如实置 error，保留上次成功载荷
        if (!cancelled) { setState((s) => ({ ...s, loading: false, error: String(e) })); }
      }
      if (!cancelled) { timer = setTimeout(pull, POLL_MS); }
    };

    void pull();
    return () => {
      cancelled = true;
      if (timer) { clearTimeout(timer); }
    };
  }, []);

  return state;
}
