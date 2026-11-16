/**
 * @file: useOpsPanelMetrics.ts
 * @description: OpsPanel 多节点真实指标轮询 Hook — 全节点真实数据接入（批5/6）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [hook],[monitor],[node],[ops-panel]
 *
 * @brief: 轮询 YYC3-OpsPanel（FastAPI）的 /api/nodes 与 /api/metrics，
 *         将真实探针状态与 vLLM/DCGM 指标映射进 node-slice（仅更新已匹配节点，
 *         不注入新节点——全节点清单归用户维护，指标归真实数据源）。
 *
 * @data-sources:
 *   - ${base}/api/nodes   → services[].listening / probe 状态（真实在线判定）
 *   - ${base}/api/metrics → dcgm[].gpus[].util（GPU 利用率）、vllm（推理）
 *
 * @immediate-effect: 端点/开关读 settings-ssot ref，UI 修改下一轮轮询即生效。
 */

import { useEffect, useRef } from "react";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";
import { useNodeSlice } from "../store/slices/node-slice";

const POLL_MS = 10000;

/** OpsPanel /api/nodes 节点项（仅需字段） */
interface OpsNode {
  id: string;
  role?: string;
  services?: { name: string; port: number; listening: boolean }[];
}

/** OpsPanel /api/metrics 载荷（字段名对齐 metrics.py 实测 · P4） */
interface OpsMetrics {
  ts?: string;
  rates_ready?: boolean;
  /** 扁平逐卡 DCGM 行 */
  gpus?: { node: string; gpu: number; model: string; util_perc: number; temp_c: number; power_w: number; sm_clock_mhz: number; xid_errors: number }[];
  /** vLLM 推理率（挂宿主节点） */
  inference?: {
    ok: boolean; node: string; model: string;
    qps: number; gen_tokens_per_s: number; prompt_tokens_per_s: number;
    avg_latency_s: number; ttft_avg_s: number; prefix_cache_hit_ratio: number;
    kv_cache_usage_perc: number; running: number; waiting: number;
  };
  vllm?: { ok?: boolean; node?: string; error?: string };
}

export function useOpsPanelMetrics(): void {
  const enabledRef = useRef(true);
  const baseRef = useRef("");
  // 向后兼容：旧 persist 无 opsPanelEnabled 键（浅合并不补默认值），undefined 视为启用
  enabledRef.current = useSettingsSSOT((s) => s.toggles.demoMode ? false : s.toggles.opsPanelEnabled !== false);
  baseRef.current = useSettingsSSOT((s) => s.values.opsPanelBaseUrl);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pull = async () => {
      if (cancelled) { return; }
      // 向后兼容：旧 persist 浅合并会丢新字段默认值（undefined）→ 回落标准端点
      const base = (baseRef.current || "http://127.0.0.1:7864").trim().replace(/\/+$/, "");
      if (!enabledRef.current || !base) {
        timer = setTimeout(pull, POLL_MS);
        return;
      }
      try {
        // ── 节点探针状态：services 全 listening 或 probe 节点存在即在线语义由 OpsPanel 定义，
        //    这里以「节点出现在 /api/nodes 且其 services 至少一项 listening」为在线判据（无 services 视为在线）。
        const nodesRes = await fetch(`${base}/api/nodes`, { signal: AbortSignal.timeout(5000) });
        const nodesPayload = (await nodesRes.json()) as { nodes?: OpsNode[] } | OpsNode[];
        const opsNodes: OpsNode[] = Array.isArray(nodesPayload) ? nodesPayload : nodesPayload.nodes || [];
        // 大小写不敏感匹配（agent 快照上报 "YYC3-22"，OpsPanel 清单为 "yyc3-22"）
        const statusById = new Map<string, "active" | "inactive">();
        for (const n of opsNodes) {
          const services = n.services || [];
          const online = services.length === 0 || services.some((s) => s.listening);
          statusById.set(n.id.toLowerCase(), online ? "active" : "inactive");
        }

        // ── GPU/vLLM 指标（P4：/api/metrics 扁平逐卡行 + 推理率）
        const perGpuById = new Map<string, import("../types/node-types").NodeGpuMetric[]>();
        const gpuById = new Map<string, number>();
        const vllmByNode = new Map<string, import("../types/node-types").NodeVllmMetric>();
        let metricsUpdatedAt: string | undefined;
        try {
          const metricsRes = await fetch(`${base}/api/metrics`, { signal: AbortSignal.timeout(5000) });
          const m = (await metricsRes.json()) as OpsMetrics & { ts?: string };
          metricsUpdatedAt = m.ts;
          // OpsPanel gpus[] = 扁平逐卡行（node/gpu/model/util_perc/temp_c/power_w/sm_clock_mhz/xid_errors）
          for (const r of m.gpus ?? []) {
            const row = r as unknown as Record<string, unknown>;
            if (!("util_perc" in row)) { continue; } // 防御：非逐卡形态跳过
            const node = String(row.node || "").toLowerCase();
            if (!node) { continue; }
            const list = perGpuById.get(node) || [];
            list.push({
              idx: Number(row.gpu) || 0,
              model: String(row.model || "GPU"),
              util: Number(row.util_perc) || 0,
              temp: Number(row.temp_c) || 0,
              powerW: Number(row.power_w) || 0,
              clockMhz: Number(row.sm_clock_mhz) || 0,
              xid: Number(row.xid_errors) || 0,
            });
            perGpuById.set(node, list);
          }
          // 聚合均值（卡片主指标）
          for (const [node, cards] of perGpuById) {
            gpuById.set(node, Math.round(cards.reduce((s, c) => s + c.util, 0) / cards.length));
          }
          // vLLM 推理率 → 宿主节点
          const inf = m.inference;
          if (inf?.ok && inf.node) {
            vllmByNode.set(inf.node.toLowerCase(), {
              model: inf.model,
              qps: Number(inf.qps) || 0,
              genTokensPerS: Number(inf.gen_tokens_per_s) || 0,
              promptTokensPerS: Number(inf.prompt_tokens_per_s) || 0,
              avgLatencyS: Number(inf.avg_latency_s) || 0,
              ttftS: Number(inf.ttft_avg_s) || 0,
              prefixHit: Number(inf.prefix_cache_hit_ratio) || 0,
              kvCache: Number(inf.kv_cache_usage_perc) || 0,
              running: Number(inf.running) || 0,
              waiting: Number(inf.waiting) || 0,
            });
          }
        } catch { /* metrics 拉取失败不影响探针状态 */ }

        // ── 映射进 node-slice：仅更新已存在（用户清单）节点；远端不可达如实置 inactive
        const slice = useNodeSlice.getState();
        for (const [idLower, status] of statusById) {
          const existing = slice.nodes.find((n) => n.id.toLowerCase() === idLower);
          if (!existing) { continue; } // 不注入新节点——清单归用户维护
          const updates: Partial<typeof existing> = { status };
          if (status === "active" && gpuById.has(idLower)) {
            updates.gpu = Math.max(0, Math.min(100, gpuById.get(idLower)!));
          }
          // P4：每卡明细 + vLLM 推理率挂载（数据源未覆盖的节点不写入 metrics）
          if (perGpuById.has(idLower) || vllmByNode.has(idLower)) {
            updates.metrics = {
              ...(existing.metrics || {}),
              ...(perGpuById.has(idLower) ? { gpus: perGpuById.get(idLower)! } : {}),
              ...(vllmByNode.has(idLower) ? { vllm: vllmByNode.get(idLower)! } : {}),
              ...(metricsUpdatedAt ? { updatedAt: metricsUpdatedAt } : {}),
            };
          }
          useNodeSlice.getState().updateNode(existing.id, updates);
        }
      } catch (e) {
        // OpsPanel 不可达：保持现有面板状态（用户清单为准），不打扰
        try { localStorage.setItem("__yyc3OpsPanelDbg", JSON.stringify({ lastPullAt: new Date().toISOString(), lastError: String(e), base })); } catch { /* ignore */ }
      }
      if (!cancelled) {
        try { localStorage.setItem("__yyc3OpsPanelDbg", JSON.stringify({ lastPullAt: new Date().toISOString(), lastError: null, base })); } catch { /* ignore */ }
        timer = setTimeout(pull, POLL_MS);
      }
    };

    pull();
    return () => {
      cancelled = true;
      if (timer) { clearTimeout(timer); }
    };
  }, []);
}
