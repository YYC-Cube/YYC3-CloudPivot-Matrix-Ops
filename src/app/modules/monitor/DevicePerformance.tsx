/**
 * @file: DevicePerformance.tsx
 * @description: 设备矩阵 · 性能监控（落档 50）——聚合本机 agent WS 快照 +
 *               OpsPanel 探针（每卡 DCGM / vLLM），展示节点性能矩阵；
 *               无真实来源的指标一律显示「—」，不做趋势伪造。
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [module],[monitor],[performance]
 */

import { useMemo, useState } from "react";
import { Cpu, MemoryStick, Gauge, Thermometer, Zap, Activity, Server, RefreshCw } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { useNodeSlice } from "../../store/slices/node-slice";
import { useOpsPanelMetrics } from "../../hooks/useOpsPanelMetrics";
import { useMultiNodeWS } from "../../hooks/useMultiNodeWS";

function pct(v: number | undefined | null, treatZeroAsUnknown = false): string {
  if (typeof v !== "number" || !Number.isFinite(v)) { return "—"; }
  if (treatZeroAsUnknown && v <= 0) { return "—"; }
  return `${Math.round(v)}%`;
}

function Bar({ value, color }: { value?: number; color: string }) {
  const w = typeof value === "number" && Number.isFinite(value) ? Math.max(2, Math.min(100, value)) : 0;
  return (
    <div className="h-1 rounded-full bg-[rgba(0,40,80,0.6)] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function DevicePerformance() {
  // 挂载即启动两条真实数据源（与 Dashboard 同源）：OpsPanel 10s 探针 + 多节点 WS
  useOpsPanelMetrics();
  useMultiNodeWS();
  const nodes = useNodeSlice((s) => s.nodes);
  const addNode = useNodeSlice((s) => s.addNode);
  const [importing, setImporting] = useState(false);

  /** 从 OpsPanel 探针导入真实节点（显式用户动作；清单由用户确认后维护，非暗注入） */
  const importProbeNodes = async () => {
    setImporting(true);
    try {
      const res = await fetch("http://127.0.0.1:7864/api/nodes", { signal: AbortSignal.timeout(6000) });
      const payload = await res.json() as { nodes?: Array<{ id: string; role?: string; ts_ip?: string; services?: Array<{ listening?: boolean }> }> };
      const list = payload.nodes || [];
      if (!list.length) { return; }
      const existing = new Set(nodes.map((n) => n.id.toLowerCase()));
      for (const n of list) {
        if (!n.id || existing.has(n.id.toLowerCase())) { continue; }
        const online = !n.services?.length || n.services.some((sv) => sv.listening);
        addNode({
          id: n.id,
          status: online ? "active" : "inactive",
          gpu: 0, mem: 0, temp: 0,
          model: "", tasks: 0,
          role: n.role || "",
          host: n.ts_ip || "",
          source: "user",
        });
      }
    } catch { /* 探针不可达：保持空态，不构造假数据 */ }
    finally { setImporting(false); }
  };

  const agg = useMemo(() => {
    const online = nodes.filter((n) => n.status === "active");
    const avg = (pick: (n: typeof nodes[number]) => number | undefined) => {
      const vals = online.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
    };
    return {
      total: nodes.length,
      online: online.length,
      avgCpu: avg((n) => n.gpu), // 本机 agent 口径：node.gpu 字段上报真实 CPU 利用率（agent 注记）
      avgMem: avg((n) => n.mem),
      avgGpu: avg((n) => {
        const gpus = n.metrics?.gpus;
        if (!gpus?.length) { return undefined; }
        return gpus.reduce((s, g) => s + (g.util ?? 0), 0) / gpus.length;
      }),
      maxTemp: avg((n) => n.temp),
    };
  }, [nodes]);

  const cards = [
    { key: "cpu", label: "CPU 平均利用率", value: pct(agg.avgCpu), icon: Cpu, color: "#00ff88" },
    { key: "mem", label: "内存平均占用", value: pct(agg.avgMem), icon: MemoryStick, color: "#aa55ff" },
    { key: "gpu", label: "GPU 平均利用率", value: pct(agg.avgGpu), icon: Gauge, color: "#00d4ff" },
    { key: "temp", label: "最高温度", value: typeof agg.maxTemp === "number" ? `${Math.round(agg.maxTemp)}°C` : "—", icon: Thermometer, color: "#ffdd00" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="device-performance-page">
      {/* 头部 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-[#e0f0ff]" style={{ fontSize: "1.05rem", fontFamily: "'Orbitron', sans-serif" }}>
              性能监控
            </h1>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
              设备矩阵 · 节点性能实时矩阵（本机 agent WS + OpsPanel DCGM 探针 10s）
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[rgba(0,212,255,0.45)]" style={{ fontSize: "0.68rem" }}>
          <RefreshCw className="w-3.5 h-3.5" />
          采集：{agg.online}/{agg.total} 在线
        </div>
      </div>

      {/* 概览卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <GlassCard key={c.key} className="p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
              <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.66rem" }}>{c.label}</span>
            </div>
            <p className="text-[#e0f0ff]" style={{ fontSize: "1.25rem", fontFamily: "'Orbitron', monospace" }}>{c.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* 节点矩阵 */}
      <GlassCard className="p-4">
        <h2 className="text-[#e0f0ff] mb-3 flex items-center gap-2" style={{ fontSize: "0.88rem" }}>
          <Server className="w-4 h-4 text-[#00d4ff]" /> 节点性能矩阵
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88]" style={{ fontSize: "0.58rem" }}>
            {agg.online} 在线 / {agg.total}
          </span>
        </h2>

        {nodes.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.75rem" }}>
              暂无节点数据——请在「数据监控 → 添加节点」维护设备清单，或从 OpsPanel 探针导入真实节点
            </p>
            <button onClick={() => void importProbeNodes()} disabled={importing}
              className="px-3 py-2 rounded-lg bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all disabled:opacity-50 flex items-center gap-1.5 mx-auto"
              style={{ fontSize: "0.74rem" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${importing ? "animate-spin" : ""}`} />
              {importing ? "正在导入…" : "从 OpsPanel 导入探针节点"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {nodes.map((n) => {
              const gpus = n.metrics?.gpus || [];
              const gpuAvg = gpus.length
                ? gpus.reduce((s, g) => s + (g.util ?? 0), 0) / gpus.length
                : undefined;
              const powerSum = gpus.length ? gpus.reduce((s, g) => s + (g.powerW ?? 0), 0) : undefined;
              return (
                <div key={n.id} className="px-3.5 py-3 rounded-xl bg-[rgba(0,20,45,0.4)] border border-[rgba(0,180,255,0.08)]">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${n.status === "active" ? "bg-[#00ff88]" : "bg-[rgba(255,51,102,0.6)]"}`} />
                      <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.82rem", fontFamily: "'JetBrains Mono', monospace" }}>{n.id}</span>
                      {n.role && <span className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.62rem" }}>{n.role}</span>}
                    </div>
                    <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                      {n.host || "本机"} · {n.source === "user" ? "用户清单" : "agent 快照"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.6rem" }}>CPU</span>
                        <span className="text-[#e0f0ff]" style={{ fontSize: "0.7rem" }}>{pct(n.gpu, !n.metrics?.gpus && n.gpu <= 0)}</span>
                      </div>
                      <Bar value={n.gpu} color="#00ff88" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.6rem" }}>内存</span>
                        <span className="text-[#e0f0ff]" style={{ fontSize: "0.7rem" }}>{pct(n.mem, n.mem <= 0)}</span>
                      </div>
                      <Bar value={n.mem} color="#aa55ff" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.6rem" }}>GPU</span>
                        <span className="text-[#e0f0ff]" style={{ fontSize: "0.7rem" }}>{pct(gpuAvg)}</span>
                      </div>
                      <Bar value={gpuAvg} color="#00d4ff" />
                    </div>
                    <div>
                      <span className="text-[rgba(224,240,255,0.4)] block mb-1" style={{ fontSize: "0.6rem" }}>温度</span>
                      <span className="text-[#e0f0ff] flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Thermometer className="w-3 h-3 text-[#ffdd00]" />
                        {typeof n.temp === "number" && n.temp > 0 ? `${Math.round(n.temp)}°C` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[rgba(224,240,255,0.4)] block mb-1" style={{ fontSize: "0.6rem" }}>功耗</span>
                      <span className="text-[#e0f0ff] flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Zap className="w-3 h-3 text-[#00ff88]" />
                        {typeof powerSum === "number" && powerSum > 0 ? `${Math.round(powerSum)}W` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* 每卡 DCGM 明细（有则展示） */}
                  {gpus.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[rgba(0,180,255,0.06)] flex items-center gap-3 flex-wrap">
                      {gpus.map((g, i) => (
                        <span key={i} className="px-2 py-1 rounded-md bg-[rgba(0,40,80,0.3)] text-[rgba(224,240,255,0.55)]"
                          style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
                          GPU{i}: {pct(g.util)} · {typeof g.temp === "number" ? `${Math.round(g.temp)}°C` : "—"} · {typeof g.powerW === "number" ? `${Math.round(g.powerW)}W` : "—"}
                        </span>
                      ))}
                      {n.metrics?.vllm && (
                        <span className="px-2 py-1 rounded-md bg-[rgba(0,255,136,0.06)] text-[rgba(0,255,136,0.6)]" style={{ fontSize: "0.6rem" }}>
                          vLLM · {n.metrics.vllm.model || "模型"} · {Math.round(n.metrics.vllm.genTokensPerS ?? 0)} tok/s
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[rgba(0,212,255,0.25)] mt-3" style={{ fontSize: "0.62rem" }}>
          数据口径：CPU = 本机 agent 采集的真实 CPU 利用率；GPU/温度/功耗 = OpsPanel DCGM 探针（每 10s）；
          无来源指标显示「—」。时序趋势图待接入时序存储后提供（当前为实时快照，不伪造曲线）。
        </p>
      </GlassCard>
    </div>
  );
}
