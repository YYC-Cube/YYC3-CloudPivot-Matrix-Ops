/**
 * @file: provider-slice.ts
 * @description: Provider & ConfiguredModel Zustand slice — AI 服务商统一管理
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: active
 * @tags: [store],[slice],[provider]
 *
 * @details:
 * - 从 useModelProvider.ts 迁移的 Zustand slice
 * - 管理 9 个内置服务商 + 自定义服务商
 * - 管理已配置模型实例 (ConfiguredModel)
 * - Ollama 自动发现（不可达时如实报错；演示模型仅 demoMode 可见）
 * - localStorage 持久化 + 旧键迁移
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { env } from '../../lib/env-config';
import { getOllamaTagsUrl } from '../../lib/ollama-url';
import { useSettingsSSOT } from './settings-ssot-slice';
import type {
  ConfiguredModel,
  ModelProviderDef,
  ModelProviderId,
  OllamaModel,
  OllamaTagsResponse,
} from '../../types';
import { callConfiguredModel } from '../../lib/model-request';

// ============================================================
// 内置服务商定义（规范来源）
// ============================================================

export const BUILTIN_PROVIDERS: ModelProviderDef[] = [
  {
    // YanYuCloudCube 统一网关（主控 2026-11-17 指令）：经 3118 反代 /api/v1/llm/nas
    // （Bearer→X-API-Key 头翻译在反代层，落档 43 §二）；API Key 栏填 NAS vk 令牌。
    // models 系列只列实证可用的 chat 位，网关目录其余模型经下拉自由输入。
    id: "yyc3",
    label: "YanYuCloudCube (YYC³)",
    baseUrl: "http://localhost:3118/api/v1/llm/nas/v1",
    authType: "api-key",
    // 落档 45：清除硬编码系列——模型名一律由用户输入或「从上游拉取」动态发现
    models: [],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "zhipu",
    label: "Z.ai (智谱)",
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
    authType: "api-key",
    models: [],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    authType: "bearer",
    models: [],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "ollama",
    label: "Ollama (本地)",
    baseUrl: "http://localhost:11434",
    authType: "none",
    models: [],
    requiresApiKey: false,
    isLocal: true,
    isBuiltin: true,
  },
];

// ============================================================
// Storage Keys
// ============================================================

const PROVIDERS_KEY = "yyc3_model_providers";
const MODELS_KEY = "yyc3_configured_models";

// ============================================================
// 迁移辅助：从旧 localStorage 键读取数据
// ============================================================

/** 历史硬编码模型系列（落档 45 清除）：迁移时从本地持久化的内置服务商中剔除，
 *  防止旧值继续渲染为「系列快捷 chips」；用户之后手动输入/上游拉取的模型不受影响。 */
const HISTORIC_HARDCODED_SERIES: Record<string, string[]> = {
  yyc3: ["nemotron-3.5-super-vl", "qwen3-coder-30b"],
  zhipu: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-airx", "glm-4-long", "glm-4v-plus", "glm-4.7", "glm-5", "glm-5-turbo", "glm-5.1"],
  deepseek: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner", "deepseek-4", "deepseek-4-flash"],
};

function stripHistoricSeries(provider: ModelProviderDef): ModelProviderDef {
  const historic = HISTORIC_HARDCODED_SERIES[provider.id];
  if (!historic || !provider.models?.length) { return provider; }
  const legacy = new Set(historic);
  return { ...provider, models: provider.models.filter((m) => !legacy.has(m)) };
}

function migrateProviders(): ModelProviderDef[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (raw) {
      const saved: ModelProviderDef[] = JSON.parse(raw);
      const builtinIds = new Set(BUILTIN_PROVIDERS.map((bp) => bp.id));
      const customProviders = saved.filter((p) => !builtinIds.has(p.id) && p.isCustom);
      const merged = [...BUILTIN_PROVIDERS.map((bp) => {
        const existing = saved.find((s) => s.id === bp.id);
        return stripHistoricSeries(existing && existing.updatedAt ? { ...bp, ...existing } : { ...bp });
      }), ...customProviders.map(stripHistoricSeries)];
      return merged;
    }
  } catch { /* ignore */ }
  return BUILTIN_PROVIDERS.map((p) => ({ ...p }));
}

function migrateModels(): ConfiguredModel[] {
  try {
    const raw = localStorage.getItem(MODELS_KEY);
    if (raw) { return JSON.parse(raw); }
  } catch { /* ignore */ }
  return [];
}

// ============================================================
// Slice State & Actions
// ============================================================

/** 模型创建附加项（落档 44/45 高级设置） */
export interface ModelExtras {
  apiFormat?: "openai" | "anthropic";
  capabilities?: { tools?: boolean; vision?: boolean; reasoning?: boolean };
  contextWindow?: number;
  maxOutput?: number;
  inputTypes?: { text?: boolean; image?: boolean; video?: boolean; pdf?: boolean };
  modelCapabilities?: { structuredOutput?: boolean; nativeWebSearch?: boolean; systemMessages?: boolean };
  reasoningLevels?: string[];
  reasoningParamMapping?: string;
}

export interface ProviderSlice {
  // State
  providers: ModelProviderDef[];
  configuredModels: ConfiguredModel[];
  ollamaModels: OllamaModel[];
  ollamaLoading: boolean;
  ollamaError: string | null;
  activeModelId: string | null;
  testingIds: string[];
  /** 落档 57：用户显式删除的内置服务商 id——迁移不再自动补回（可删可减） */
  removedBuiltinIds: string[];

  // Provider CRUD
  addProvider: (provider: Omit<ModelProviderDef, "id" | "isBuiltin" | "isCustom" | "createdAt">) => ModelProviderDef;
  updateProvider: (id: ModelProviderId, updates: Partial<ModelProviderDef>) => void;
  removeProvider: (id: ModelProviderId) => void;
  resetProvider: (id: ModelProviderId) => void;
  /** 重置全部服务商：内置恢复规范定义，自定义服务商及其已配置模型移除 */
  resetAllProviders: () => void;
  addModelToProvider: (providerId: ModelProviderId, modelName: string) => void;
  removeModelFromProvider: (providerId: ModelProviderId, modelName: string) => void;

  // Configured Model CRUD
  addModel: (providerId: ModelProviderId, model: string, apiKey: string, customBaseUrl?: string, proxyUrl?: string, extras?: ModelExtras) => ConfiguredModel | undefined;
  updateModel: (id: string, updates: Partial<ConfiguredModel>) => void;
  removeModel: (id: string) => void;
  testConnection: (id: string) => Promise<{ ok: boolean; detail: string }>;
  testAllConnections: () => Promise<void>;
  setActiveModel: (id: string | null) => void;
  getActiveModel: () => ConfiguredModel | undefined;
  getModelsByStatus: (status: ConfiguredModel["status"]) => ConfiguredModel[];

  // Ollama
  fetchOllamaModels: (baseUrl?: string) => Promise<OllamaModel[]>;

  // Preset
  presetModels: () => { added: number; skipped: string[] };

  // Import/Export
  exportConfig: () => string;
  importConfig: (jsonStr: string) => boolean;
}

export const useProviderSlice = create<ProviderSlice>()(
  persist(
    (set, get) => ({
      // ── State ──
      providers: migrateProviders(),
      configuredModels: migrateModels(),
      ollamaModels: [],
      ollamaLoading: false,
      ollamaError: null,
      activeModelId: null,
      testingIds: [],
      removedBuiltinIds: [],

      // ── Provider CRUD ──

      addProvider: (input) => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newProvider: ModelProviderDef = {
          ...input,
          id,
          isBuiltin: false,
          isCustom: true,
          createdAt: Date.now(),
        };
        set((s) => ({ providers: [...s.providers, newProvider] }));
        return newProvider;
      },

      updateProvider: (id, updates) => {
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
          // 同步更新已配置模型中的 providerLabel / baseUrl
          configuredModels: updates.label || updates.baseUrl
            ? s.configuredModels.map((m) =>
              m.providerId === id
                ? { ...m, providerLabel: updates.label ?? m.providerLabel, baseUrl: updates.baseUrl ?? m.baseUrl }
                : m
            )
            : s.configuredModels,
        }));
      },

      removeProvider: (id) => {
        set((s) => ({
          providers: s.providers.filter((p) => p.id !== id),
          configuredModels: s.configuredModels.filter((m) => m.providerId !== id),
          // 落档 57：内置服务商删除后写入 tombstone，rehydrate 不再自动补回
          removedBuiltinIds: BUILTIN_PROVIDERS.some((b) => b.id === id)
            ? Array.from(new Set([...s.removedBuiltinIds, id]))
            : s.removedBuiltinIds,
          activeModelId: s.activeModelId && s.configuredModels.some((m) => m.id === s.activeModelId && m.providerId !== id)
            ? s.activeModelId
            : null,
        }));
      },

      resetProvider: (id) => {
        const builtin = BUILTIN_PROVIDERS.find((p) => p.id === id);
        if (!builtin) { return; }
        set((s) => ({
          providers: s.providers.some((p) => p.id === id)
            ? s.providers.map((p) => (p.id === id ? { ...builtin, updatedAt: Date.now() } : p))
            : [...s.providers, { ...builtin, updatedAt: Date.now() }],
          // 重置内置 = 撤销该 id 的删除标记
          removedBuiltinIds: s.removedBuiltinIds.filter((x) => x !== id),
        }));
      },

      resetAllProviders: () => {
        const builtinIds = new Set(BUILTIN_PROVIDERS.map((p) => p.id));
        set((s) => {
          // 保留挂在内置服务商下的已配置模型（含用户 API Key），
          // 自定义服务商被移除，其模型一并清除
          const keptModels = s.configuredModels.filter((m) => builtinIds.has(m.providerId));
          const keptIds = new Set(keptModels.map((m) => m.id));
          return {
            providers: BUILTIN_PROVIDERS.map((p) => ({ ...p })),
            configuredModels: keptModels,
            activeModelId: s.activeModelId && keptIds.has(s.activeModelId) ? s.activeModelId : null,
            removedBuiltinIds: [],
          };
        });
      },

      addModelToProvider: (providerId, modelName) => {
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === providerId && !p.models.includes(modelName)
              ? { ...p, models: [...p.models, modelName], updatedAt: Date.now() }
              : p
          ),
        }));
      },

      removeModelFromProvider: (providerId, modelName) => {
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.filter((m) => m !== modelName), updatedAt: Date.now() }
              : p
          ),
        }));
      },

      // ── Configured Model CRUD ──

      addModel: (providerId, model, apiKey, customBaseUrl, proxyUrl, extras) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (!provider) { return undefined; }

        const newModel: ConfiguredModel = {
          id: `${providerId}-${model}-${Date.now()}`,
          providerId,
          providerLabel: provider.label,
          model,
          apiKey,
          baseUrl: customBaseUrl || provider.baseUrl,
          proxyUrl: proxyUrl || undefined,
          // 格式继承：显式 extras 优先 → 服务商默认 → 按 baseUrl 启发（/anthropic 路径）
          apiFormat: extras?.apiFormat
            ?? provider.apiFormat
            ?? ((customBaseUrl || provider.baseUrl || "").includes("/anthropic") ? "anthropic" : "openai"),
          capabilities: extras?.capabilities,
          contextWindow: extras?.contextWindow,
          maxOutput: extras?.maxOutput,
          inputTypes: extras?.inputTypes,
          modelCapabilities: extras?.modelCapabilities,
          reasoningLevels: extras?.reasoningLevels,
          reasoningParamMapping: extras?.reasoningParamMapping,
          createdAt: Date.now(),
          lastUsed: null,
          status: "unchecked",
        };

        set((s) => ({ configuredModels: [...s.configuredModels, newModel] }));
        return newModel;
      },

      updateModel: (id, updates) => {
        set((s) => ({
          configuredModels: s.configuredModels.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      removeModel: (id) => {
        set((s) => ({ configuredModels: s.configuredModels.filter((m) => m.id !== id) }));
      },

      testConnection: async (id) => {
        const model = get().configuredModels.find((m) => m.id === id);
        if (!model) { return { ok: false, detail: "模型不存在" }; }

        set((s) => ({ testingIds: [...s.testingIds, id] }));

        // 落档 46：测试 = 实弹（与聊天同一统一层），不再走独立诊断链路。
        // 原实现直连 baseUrl + 恒 OpenAI 格式 → 反代/Anthropic 端点恒假阳性。
        const startedAt = Date.now();
        let ok = false;
        let detail = "";
        const steps: Array<{ label: string; status: string; detail: string; latencyMs?: number }> = [];

        try {
          if (model.providerId === "ollama") {
            const base = (model.baseUrl || env("OLLAMA_BASE_URL") || "http://localhost:11434").replace(/\/$/, "");
            const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(8000) });
            const latency = Date.now() - startedAt;
            ok = res.ok;
            detail = ok
              ? `Ollama 服务可达（${base}/api/tags 200）`
              : `Ollama 服务返回 HTTP ${res.status}（${base}/api/tags）`;
            steps.push({ label: "Ollama 服务", status: ok ? "pass" : "fail", detail, latencyMs: latency });
          } else {
            const t0 = Date.now();
            // 落档 47：smoke 用 32 tokens——原 max_tokens:1 会让上游返回空 content
            // （finish_reason=length）而误判失败（图二「测试通过却异常」的另一半根因）
            // 64 tokens + 智谱 thinking 默认开启会吞掉全部输出 → smoke 显式关闭
            // （仅测试请求；用户可在高级设置「推理参数映射」为聊天固化该参数）
            const smokeModel = model.providerId === "zhipu" && !model.reasoningParamMapping
              ? { ...model, reasoningParamMapping: '{"thinking":{"type":"disabled"}}' }
              : model;
            const r = await callConfiguredModel("", [{ role: "user", content: "ping" }], smokeModel, {
              temperature: 0,
              maxTokens: 64,
            });
            const latency = Date.now() - t0;
            // 服务可达 + choices 非空即视为连通（即使内容被截断）
            const truncatedOnly = !r.success && /finish_reason=length/.test(r.error || "");
            ok = r.success || truncatedOnly;
            detail = r.success
              ? "模型真实往返成功（32 tokens 冒烟）"
              : truncatedOnly
                ? "服务可达 · 输出被截断（连通性正常）"
                : (r.error || "调用失败");
            steps.push({ label: "网络可达性", status: "pass", detail: `请求已发出（${latency}ms）`, latencyMs: latency });
            // 落档 48：步骤标签/状态与结论一致——原实现 ok=true 但 label 仍「调用失败」+ fail
            steps.push({
              label: r.success ? "API Key 认证 + 生成" : truncatedOnly ? "连通性验证" : "调用失败",
              status: r.success ? "pass" : truncatedOnly ? "warn" : "fail",
              detail,
              latencyMs: latency,
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          detail = msg.includes("timeout") || msg.includes("abort") ? "连接超时（8-60s）" : msg;
          steps.push({ label: "调用异常", status: "fail", detail });
          ok = false;
        }

        set((s) => ({
          configuredModels: s.configuredModels.map((m) => {
            if (m.id !== id) { return m; }
            return {
              ...m,
              status: ok ? "active" as const : "error" as const,
              lastUsed: Date.now(),
              lastTestResult: {
                steps,
                suggestion: ok ? undefined : detail,
                totalLatencyMs: Date.now() - startedAt,
                testedAt: Date.now(),
              },
            };
          }),
          testingIds: s.testingIds.filter((tid) => tid !== id),
        }));
        // 落档 47：返回真实结果，供 UI 提示语与实际状态一致（原提示恒「通过」）
        return { ok, detail };
      },

      testAllConnections: async () => {
        const models = get().configuredModels;
        for (const model of models) {
          await get().testConnection(model.id);
        }
      },

      setActiveModel: (id) => {
        set({ activeModelId: id });
      },

      getActiveModel: () => {
        const { activeModelId, configuredModels } = get();
        if (!activeModelId) {
          const firstActive = configuredModels.find((m) => m.status === "active");
          return firstActive || configuredModels[0];
        }
        return configuredModels.find((m) => m.id === activeModelId);
      },

      getModelsByStatus: (status) => {
        return get().configuredModels.filter((m) => m.status === status);
      },

      // ── Ollama ──

      fetchOllamaModels: async (baseUrl) => {
        const ollamaProvider = get().providers.find((p) => p.id === "ollama");
        const url = baseUrl || ollamaProvider?.baseUrl || env("OLLAMA_BASE_URL") || "http://localhost:11434";

        set({ ollamaLoading: true, ollamaError: null });

        try {
          const tagsUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/tags` : getOllamaTagsUrl();
          const res = await fetch(tagsUrl, { method: "GET", signal: AbortSignal.timeout(5000) });
          if (!res.ok) { throw new Error(`HTTP ${res.status}`); }

          const data: OllamaTagsResponse = await res.json();
          const models = data.models || [];

          set((s) => ({
            ollamaModels: models,
            ollamaLoading: false,
            providers: models.length > 0
              ? s.providers.map((p) => p.id === "ollama" ? { ...p, models: models.map((m) => m.name), baseUrl: url } : p)
              : s.providers,
          }));

          return models;
        } catch (err: unknown) {
          // 真实化政策：Ollama 不可达时如实报错 + 空列表，
          // 绝不把演示模型伪装成已发现模型注入 provider.models。
          // 演示模式下才提供演示模型（明确标注，不写入 provider.models）。
          const demoMode = useSettingsSSOT.getState().toggles.demoMode;

          if (demoMode) {
            const demoModels: OllamaModel[] = [
              { name: "demo-llm:latest", model: "demo-llm:latest", modified_at: new Date().toISOString(), size: 0, digest: "demo", details: { parent_model: "", format: "gguf", family: "demo", parameter_size: "0B", quantization_level: "DEMO" } },
            ];

            set({
              ollamaModels: demoModels,
              ollamaError: `连接失败（演示模式，以下为演示模型）: ${(err as Error).message}`,
              ollamaLoading: false,
            });

            return demoModels;
          }

          set({
            ollamaModels: [],
            ollamaError: `Ollama 连接失败: ${(err as Error).message}`,
            ollamaLoading: false,
          });

          return [];
        }
      },

      // ── Import/Export ──

      exportConfig: () => {
        const { providers, configuredModels } = get();
        return JSON.stringify({
          version: 2,
          exportedAt: Date.now(),
          providers: providers.filter((p) => !p.isBuiltin || p.updatedAt),
          configuredModels,
        }, null, 2);
      },

      importConfig: (jsonStr) => {
        try {
          const data = JSON.parse(jsonStr);
          if (data.providers) {
            set((s) => {
              const currentIds = new Set(s.providers.map((p) => p.id));
              const imported = data.providers.filter((p: ModelProviderDef) => !currentIds.has(p.id));
              const updated = s.providers.map((p) => {
                const match = data.providers.find((dp: ModelProviderDef) => dp.id === p.id && !p.isBuiltin);
                return match ? { ...p, ...match } : p;
              });
              return { providers: [...updated, ...imported] };
            });
          }
          if (data.configuredModels) {
            set((s) => {
              const currentIds = new Set(s.configuredModels.map((m) => m.id));
              const imported = data.configuredModels.filter((m: ConfiguredModel) => !currentIds.has(m.id));
              return { configuredModels: [...s.configuredModels, ...imported] };
            });
          }
          return true;
        } catch {
          return false;
        }
      },

      presetModels: () => {
        // 落档 43 §十评估处置：原实现硬编码 zhipu/deepseek 系列 + 从 VITE_ env 读
        // key（客户端包必然为空，产出恒"未检测"死模型）——与统一数据源纪律冲突。
        // 现改为：遍历 providers 注册表（含自定义），凡「有预设系列且 Key 就绪
        // （provider.apiKey 或无需 Key）」的服务商，一键补齐其未配置的系列模型，
        // 状态 unchecked（待测试）；无 Key 服务商跳过并在返回值中报告。
        const { providers, configuredModels } = get();
        const existingKeys = new Set(configuredModels.map((m) => `${m.providerId}:${m.model}`));
        const presets: ConfiguredModel[] = [];
        const skipped: string[] = [];

        for (const p of providers) {
          const keyReady = !p.requiresApiKey || !!p.apiKey;
          if (!keyReady) {
            skipped.push(p.label);
            continue;
          }
          for (const modelName of p.models) {
            if (!existingKeys.has(`${p.id}:${modelName}`)) {
              presets.push({
                id: `preset-${p.id}-${modelName}-${Date.now()}`,
                providerId: p.id,
                providerLabel: p.label,
                model: modelName,
                apiKey: p.apiKey || "",
                baseUrl: p.baseUrl,
                createdAt: Date.now(),
                lastUsed: null,
                status: "unchecked",
              });
            }
          }
        }

        if (presets.length > 0) {
          set((s) => ({ configuredModels: [...s.configuredModels, ...presets] }));
        }
        return { added: presets.length, skipped };
      },
    }),
    {
      name: 'yyc3-provider-slice',
      partialize: (state) => ({
        providers: state.providers,
        configuredModels: state.configuredModels,
        activeModelId: state.activeModelId,
        removedBuiltinIds: state.removedBuiltinIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) { return; }
        const zhipuApiKey = env("ZHIPU_API_KEY");
        const deepseekApiKey = env("DEEPSEEK_API_KEY");
        const ollamaBaseUrl = env("OLLAMA_BASE_URL") || "http://localhost:11434";
        const zhipuBaseUrl = BUILTIN_PROVIDERS.find(p => p.id === "zhipu")?.baseUrl || "https://open.bigmodel.cn/api/coding/paas/v4";
        const deepseekBaseUrl = BUILTIN_PROVIDERS.find(p => p.id === "deepseek")?.baseUrl || "https://api.deepseek.com/v1";

        let needsUpdate = false;
        const updated = state.configuredModels.map((m) => {
          const patch: Partial<ConfiguredModel> = {};
          if (m.providerId === "zhipu" && !m.apiKey && zhipuApiKey) {
            patch.apiKey = zhipuApiKey;
            patch.baseUrl = zhipuBaseUrl;
          } else if (m.providerId === "deepseek" && !m.apiKey && deepseekApiKey) {
            patch.apiKey = deepseekApiKey;
            patch.baseUrl = deepseekBaseUrl;
          } else if (m.providerId === "ollama" && m.baseUrl !== ollamaBaseUrl) {
            patch.baseUrl = ollamaBaseUrl;
          }
          if (Object.keys(patch).length > 0) {
            needsUpdate = true;
            return { ...m, ...patch };
          }
          return m;
        });

        if (state.configuredModels.length === 0 && (zhipuApiKey || deepseekApiKey)) {
          const autoPresets: ConfiguredModel[] = [];
          const now = Date.now();
          if (zhipuApiKey) {
            for (const model of ["glm-4-flash", "glm-4-plus", "glm-5", "glm-5-turbo"]) {
              autoPresets.push({
                id: `auto-zhipu-${model}-${now}`,
                providerId: "zhipu",
                providerLabel: "Z.ai (智谱)",
                model,
                apiKey: zhipuApiKey,
                baseUrl: zhipuBaseUrl,
                createdAt: now,
                lastUsed: null,
                status: "unchecked",
              });
            }
          }
          if (deepseekApiKey) {
            for (const model of ["deepseek-chat", "deepseek-4", "deepseek-4-flash"]) {
              autoPresets.push({
                id: `auto-deepseek-${model}-${now}`,
                providerId: "deepseek",
                providerLabel: "DeepSeek",
                model,
                apiKey: deepseekApiKey,
                baseUrl: deepseekBaseUrl,
                createdAt: now,
                lastUsed: null,
                status: "unchecked",
              });
            }
          }
          state.configuredModels = autoPresets;
        } else if (needsUpdate) {
          state.configuredModels = updated;
        }

        // 落档 57：保留用户已存服务商（含自定义与编辑），只补齐未被显式删除的内置服务商。
        // 此前 migrateProviders() 整体覆盖会导致自定义服务商/编辑在刷新后丢失；
        // 也不再强制用 env 地址覆盖用户已配置的 baseUrl（「当前已定即可」）。
        {
          const existing = state.providers ?? [];
          const tombstoned = new Set(state.removedBuiltinIds ?? []);
          const missingBuiltins = BUILTIN_PROVIDERS.filter(
            (b) => !tombstoned.has(b.id) && !existing.some((p) => p.id === b.id),
          );
          state.providers = [...existing, ...missingBuiltins];
        }

        // 落档 59：旧 provider 键已在初始化时读取迁移，删除避免「新键损坏/清空后旧 provider 复活」
        // （旧键含明文 apiKey，也不应继续留在备份/清空清单里）
        try {
          localStorage.removeItem("yyc3_model_providers");
          localStorage.removeItem("yyc3_configured_models");
        } catch { /* 存储不可用时忽略 */ }
      },
    }
  )
);

if (typeof window !== "undefined") {
  setTimeout(() => useProviderSlice.getState().fetchOllamaModels(), 100);
}
