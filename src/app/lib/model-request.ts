/**
 * @file: model-request.ts
 * @description: 模型统一请求层（落档 46 从 family-ai-service 抽出）——
 *               provider-slice 的测试链路与 Family/浮窗聊天链路共用同一实现，
 *               避免「测试通过但聊天失败」的链路分叉（循环依赖也因此解除）。
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [lib],[model],[request]
 */

import type { ConfiguredModel } from "../types";

export interface ModelCallResult {
  text: string;
  success: boolean;
  error?: string;
}

export interface ModelCallOptions {
  temperature?: number;
  maxTokens?: number;
}

/** 上游同源反代映射（路由逻辑）：浏览器对 bigmodel 等直连被 CORS 阻断（实证）。 */
const UPSTREAM_PROXY_MAP: Record<string, string> = {
  zhipu: "/api/v1/llm/zhipu",
  deepseek: "/api/v1/llm/deepseek",
};

/**
 * 解析实际请求根：显式 proxyUrl > 同源反代（http 环境）> 直连 baseUrl。
 * 全站唯一路由决策点（聊天 / 测试 / 上游模型发现共用）。
 */
export function resolveRequestRoot(
  model: Pick<ConfiguredModel, "baseUrl" | "proxyUrl" | "providerId">,
): { root: string; viaProxy: boolean } {
  const base = (model.baseUrl || "").replace(/\/$/, "");
  if (model.proxyUrl) {
    const pathPart = base.replace(/^https?:\/\/[^/]+/, "");
    return {
      root: `${model.proxyUrl.replace(/\/$/, "")}${pathPart}`.replace(/\/+$/, ""),
      viaProxy: true,
    };
  }
  const isHttp = typeof window !== "undefined" && /^https?:$/.test(window.location.protocol);
  const mapped = UPSTREAM_PROXY_MAP[model.providerId];
  if (isHttp && mapped && /^https?:\/\//.test(base)) {
    const pathPart = base.replace(/^https?:\/\/[^/]+/, "");
    return { root: `${window.location.origin}${mapped}${pathPart}`, viaProxy: true };
  }
  return { root: base, viaProxy: false };
}

/** Ollama 原生 chat 端点（与反代/同源语义对齐） */
function getOllamaChatUrl(): string {
  const base = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:11434`
    : "http://localhost:11434";
  return `${base}/api/chat`;
}

/** 统一模型调用：按 apiFormat 分流（openai /chat/completions ｜ anthropic /v1/messages） */
export async function callConfiguredModel(
  _systemPrompt: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: ConfiguredModel,
  opts: ModelCallOptions = {},
): Promise<ModelCallResult> {
  const { root, viaProxy } = resolveRequestRoot(model);
  const apiFormat = model.apiFormat
    ?? ((model.baseUrl || "").includes("/anthropic") ? "anthropic" : "openai");
  const maxTokens = model.maxOutput ?? opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.8;

  // ── Anthropic Messages 分支 ──
  if (apiFormat === "anthropic") {
    const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
    const conv = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }));
    const url = /\/v1$/.test(root) ? `${root}/messages` : `${root}/v1/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": model.apiKey || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: model.model,
          max_tokens: maxTokens,
          ...(sys ? { system: sys } : {}),
          messages: conv,
          temperature,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { text: "", success: false, error: `模型服务返回 HTTP ${res.status}${body ? `：${body.slice(0, 200)}` : ""}（${url}）` };
      }
      const data = await res.json() as {
        content?: Array<{ type?: string; text?: string }>;
        stop_reason?: string;
        error?: { message?: string };
      };
      if (data.error?.message) {
        return { text: "", success: false, error: `模型返回错误：${data.error.message.slice(0, 200)}` };
      }
      const text = (data.content || [])
        .filter(b => b.type === "text" || typeof b.text === "string")
        .map(b => b.text || "")
        .join("")
        .trim();
      if (text) { return { text, success: true }; }
      return {
        text: "",
        success: false,
        error: `模型返回空内容（stop_reason=${data.stop_reason ?? "unknown"}${viaProxy ? "，经同源反代" : ""}）`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        text: "",
        success: false,
        error: /Failed to fetch|Load failed|NetworkError/i.test(msg)
          ? `网络不可达/CORS 阻断（${url}）——请确认 3118 同源反代可用或改配代理 URL`
          : `无法连接模型服务（${url}）：${msg}`,
      };
    }
  }

  // ── OpenAI 兼容分支 ──
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (model.apiKey) { headers["Authorization"] = `Bearer ${model.apiKey}`; }
    const url = model.providerId === "ollama" && !model.proxyUrl
      ? getOllamaChatUrl()
      : `${root}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        text: "",
        success: false,
        error: `模型服务返回 HTTP ${response.status}${body ? `：${body.slice(0, 200)}` : ""}（${url}）`,
      };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string; reasoning?: string }; finish_reason?: string }>;
      error?: { message?: string };
    };
    if (data.error?.message) {
      return { text: "", success: false, error: `模型返回错误：${data.error.message.slice(0, 200)}` };
    }
    const choice = data.choices?.[0];
    const text = choice?.message?.content?.trim() || "";
    if (text) { return { text, success: true }; }
    const reasoning = choice?.message?.reasoning?.trim() || "";
    if (reasoning) {
      return { text: reasoning.length > 400 ? reasoning.slice(-400) : reasoning, success: true };
    }
    // 空内容诊断三分（落档 44）
    const choicesLen = data.choices?.length ?? 0;
    const finish = choice?.finish_reason ?? "unknown";
    let diag = `模型返回空内容（choices=${choicesLen} · finish_reason=${finish}`;
    if (viaProxy) { diag += " · 经同源反代"; }
    diag += "）";
    if (choicesLen === 0) {
      diag += `——响应不含 choices，可能 API 格式不匹配（当前按 OpenAI 兼容调用）或模型名「${model.model}」不被上游接受`;
    } else if (finish === "length") {
      diag += "——输出被 max_tokens 截断，请在高级设置调大「输出」上限";
    } else {
      diag += "——上游返回空文本，请核对模型名与账号额度";
    }
    return { text: "", success: false, error: diag };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      success: false,
      error: /Failed to fetch|Load failed|NetworkError/i.test(msg)
        ? `网络不可达/CORS 阻断（${root}）——浏览器直连该上游被拦，请走 3118 同源反代或配置代理 URL`
        : `无法连接模型服务（${root}）：${msg}`,
    };
  }
}
