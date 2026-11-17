/**
 * @file: DevicePerformance.tsx
 * @description: 设备矩阵 · 性能监控（落档 50/51）——聚合本机 agent WS 快照 +
 *               OpsPanel 探针（每卡 DCGM / vLLM），展示节点性能矩阵 +
 *               会话级趋势（10s 采样环形 60 点）与探针可达性/延迟实测时序；
 *               无真实来源的指标一律显示「—」，趋势断线呈现，不伪造曲线。
 * @author: YanYuCloudCube Team
 * @version: v1.1.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [module],[monitor],[performance],[time-series]
 */

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Cpu, MemoryStick, Gauge, Thermometer, Zap, Activity, Server, RefreshCw } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { useNodeSlice } from "../../store/slices/node-slice";
import { useOpsPanelMetrics } from "../../hooks/useOpsPanelMetrics";
import { useMultiNodeWS } from "../../hooks/useMultiNodeWS";
import { useNodeTimeSeries, type NodeTimeSeriesPoint } from "../../hooks/useNodeTimeSeries";
import { useOpsPanelHistory, type OpsHistoryPoint } from "../../hooks/useOpsPanelHistory";

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

// ══════════════════════════════════════════════════════════════════
// 落档 51 · 趋势区：SVG 三线折线（CPU/内存/GPU，0-100% 轴）+ 图例 + 时间轴
// 口径：与概览卡同源聚合；null = 无真实来源 → 断线呈现，不插值不补零
// ══════════════════════════════════════════════════════════════════

/** 趋势线定义：字段/颜色与概览卡同源（卡片与曲线必须一致） */
const TREND_LINES = [
  { key: "avgCpu" as const, label: "CPU", color: "#00ff88" },
  { key: "avgMem" as const, label: "内存", color: "#aa55ff" },
  { key: "avgGpu" as const, label: "GPU", color: "#00d4ff" },
];

function TrendChart({ series }: { series: NodeTimeSeriesPoint[] }) {
  // 绘图区（viewBox 800×240）：左留百分比轴、下留时间轴
  const L = 44, R = 792, T = 14, B = 200;
  const xAt = (i: number) => (series.length <= 1 ? (L + R) / 2 : L + (i * (R - L)) / (series.length - 1));
  const yAt = (v: number) => B - (Math.max(0, Math.min(100, v)) / 100) * (B - T);

  // 逐线构建 path：连续非 null 段成线，遇 null 断开（诚实呈现无来源区间）
  const lines = TREND_LINES.map(({ key, color }) => {
    const seg: string[] = [];
    let open = false;
    series.forEach((p, i) => {
      const v = p[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        seg.push(`${open ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`);
        open = true;
      } else {
        open = false;
      }
    });
    // 线尾圆点（最新一个真实值）
    let dot: { x: number; y: number } | null = null;
    for (let i = series.length - 1; i >= 0; i--) {
      const v = series[i][key];
      if (typeof v === "number" && Number.isFinite(v)) { dot = { x: xAt(i), y: yAt(v) }; break; }
    }
    return { key, color, d: seg.join(" "), dot };
  });

  // 时间轴刻度：首 / 三等分 / 末（去重）
  const n = series.length;
  const tickIdx = Array.from(new Set(n > 1 ? [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1] : [0]));

  return (
    <div data-testid="perf-trend-chart">
      <svg viewBox="0 0 800 240" className="w-full" role="img" aria-label="节点聚合性能趋势（CPU/内存/GPU）" data-testid="perf-trend-svg">
        {/* 网格 + 百分比轴 */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={yAt(v)} y2={yAt(v)} stroke="rgba(0,180,255,0.1)" strokeWidth="1" />
            <text x={L - 6} y={yAt(v) + 3} textAnchor="end" fill="rgba(224,240,255,0.35)" fontSize="9">
              {v}%
            </text>
          </g>
        ))}
        {/* 三线 + 线尾点 */}
        {lines.map((l) => (
          <g key={l.key}>
            {l.d && <path d={l.d} fill="none" stroke={l.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
            {l.dot && <circle cx={l.dot.x} cy={l.dot.y} r="2.5" fill={l.color} />}
          </g>
        ))}
        {/* 时间轴 */}
        <line x1={L} x2={R} y1={B} y2={B} stroke="rgba(0,180,255,0.15)" strokeWidth="1" />
        {n > 0 && tickIdx.map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={222}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fill="rgba(224,240,255,0.35)"
            fontSize="9"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {format(series[i].ts, "HH:mm:ss")}
          </text>
        ))}
      </svg>
      {/* 图例：色点 + 名称 + 最新值 */}
      <div className="flex items-center gap-4 flex-wrap mt-1" data-testid="perf-trend-legend">
        {TREND_LINES.map(({ key, label, color }) => {
          let v: number | null = null;
          for (let i = series.length - 1; i >= 0; i--) {
            const cur = series[i][key];
            if (typeof cur === "number" && Number.isFinite(cur)) { v = cur; break; }
          }
          return (
            <span key={key} className="flex items-center gap-1.5" style={{ fontSize: "0.66rem" }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[rgba(224,240,255,0.55)]">{label}</span>
              <span className="text-[#e0f0ff]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v === null ? "—" : pct(v)}</span>
            </span>
          );
        })}
        <span className="text-[rgba(0,212,255,0.3)] ml-auto" style={{ fontSize: "0.6rem" }}>
          {n} 点 · 每 10s 采样 · 窗口约 10 分钟（服务端历史回填 + 实时续采）
        </span>
      </div>
    </div>
  );
}

/** 探针历史单节点行：probe_ms 迷你趋势 + 可达率/最新值（OpsPanel 实测时序） */
function ProbeNodeRow({ id, points }: { id: string; points: OpsHistoryPoint[] }) {
  const L = 8, R = 792, T = 10, B = 58;
  const msVals = points.filter((p) => p.reachable && Number.isFinite(p.probe_ms)).map((p) => p.probe_ms);
  const latest = points[points.length - 1];
  const reachableCount = points.filter((p) => p.reachable).length;
  const min = msVals.length ? Math.min(...msVals) : 0;
  const max = msVals.length ? Math.max(...msVals) : 0;
  const pad = Math.max(1, (max - min) * 0.15);
  const lo = min - pad;
  const hi = max + pad;
  const xAt = (i: number) => (points.length <= 1 ? (L + R) / 2 : L + (i * (R - L)) / (points.length - 1));
  const yAt = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);

  // probe_ms 折线（仅 reachable 点成线；不可达点以红色刻度标记，不连线）
  const seg: string[] = [];
  let open = false;
  const downTicks: number[] = [];
  points.forEach((p, i) => {
    if (p.reachable && Number.isFinite(p.probe_ms)) {
      seg.push(`${open ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.probe_ms).toFixed(1)}`);
      open = true;
    } else {
      open = false;
      downTicks.push(xAt(i));
    }
  });

  return (
    <div className="px-3 py-2.5 rounded-xl bg-[rgba(0,20,45,0.4)] border border-[rgba(0,180,255,0.08)]" data-testid="probe-history-node">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${latest?.reachable ? "bg-[#00ff88]" : "bg-[rgba(255,51,102,0.8)]"}`} />
          <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.78rem", fontFamily: "'JetBrains Mono', monospace" }}>{id}</span>
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: "0.64rem" }}>
          <span className="text-[rgba(224,240,255,0.5)]">
            最新 <span className="text-[#e0f0ff]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {latest && Number.isFinite(latest.probe_ms) ? `${Math.round(latest.probe_ms)}ms` : "—"}
            </span>
          </span>
          <span className="text-[rgba(224,240,255,0.5)]">
            可达率 <span style={{ color: reachableCount === points.length ? "#00ff88" : "#ff3366", fontFamily: "'JetBrains Mono', monospace" }}>
              {points.length ? `${Math.round((reachableCount / points.length) * 100)}%` : "—"}
            </span>
          </span>
          <span className="text-[rgba(0,212,255,0.3)]">
            {points.length ? `${format(new Date(points[0].ts), "HH:mm:ss")} → ${format(new Date(latest.ts), "HH:mm:ss")}` : ""}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 800 ${B + 16}`} className="w-full" role="img" aria-label={`探针延迟趋势 ${id}`} data-testid="probe-history-sparkline">
        {/* 基线 */}
        <line x1={L} x2={R} y1={B} y2={B} stroke="rgba(0,180,255,0.12)" strokeWidth="1" />
        {seg.length > 0 && (
          <path d={seg.join(" ")} fill="none" stroke="#ffdd00" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        )}
        {/* 不可达点：红色刻度（诚实标记，不连线） */}
        {downTicks.map((x, i) => (
          <line key={i} x1={x} x2={x} y1={B - 5} y2={B + 5} stroke="#ff3366" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

/** 探针可达性 · 延迟趋势卡（OpsPanel /api/history — 唯一服务端留存实测时序） */
function ProbeHistoryCard({ state }: { state: ReturnType<typeof useOpsPanelHistory> }) {
  const entries = Object.entries(state.history).filter(([, pts]) => pts.length > 0);
  return (
    <GlassCard className="p-4">
      <h2 className="text-[#e0f0ff] mb-3 flex items-center gap-2" style={{ fontSize: "0.88rem" }}>
        <Zap className="w-4 h-4 text-[#00ff88]" /> 探针可达性 · 延迟趋势
        <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[#00d4ff]" style={{ fontSize: "0.58rem" }}>
          OpsPanel /api/history 实测
        </span>
      </h2>

      {state.loading ? (
        <p className="py-4 text-center text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.72rem" }} data-testid="probe-history-loading">
          加载探针历史…
        </p>
      ) : entries.length === 0 ? (
        <p className="py-4 text-center text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.72rem" }} data-testid="probe-history-empty">
          {state.error ? "探针历史不可达（OpsPanel /api/history）——保留空态，不构造假曲线" : "暂无历史采样"}
        </p>
      ) : (
        <div className="space-y-2" data-testid="probe-history-list">
          {entries.map(([id, pts]) => <ProbeNodeRow key={id} id={id} points={pts.slice(-60)} />)}
        </div>
      )}

      <p className="text-[rgba(0,212,255,0.25)] mt-3" style={{ fontSize: "0.62rem" }}>
        数据口径：OpsPanel 服务端探针窗口原样透传（{`{ts, reachable, probe_ms}`}），每节点显示最近 60 点；
        不可达点以红色刻度标记、不连线；探针不可达时如实呈现空态。
      </p>
    </GlassCard>
  );
}

export function DevicePerformance() {
  // 挂载即启动两条真实数据源（与 Dashboard 同源）：OpsPanel 10s 探针 + 多节点 WS
  useOpsPanelMetrics();
  useMultiNodeWS();
  const nodes = useNodeSlice((s) => s.nodes);
  const addNode = useNodeSlice((s) => s.addNode);
  const [importing, setImporting] = useState(false);
  // 落档 51：会话级时序采样（10s × 环形 60 点）+ OpsPanel 探针历史（唯一服务端留存时序）
  const series = useNodeTimeSeries();
  const probeHistory = useOpsPanelHistory();

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

      {/* 聚合性能趋势（落档 51/53）：服务端持久历史回填 + 本地 10s 续采；首点前显示「采样中…」，不伪造 */}
      <GlassCard className="p-4">
        <h2 className="text-[#e0f0ff] mb-3 flex items-center gap-2" style={{ fontSize: "0.88rem" }}>
          <Activity className="w-4 h-4 text-[#00d4ff]" /> 聚合性能趋势
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.08)] text-[#00ff88]" style={{ fontSize: "0.58rem" }}>
            服务端持久时序 · 10s 采样 · 环形 60 点
          </span>
        </h2>
        {series.length === 0 ? (
          <div className="py-10 text-center" data-testid="perf-trend-sampling">
            <p className="text-[rgba(0,212,255,0.4)] animate-pulse" style={{ fontSize: "0.75rem" }}>采样中…</p>
            <p className="text-[rgba(0,212,255,0.25)] mt-1" style={{ fontSize: "0.62rem" }}>
              首点到达后开始绘制（每 10s 采一次，无数据不伪造曲线）
            </p>
          </div>
        ) : (
          <TrendChart series={series} />
        )}
      </GlassCard>

      {/* 探针可达性 · 延迟趋势（OpsPanel 实测时序） */}
      <ProbeHistoryCard state={probeHistory} />

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
          数据口径：CPU = 本机 agent 采集的真实 CPU 利用率；GPU/温度 = OpsPanel DCGM 探针（每 10s）；
          无来源指标显示「—」。趋势曲线 = OpsPanel 服务端持久时序回填（服务端自主采样 10s、落盘续接，
          浏览器关闭不丢）+ 前端实时续采（CPU/内存仅前端有来源，服务端历史段如实断线）；
          服务端探针时序见上方「探针可达性 · 延迟趋势」——均不插值、不补零、不伪造。
        </p>
      </GlassCard>
    </div>
  );
}
