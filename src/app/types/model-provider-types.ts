/**
 * @file: model-provider-types.ts
 * @description: AI 模型提供商类型 — 服务商定义 + 配置实例 + Ollama
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-20
 * @updated: 2026-04-20
 * @status: active
 * @tags: [types],[model-provider]
 */

/** 服务商标识 — 改为 string 以支持自定义服务商 */
export type ModelProviderId = string;

/** 服务商定义 */
export interface ModelProviderDef {
  id: ModelProviderId;
  label: string;
  baseUrl: string;
  authType: "bearer" | "api-key" | "none";
  models: string[];
  requiresApiKey: boolean;
  /** 服务商级 API Key（落档 43 §八：详情面板管理；cm 创建时自动带出，仅 persist 本地） */
  apiKey?: string;
  /** 服务商默认 API 格式（模型未单独指定时继承） */
  apiFormat?: "openai" | "anthropic";
  isLocal: boolean;
  isBuiltin?: boolean;
  isCustom?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/** 已配置的模型实例 */
export interface ConfiguredModel {
  id: string;
  providerId: ModelProviderId;
  providerLabel: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  proxyUrl?: string;
  /** API 格式（落档 44）：openai=OpenAI 兼容 /chat/completions；anthropic=Messages /v1/messages */
  apiFormat?: "openai" | "anthropic";
  /** 高级设置：能力旗标（仅声明，供选型/提示，不改变协议） */
  capabilities?: {
    tools?: boolean;
    vision?: boolean;
    reasoning?: boolean;
  };
  /** 高级设置（落档 45 图一）：输入类型——文本恒支持（锁定），其余可选 */
  inputTypes?: {
    text?: boolean;
    image?: boolean;
    video?: boolean;
    pdf?: boolean;
  };
  /** 高级设置（落档 45 图一）：模型能力声明 */
  modelCapabilities?: {
    structuredOutput?: boolean;
    nativeWebSearch?: boolean;
    systemMessages?: boolean;
  };
  /** 高级设置（落档 45 图一）：推理等级（从低到高，如 ["low","high","max"]） */
  reasoningLevels?: string[];
  /** 高级设置（落档 45 图一）：推理参数映射（JSON 文本，原样存储） */
  reasoningParamMapping?: string;
  /** 上下文窗口（tokens，如 128000） */
  contextWindow?: number;
  /** 单次最大输出 tokens（请求 max_tokens 上界） */
  maxOutput?: number;
  createdAt: number;
  lastUsed: number | null;
  status: "active" | "error" | "unchecked";
  lastTestResult?: {
    steps: Array<{ label: string; status: string; detail: string; latencyMs?: number }>;
    suggestion?: string;
    totalLatencyMs: number;
    testedAt: number;
  };
}

/** Ollama 本地模型标签 (来自 /api/tags) */
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/** Ollama /api/tags 响应 */
export interface OllamaTagsResponse {
  models: OllamaModel[];
}
