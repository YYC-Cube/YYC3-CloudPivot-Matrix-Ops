/**
 * @file: useOpsPanelInferenceHistory.ts
 * @description: OpsPanel vLLM 推理历史 Hook — 首页吞吐趋势的服务端真实数据源（落档 56）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-20
 * @updated: 2026-11-20
 * @status: active
 * @tags: [hook],[monitor],[inference],[ops-panel]
 *
 * @brief: 轮询 OpsPanel `GET /api/metrics/history`（服务端 10s 采样、360 点环形），
 *         映射为首页「推理吞吐量趋势」所需 `{time, qps, tokens}`。仅在 OpsPanel 启用且
 *         确有 vLLM 数据源时由调用方传入 enabled=true；拉取失败保留上次结果，不造假。
 */

import { useEffect, useRef, useState } from "react";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

export interface InferencePoint {
  time: string;
  qps: number;
  tokens: number;
}

const POLL_MS = 10000;
const MAX_POINTS = 60;

interface HistoryPayload {
  history?: Array<{
    ts?: string;
    qps?: number | null;
    gen_tokens_per_s?: number | null;
  }>;
}

export function useOpsPanelInferenceHistory(enabled: boolean): InferencePoint[] {
  const [points, setPoints] = useState<InferencePoint[]>([]);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const demoMode = useSettingsSSOT((s) => s.toggles.demoMode);
  const opsEnabled = useSettingsSSOT((s) => s.toggles.opsPanelEnabled !== false);
  const baseUrl = useSettingsSSOT((s) => s.values.opsPanelBaseUrl);

  useEffect(() => {
    if (demoMode || !opsEnabled || !enabledRef.current) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const base = (baseUrl || "http://127.0.0.1:7864").trim().replace(/\/+$/, "");

    const pull = async () => {
      if (cancelled) { return; }
      try {
        const res = await fetch(`${base}/api/metrics/history`, { signal: AbortSignal.timeout(6000) });
        const payload = (await res.json()) as HistoryPayload;
        const mapped = (payload.history ?? [])
          .filter((p) => p && typeof p.ts === "string")
          .slice(-MAX_POINTS)
          .map((p) => ({
            time: new Date(p.ts as string).toLocaleTimeString("zh-CN", { hour12: false }),
            qps: typeof p.qps === "number" && Number.isFinite(p.qps) ? p.qps : 0,
            tokens: typeof p.gen_tokens_per_s === "number" && Number.isFinite(p.gen_tokens_per_s) ? p.gen_tokens_per_s : 0,
          }))
          .filter((p) => p.time !== "Invalid Date");
        if (!cancelled && mapped.length > 0) { setPoints(mapped); }
      } catch { /* 服务端不可达：保留上次结果 */ }
      if (!cancelled) { timer = setTimeout(pull, POLL_MS); }
    };

    void pull();
    return () => {
      cancelled = true;
      if (timer) { clearTimeout(timer); }
    };
  }, [baseUrl, demoMode, opsEnabled, enabled]);

  return points;
}
