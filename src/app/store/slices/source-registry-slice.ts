/**
 * @file: source-registry-slice.ts
 * @description: 数据源注册表 — 系统管理「数据源」页的唯一事实源（落档 58）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [store],[slice],[data-source],[settings]
 *
 * @details:
 * - 主控五原则落地：所有数据源在系统管理可增删改测；本地自用，默认只登记本机/Tailscale 私网源。
 * - agent / OpsPanel 为「绑定源」：URL 仍以 Settings SSOT 为准（binding 字段），
 *   避免出现第二套地址事实源；本 slice 只做镜像展示。
 * - 其余源（Ollama / NAS / DGX / 3118 反代 / DB / FS）由本 slice 持久化，可自由增删改。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSettingsSSOT } from "./settings-ssot-slice";

export type SourceKind =
  | "agent-ws"
  | "opspanel"
  | "ollama"
  | "nas-gateway"
  | "dgx-vllm"
  | "reverse-proxy"
  | "db"
  | "fs";

/** 绑定到 Settings SSOT 的字段（null = 由本注册表独立管理） */
export type SourceBinding = "ssot.wsEndpoint" | "ssot.opsPanelBaseUrl" | null;

export interface SourceTestResult {
  at: number;
  ok: boolean;
  detail: string;
  latencyMs: number;
}

export interface DataSourceEntry {
  id: string;
  kind: SourceKind;
  label: string;
  url: string;
  enabled: boolean;
  binding?: SourceBinding;
  builtin?: boolean;
  note?: string;
  createdAt: number;
  updatedAt?: number;
  lastTest?: SourceTestResult;
}

export interface SourceRegistrySlice {
  sources: DataSourceEntry[];
  addSource: (input: Pick<DataSourceEntry, "kind" | "label" | "url" | "note">) => DataSourceEntry;
  updateSource: (id: string, updates: Partial<Pick<DataSourceEntry, "label" | "url" | "enabled" | "note">>) => void;
  removeSource: (id: string) => void;
  recordTest: (id: string, result: SourceTestResult) => void;
}

const DEFAULT_SOURCES: DataSourceEntry[] = [
  {
    id: "src-agent",
    kind: "agent-ws",
    label: "节点代理 agent（WebSocket）",
    url: "ws://localhost:3113/ws",
    enabled: true,
    binding: "ssot.wsEndpoint",
    builtin: true,
    note: "与「系统设置 → WebSocket」同一事实源；令牌在设置里维护",
    createdAt: 0,
  },
  {
    id: "src-opspanel",
    kind: "opspanel",
    label: "OpsPanel v2（指标源）",
    url: "http://127.0.0.1:7864",
    enabled: true,
    binding: "ssot.opsPanelBaseUrl",
    builtin: true,
    note: "多节点 DCGM / vLLM 指标与探针历史；与设置页同一事实源",
    createdAt: 0,
  },
  {
    id: "src-ollama",
    kind: "ollama",
    label: "Ollama（本地推理）",
    url: "http://localhost:11434",
    enabled: true,
    builtin: true,
    note: "模型发现 /api/tags；聊天走模型自身 baseUrl",
    createdAt: 0,
  },
  {
    id: "src-nas",
    kind: "nas-gateway",
    label: "NAS 统一网关（真实上游）",
    url: "http://100.65.172.88:8000",
    enabled: true,
    builtin: true,
    note: "模型调用当前经 3118 本地反代；此处登记真实上游供核对",
    createdAt: 0,
  },
  {
    id: "src-dgx",
    kind: "dgx-vllm",
    label: "DGX vLLM（svl2 head）",
    url: "http://100.65.64.49:8888",
    enabled: true,
    builtin: true,
    note: "推理服务真实上游；经 3118 /api/v1/llm/dgx 反代",
    createdAt: 0,
  },
  {
    id: "src-proxy",
    kind: "reverse-proxy",
    label: "本地反代 3118",
    url: "http://localhost:3118",
    enabled: true,
    builtin: true,
    note: "保留：浏览器 CORS 与 NAS X-API-Key 头翻译；非第三方转接",
    createdAt: 0,
  },
  {
    id: "src-db",
    kind: "db",
    label: "PostgreSQL（NAS 主库 · 本机备库）",
    url: "http://127.0.0.1:5433",
    enabled: false,
    builtin: true,
    note: "主库 NAS yyc3-45:5433（全家族唯一写入口，PgBouncer :6432，kb :5434）· 本机 yyc3-22:5433 只读从库（写将被 read-only 拒绝）；CP-IM 经 /api/db 服务端代理访问（未实现，启用前先补）；连接变量权威源 OPS docs/connections.env",
    createdAt: 0,
  },
  {
    id: "src-fs",
    kind: "fs",
    label: "文件接口（agent /files）",
    url: "http://127.0.0.1:3113",
    enabled: false,
    builtin: true,
    note: "文件管理实际走 agent HTTP；根目录仍写死，后续迁入设置",
    createdAt: 0,
  },
];

export const useSourceRegistry = create<SourceRegistrySlice>()(
  persist(
    (set) => ({
      sources: DEFAULT_SOURCES,
      addSource: (input) => {
        const now = Date.now();
        const entry: DataSourceEntry = {
          id: `src-custom-${now}-${Math.random().toString(36).slice(2, 6)}`,
          kind: input.kind,
          label: input.label.trim() || input.kind,
          url: input.url.trim(),
          enabled: true,
          binding: null,
          note: input.note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ sources: [...s.sources, entry] }));
        return entry;
      },
      updateSource: (id, updates) => set((s) => ({
        sources: s.sources.map((x) =>
          x.id === id ? { ...x, ...updates, updatedAt: Date.now() } : x,
        ),
      })),
      removeSource: (id) => set((s) => ({
        // 绑定源是运行必需基础设施（agent / OpsPanel），不允许删除；其余（含内置 NAS/DGX）可删可加
        sources: s.sources.filter((x) => x.id !== id || Boolean(x.binding)),
      })),
      recordTest: (id, result) => set((s) => ({
        sources: s.sources.map((x) => (x.id === id ? { ...x, lastTest: result } : x)),
      })),
    }),
    {
      name: "yyc3-source-registry",
      version: 2,
      partialize: (s) => ({ sources: s.sources }),
      // v2：内置源条目（label/note 等说明性字段）以代码为准刷新——用户改的
      // url/enabled/lastTest 原样保留，仅补齐新增内置源
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { sources?: DataSourceEntry[] };
        const existing = Array.isArray(state.sources) ? state.sources : [];
        const refreshed = existing.map((e) => {
          if (!e.builtin || Boolean(e.binding)) { return e; }
          const canonical = DEFAULT_SOURCES.find((d) => d.id === e.id);
          return canonical ? { ...e, label: canonical.label, note: canonical.note } : e;
        });
        const missing = DEFAULT_SOURCES.filter((d) => !refreshed.some((e) => e.id === d.id));
        return { ...state, sources: [...refreshed, ...missing] };
      },
    },
  ),
);

/** 解析数据源最终生效 URL：绑定源以 Settings SSOT 为准（避免双事实源） */
export function resolveSourceUrl(entry: DataSourceEntry): string {
  if (entry.binding === "ssot.wsEndpoint") {
    return useSettingsSSOT.getState().values.wsEndpoint || entry.url;
  }
  if (entry.binding === "ssot.opsPanelBaseUrl") {
    return useSettingsSSOT.getState().values.opsPanelBaseUrl || entry.url;
  }
  return entry.url;
}

/** 绑定源写回 SSOT；非绑定源写本注册表 */
export function setSourceUrl(entry: DataSourceEntry, url: string): void {
  const next = url.trim();
  if (!next) { return; }
  if (entry.binding === "ssot.wsEndpoint") {
    useSettingsSSOT.getState().updateValue("wsEndpoint", next);
    return;
  }
  if (entry.binding === "ssot.opsPanelBaseUrl") {
    useSettingsSSOT.getState().updateValue("opsPanelBaseUrl", next);
    return;
  }
  useSourceRegistry.getState().updateSource(entry.id, { url: next });
}
