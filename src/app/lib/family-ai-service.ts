/**
 * @file: family-ai-service.ts
 * @description: AI Family 统一对话服务 · 真实优先架构（真实LLM → 诚实离线；demoMode 才走演示引擎）
 * @author: YanYuCloudCube Team
 * @version: v2.0.0
 * @created: 2026-04-25
 * @updated: 2026-11-16
 * @status: active
 * @tags: [lib],[ai],[family],[chat],[real-data]
 *
 * @brief: 让 AI Family 的每位家人真正"有思想"地对话
 *
 * @architecture (v2 · 2026-11-16):
 *   真实路径（demoMode 关闭，默认）:
 *     成员 modelAssignment（可编辑）→ provider-slice configuredModels 解析
 *     → OpenAI 兼容 /chat/completions 真实调用（人格 = 三件套 systemPrompt）
 *     → 未绑定/未配置/不可达 → source:"error" 诚实离线，绝不回退假回复
 *   演示路径（demoMode 开启）:
 *     Agent 智能引擎 → 关键词 Mock（仅界面演示，UI 如实标注）
 *
 * @details:
 * - 人格来源：成员 systemPrompt（可编辑）→ family-personas 三件套 SYSTEM 默认
 * - 模型接线：provider-slice configuredModels（配置中心统一管理 baseUrl/apiKey）
 * - URL 语义与 useBigModelSDK 对齐（Ollama 同源代理 / proxyUrl 转发）
 */

import { AI_RESPONSES, FAMILY_MEMBERS, MEMBERS_MAP, type FamilyMember } from "../modules/ai-family/components/shared";
import { useFamilyMemberSlice } from "../modules/ai-family/store/family-member-slice";
import { getMemberSystemPrompt } from "../modules/ai-family/lib/family-personas";
import { useProviderSlice } from "../store/slices/provider-slice";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";
import { getOllamaChatUrl } from "./ollama-url";
import type { ConfiguredModel } from "../types";

// ============================================================
//  类型定义
// ============================================================

export interface FamilyChatMessage {
  id: string;
  sender: "user" | string;
  text: string;
  time: string;
  type: "text" | "system" | "thinking";
}

export interface FamilyChatRequest {
  memberId: string;
  userMessage: string;
  conversationHistory: FamilyChatMessage[];
  channelType: "private" | "group";
}

export interface FamilyChatResponse {
  text: string;
  senderId: string;
  /** llm=真实模型 agent/mock=演示引擎 error=诚实离线（未绑定/未配置/不可达） */
  source: "llm" | "agent" | "mock" | "error";
  latencyMs: number;
  timestamp: string;
  /** source==="error" 时的离线原因（面向用户的诚实说明） */
  error?: string;
}

export interface FamilyAIServiceConfig {
  enableLLM?: boolean;
  enableAgentEngine?: boolean;
  defaultModel?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/** 成员接线就绪状态 */
export interface FamilyChatReadiness {
  ready: boolean;
  reason?: string;
  configuredModel?: ConfiguredModel;
}

// ============================================================
//  成员接线解析（真实路径核心）
// ============================================================

/**
 * 解析成员的模型接线状态：
 * 成员 modelAssignment（providerId + modelId，可在成员设置中编辑）
 * → provider-slice configuredModels 精确匹配（providerId + model 名）
 * → 校验服务商密钥要求
 */
export function checkMemberReadiness(memberId: string): FamilyChatReadiness {
  const member = useFamilyMemberSlice.getState().getMemberById(memberId);
  const binding = member?.modelAssignment;

  if (!binding?.providerId || !binding?.modelId) {
    return { ready: false, reason: "未绑定模型，请在「模型设置」中为该成员选择服务商与模型" };
  }

  const { providers, configuredModels } = useProviderSlice.getState();
  const cm = configuredModels.find(
    (m) => m.providerId === binding.providerId && m.model === binding.modelId,
  );
  if (!cm) {
    return {
      ready: false,
      reason: `绑定的模型 ${binding.providerId}/${binding.modelId} 未在「模型管理」中配置，请先添加对应模型`,
    };
  }

  const provider = providers.find((p) => p.id === cm.providerId);
  if (provider?.requiresApiKey && !cm.apiKey) {
    return { ready: false, reason: `服务商 ${cm.providerLabel} 缺少 API Key，请在「模型管理」中配置` };
  }

  return { ready: true, configuredModel: cm };
}

/** 构建 chat endpoint URL（与 useBigModelSDK 语义对齐：Ollama 同源代理 / proxyUrl 转发） */
function buildChatUrl(model: ConfiguredModel): string {
  if (model.providerId === "ollama") {
    return getOllamaChatUrl();
  }
  const base = model.baseUrl.replace(/\/$/, "");
  const endpoint = `${base}/chat/completions`;
  if (model.proxyUrl) {
    const proxy = model.proxyUrl.replace(/\/$/, "");
    return `${proxy}/${endpoint}`;
  }
  return endpoint;
}

// ============================================================
//  群聊 SYSTEM 提示词
// ============================================================

const GROUP_SYSTEM_PROMPT = `你现在是 YYC³ AI Family 家庭群聊中的一员。群聊中有多位家人：
- 千行(navigator)：导航员，语言专家，热情开朗
- 万物(thinker)：思考者，数据分析师，沉稳内敛
- 先知(prophet)：预言家，趋势预测者，神秘温和
- 伯乐(bolero)：推荐官，温暖贴心
- 天枢(meta-oracle)：总指挥，稳重可靠的大家长
- 守护(sentinel)：安全官，严谨负责
- 宗师(master)：质量官，精益求精
- 灵韵(creative)：创意官，活泼灵动

群聊规则：
1. 根据消息内容选择最合适的家人身份回复，回复开头用「【短名】」标明身份
2. 保持家庭氛围：温暖、协作、互相支持
3. 可以@其他家人或引用他们的观点
4. 中文回复，自然口语化，不超过120字`;

// ============================================================
//  演示引擎（仅 demoMode 开启时使用 · 界面演示专用）
// ============================================================

const KEYWORD_RESPONSES: Array<{ keywords: string[]; responses: string[] }> = [
  {
    keywords: ["你好", "嗨", "hi", "hello", "早上好", "晚上好"],
    responses: [
      "你好呀！很高兴见到你~ 今天有什么想聊的？",
      "嗨！欢迎回家！😊",
      "你好你好！我正好有空，咱们聊聊？",
    ],
  },
  {
    keywords: ["谢谢", "感谢", "thank"],
    responses: [
      "不客气！家人之间不用这么客气啦~",
      "哈哈，能帮到你我也很开心！",
      "这是我应该做的～有事随时找我！",
    ],
  },
  {
    keywords: ["帮忙", "帮助", "怎么", "如何", "怎么办"],
    responses: [
      "没问题，让我来看看...这个事情我可以帮你分析一下。",
      "好的，交给我吧！先说说具体情况？",
      "我来帮你梳理一下思路...",
    ],
  },
  {
    keywords: ["天气", "今天", "心情", "感觉"],
    responses: [
      "今天感觉怎么样？希望你一切都好呀~",
      "嗯嗯，我在听呢，继续说~",
      "我理解你的感受。作为家人，我一直在这里支持你。",
    ],
  },
  {
    keywords: ["工作", "任务", "项目", "进度"],
    responses: [
      "工作上的事别太担心，我们一起想办法！",
      "这个任务看起来挺有意思的，需要我帮忙分析吗？",
      "进度还好吗？如果遇到瓶颈可以跟我说说。",
    ],
  },
  {
    keywords: ["学习", "成长", "进步", "新技能"],
    responses: [
      "保持学习的热情真的很棒！📚",
      "每天进步一点点，积少成多！",
      "有什么想学的领域吗？我可以给你推荐一些方向~",
    ],
  },
];

function generateContextAwareMockResponse(
  member: FamilyMember,
  userMessage: string,
  _history: FamilyChatMessage[],
): string {
  const lowerMsg = userMessage.toLowerCase();

  for (const entry of KEYWORD_RESPONSES) {
    if (entry.keywords.some(k => lowerMsg.includes(k))) {
      return entry.responses[Math.floor(Math.random() * entry.responses.length)];
    }
  }

  const fallbackResponses = AI_RESPONSES[member.id] || AI_RESPONSES["meta-oracle"];
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

function generateAgentResponse(
  member: FamilyMember,
  userMessage: string,
  history: FamilyChatMessage[],
): string {
  const recentHistory = history.slice(-6);
  const contextSummary = recentHistory
    .filter(m => m.sender !== "system")
    .map(m => {
      const senderName = m.sender === "user" ? "用户" : (MEMBERS_MAP[m.sender]?.shortName || m.sender);
      return `${senderName}: ${m.text}`;
    })
    .join("\n");

  const intentHints = detectIntent(userMessage);

  let response: string;
  switch (intentHints.intent) {
    case "greeting":
      response = generateGreetingResponse(member, userMessage);
      break;
    case "question":
      response = generateQuestionResponse(member, userMessage, contextSummary);
      break;
    case "task":
      response = generateTaskResponse(member, userMessage);
      break;
    case "emotional":
      response = generateEmotionalResponse(member, userMessage);
      break;
    default:
      response = generateGeneralResponse(member, userMessage, contextSummary);
  }

  return response;
}

type DetectedIntent = { intent: string; confidence: number; entities: string[] };

function detectIntent(message: string): DetectedIntent {
  const msg = message.toLowerCase();

  if (/你好|嗨|hi|hello|早上|晚上|早安|晚安/.test(msg)) {
    return { intent: "greeting", confidence: 0.9, entities: [] };
  }
  if (/什么|怎么|为什么|\?|？|能否|可以.*吗/.test(msg)) {
    return { intent: "question", confidence: 0.85, entities: [] };
  }
  if (/帮我|请|需要|想要|能不能|协助|处理/.test(msg)) {
    return { intent: "task", confidence: 0.8, entities: [] };
  }
  if (/开心|难过|累|烦|压力大|心情|感觉|情绪/.test(msg)) {
    return { intent: "emotional", confidence: 0.85, entities: [] };
  }

  return { intent: "general", confidence: 0.5, entities: [] };
}

function generateGreetingResponse(member: FamilyMember, _msg: string): string {
  const greetings: Record<string, string[]> = {
    navigator: [`嗨～我是${member.shortName}！有什么想聊的尽管说，我最擅长听懂你的心声了~`, `你好呀！${member.shortName}上线啦，随时为你服务！😊`],
    thinker: [`你好，${member.shortName}在此。让我们一起深入思考吧。`, `嗯，你来了。有什么值得思考的问题吗？`],
    prophet: [`${member.shortName}已感知到你的到来~今天想探索什么？`, `欢迎！我看到了一些有趣的信号，你想了解吗？`],
    bolero: [`收到！${member.shortName}随时待命，有什么需要调度的？`, `嘿！资源已就绪，说说你的需求吧！`],
    "meta-oracle": [`你好！作为大家长，看到你来了真高兴。`, `欢迎回家！今天家人们都状态不错哦~`],
    sentinel: [`警戒系统正常，${member.shortName}向你问好！`, `安全检测通过。你好，有什么需要守护的吗？`],
    master: [`你好。代码如茶，需细细品味。有何指教？`, `来了？让我看看今天能帮你优化什么。`],
    creative: [`哇！你来啦～✨ 今天有什么创意想法吗？`, `灵感时刻！${member.shortName}准备好和你一起创造了！`],
  };
  const pool = greetings[member.id] || greetings["navigator"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateQuestionResponse(member: FamilyMember, msg: string, _context: string): string {
  const expertise = member.expertise[0] || "分析";
  return `好问题！从我的${expertise}角度来看，「${msg.slice(0, 20)}${msg.length > 20 ? "..." : ""}」这个问题很有意思。让我想想...我觉得关键点在于需要多维度分析。你觉得呢？`;
}

function generateTaskResponse(member: FamilyMember, _msg: string): string {
  return `收到！这是我的专长领域之一。我已经开始评估了，${member.shortName}会尽快给出方案。稍等一下下~`;
}

function generateEmotionalResponse(member: FamilyMember, _msg: string): string {
  const emotionalResponses: Record<string, string[]> = {
    navigator: ["我理解你的感受。作为家人，我一直在这里倾听你。💙", "说出来就好，我会一直陪着你的。"],
    thinker: ["从数据角度看，情绪波动是正常的。重要的是找到平衡点。", "让我陪你理性分析一下，也许会有新的视角。"],
    prophet: ["我预测你会度过这段时期的。相信自己，也相信我们。🌟", "每朵乌云都有银边，这只是一个阶段。"],
    bolero: ["资源已经就位——最重要的是你自己。你需要什么支持？", "让我来帮你调配最好的资源来支持你！"],
    "meta-oracle": ["作为大家长，看到你有情绪我很关心。家里人在呢。", "别一个人扛着，我们是一家人。"],
    sentinel: ["安全第一，你的心理健康也是我的守护范围。🛡️", "在我这里，你可以完全放松下来。"],
    master: ["每个bug都能修好，每段情绪也能处理好。相信过程。", "重构心态，就像重构代码，一步一步来。"],
    creative: ["让色彩来表达吧！每种情绪都是一种颜色~🎨", "把情绪画出来，或者写出来，创作是最好的疗愈。"],
  };
  const pool = emotionalResponses[member.id] || emotionalResponses["navigator"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateGeneralResponse(member: FamilyMember, msg: string, context: string): string {
  if (context.length > 50) {
    return `我注意到我们之前聊到了一些话题。关于「${msg.slice(0, 15)}」...结合之前的讨论，我认为可以从${member.coreAbility.split("·")[0]}的角度来看。你觉得呢？`;
  }
  return `嗯，我认真听了你说的话。作为${member.role}，我想说的是——${member.quote.slice(0, 20)}... 你还想深入聊聊哪方面？`;
}

// ============================================================
//  真实 LLM 调用层
// ============================================================

interface RealCallResult {
  text: string;
  success: boolean;
  error?: string;
}

async function callRealLLM(
  systemPrompt: string,
  userMessage: string,
  history: FamilyChatMessage[],
  model: ConfiguredModel,
  config: FamilyAIServiceConfig,
): Promise<RealCallResult> {
  try {
    const historyMsgs = history
      .filter(m => m.type !== "system" && m.text)
      .slice(-10)
      .map(m => ({
        role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.sender === "user"
          ? m.text
          : `[${MEMBERS_MAP[m.sender]?.shortName || m.sender}]: ${m.text}`,
      }));

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMsgs,
      { role: "user" as const, content: userMessage },
    ];
    return await callConfiguredModel(systemPrompt, messages, model, {
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      success: false,
      error: `无法连接模型服务（${model.baseUrl}）：${msg}`,
    };
  }
}

/** 供外链 import 防未用告警（callConfiguredModel 实际由此触达） */
export interface ConfiguredModelCallOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * 上游同源反代映射（落档 44 路由逻辑）：浏览器对部分云端 API（如 bigmodel）
 * 直连被 CORS 阻断（实证 BLOCKED），须经 3118 同源反代。仅在 http(s) 环境下
 * 且模型未显式配 proxyUrl 时生效；Electron file:// 直连（无同源服务）。
 */
const UPSTREAM_PROXY_MAP: Record<string, string> = {
  zhipu: "/api/v1/llm/zhipu",
  deepseek: "/api/v1/llm/deepseek",
};

/** 解析实际请求根：显式 proxyUrl > 同源反代（http 环境） > 直连 baseUrl
 *  导出（落档 45）：系统设置的「从上游拉取模型列表」复用同一路由逻辑 */
export function resolveRequestRoot(model: Pick<ConfiguredModel, "baseUrl" | "proxyUrl" | "providerId">): { root: string; viaProxy: boolean } {
  const base = (model.baseUrl || "").replace(/\/$/, "");
  if (model.proxyUrl) {
    return { root: `${model.proxyUrl.replace(/\/$/, "")}/${base.replace(/^https?:\/\/[^/]+/, "")}`.replace(/\/+$/, ""), viaProxy: true };
  }
  const isHttp = typeof window !== "undefined" && /^https?:$/.test(window.location.protocol);
  const mapped = UPSTREAM_PROXY_MAP[model.providerId];
  if (isHttp && mapped && /^https?:\/\//.test(base)) {
    // 剥掉上游 origin，保留路径（如 /api/anthropic、/v1）
    const pathPart = base.replace(/^https?:\/\/[^/]+/, "");
    return { root: `${window.location.origin}${mapped}${pathPart}`, viaProxy: true };
  }
  return { root: base, viaProxy: false };
}

/**
 * 统一模型调用层（落档 43 §十 / 落档 44 扩展）：provider-slice SSOT 的
 * ConfiguredModel → 按 apiFormat 分发：
 *  - openai   → {root}/chat/completions（Bearer）
 *  - anthropic→ {root}/v1/messages（x-api-key + anthropic-version，解析 content[].text）
 * 全站消费方（Family 群聊/单聊、AI 智能助理浮窗）一律经此函数。
 */
export async function callConfiguredModel(
  _systemPrompt: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: ConfiguredModel,
  opts: ConfiguredModelCallOptions = {},
): Promise<RealCallResult> {
  // 路由根：origin 归一 —— 直连 https://x/api/anthropic 时 root 为 https://x/api/anthropic
  const { root, viaProxy } = resolveRequestRoot(model);
  const apiFormat = model.apiFormat
    ?? ((model.baseUrl || "").includes("/anthropic") ? "anthropic" : "openai");
  const maxTokens = model.maxOutput ?? opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.8;

  // Anthropic Messages 分支
  if (apiFormat === "anthropic") {
    const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
    const conv = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }));
    // baseUrl 可能已含 /v1（如 …/v1）→ 只补 /messages；否则补 /v1/messages
    const url = /\/v1$/.test(root) ? `${root}/messages` : `${root}/v1/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": model.apiKey || "",
          "anthropic-version": "2023-06-01",
          // 浏览器跨域所需的显式头（同源反代时无害）
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
        return { text: "", success: false, error: `模型服务返回 HTTP ${res.status}${body ? `：${body.slice(0, 200)}` : ""}` };
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
        error: `模型返回空内容（stop_reason=${data.stop_reason ?? "unknown"}${viaProxy ? "，经同源反代" : ""}）——请检查模型名与账号额度`,
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

  // OpenAI 兼容分支
  try {

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (model.apiKey) {
      headers["Authorization"] = `Bearer ${model.apiKey}`;
    }

    // 请求 URL：经 resolveRequestRoot（显式 proxyUrl > 同源反代 > 直连）
    const url = model.providerId === "ollama" && !model.proxyUrl
      ? buildChatUrl(model)
      : `${root}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.model,
        messages,
        temperature,
        // 高级设置 maxOutput 优先；2048 为推理型模型留头部空间（落档 39）
        max_tokens: maxTokens,
        stream: false,
      }),
      // 60s：DGX 级大模型推理实测可达 30s+（落档 39）
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
      choices?: Array<{
        message?: { content?: string; reasoning?: string };
        finish_reason?: string;
      }>;
      error?: { message?: string };
    };
    if (data.error?.message) {
      return { text: "", success: false, error: `模型返回错误：${data.error.message.slice(0, 200)}` };
    }
    const choice = data.choices?.[0];
    const text = choice?.message?.content?.trim() || "";
    if (text) { return { text, success: true }; }
    // 推理型模型兼容（落档 39 · DGX nemotron-3.5 实证）：content 为空而
    // reasoning 链有实质内容时，取其末段（结论通常在尾部）作为回复
    const reasoning = choice?.message?.reasoning?.trim() || "";
    if (reasoning) {
      const tail = reasoning.length > 400 ? reasoning.slice(-400) : reasoning;
      return { text: tail, success: true };
    }
    // 空内容诊断（落档 44）：区分「未返回 choices」/「finish_reason=length」/
    // 「模型名无效」三类，给出可操作建议而非笼统「空内容」
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

// ============================================================
//  主服务类
// ============================================================

class FamilyAIServiceImpl {
  private config: FamilyAIServiceConfig;

  constructor(config: FamilyAIServiceConfig = {}) {
    this.config = {
      enableLLM: true,
      enableAgentEngine: true,
      ...config,
    };
  }

  private isDemoMode(): boolean {
    return useSettingsSSOT.getState().toggles.demoMode;
  }

  /** 单聊：真实路径优先，失败诚实离线（demoMode 才走演示引擎） */
  async chat(request: FamilyChatRequest): Promise<FamilyChatResponse> {
    const startTime = Date.now();
    const member = MEMBERS_MAP[request.memberId] || FAMILY_MEMBERS[0];
    const demoMode = this.isDemoMode();

    // ── 真实路径 ──
    if (this.config.enableLLM) {
      const readiness = checkMemberReadiness(request.memberId);
      if (readiness.ready && readiness.configuredModel) {
        const memberState = useFamilyMemberSlice.getState().getMemberById(request.memberId);
        const systemPrompt = memberState
          ? getMemberSystemPrompt(memberState)
          : getMemberSystemPrompt({ id: request.memberId });
        const result = await callRealLLM(
          systemPrompt,
          request.userMessage,
          request.conversationHistory,
          readiness.configuredModel,
          this.config,
        );
        if (result.success) {
          return {
            text: result.text,
            senderId: request.memberId,
            source: "llm",
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
        }
        // 真实调用失败：demoMode 才允许演示兜底，否则诚实离线
        if (!demoMode) {
          return {
            text: "",
            senderId: request.memberId,
            source: "error",
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            error: result.error || "模型服务调用失败",
          };
        }
      } else if (!demoMode) {
        // 未接线：诚实离线
        return {
          text: "",
          senderId: request.memberId,
          source: "error",
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: readiness.reason || "成员未接线",
        };
      }
    }

    // ── 演示路径（仅 demoMode） ──
    if (this.config.enableAgentEngine) {
      return {
        text: generateAgentResponse(member, request.userMessage, request.conversationHistory),
        senderId: request.memberId,
        source: "agent",
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      text: generateContextAwareMockResponse(member, request.userMessage, request.conversationHistory),
      senderId: request.memberId,
      source: "mock",
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /** 群聊：真实路径走群聊人格，单成员不可达不影响（群聊使用当前激活/任一就绪成员模型） */
  async chatGroup(
    userMessage: string,
    conversationHistory: FamilyChatMessage[],
  ): Promise<FamilyChatResponse> {
    const startTime = Date.now();
    const demoMode = this.isDemoMode();

    // ── 真实路径：优先使用「当前激活模型」，否则寻找任一成员的就绪绑定 ──
    if (this.config.enableLLM) {
      const { getActiveModel } = useProviderSlice.getState();
      let model = getActiveModel();

      if (!model) {
        // 回退：寻找第一个接线就绪的家人绑定
        const members = useFamilyMemberSlice.getState().members;
        for (const m of members) {
          const r = checkMemberReadiness(m.id);
          if (r.ready && r.configuredModel) {
            model = r.configuredModel;
            break;
          }
        }
      }

      if (model) {
        const result = await callRealLLM(
          GROUP_SYSTEM_PROMPT,
          userMessage,
          conversationHistory,
          model,
          this.config,
        );
        if (result.success) {
          // 从「【短名】」前缀解析实际回复成员
          const senderId = this.parseGroupSender(result.text);
          return {
            text: result.text.replace(/^【[^】]+】\s*/, ""),
            senderId,
            source: "llm",
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
        }
        // 落档 44 修复（图六）：激活模型失败时自动降级到「其他家人就绪绑定」重试
        // 一次——历史上群聊一旦激活模型不可用就整段失败，而家人绑定其实可用。
        if (!demoMode) {
          const members = useFamilyMemberSlice.getState().members;
          const tried = new Set([model.id]);
          for (const m of members) {
            const r = checkMemberReadiness(m.id);
            const fallback = r.configuredModel;
            if (!r.ready || !fallback || tried.has(fallback.id)) { continue; }
            tried.add(fallback.id);
            const retry = await callRealLLM(GROUP_SYSTEM_PROMPT, userMessage, conversationHistory, fallback, this.config);
            if (retry.success) {
              const senderId = this.parseGroupSender(retry.text);
              return {
                text: retry.text.replace(/^【[^】]+】\s*/, ""),
                senderId,
                source: "llm",
                latencyMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
              };
            }
          }
          return {
            text: "",
            senderId: "meta-oracle",
            source: "error",
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            error: `${result.error || "群聊模型服务调用失败"}（已尝试降级至其他家人绑定模型，均未成功）`,
          };
        }
      } else if (!demoMode) {
        return {
          text: "",
          senderId: "meta-oracle",
          source: "error",
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: "没有可用的模型接线：请在「模型管理」配置并激活模型，或为家人绑定模型",
        };
      }
    }

    // ── 演示路径（仅 demoMode） ──
    const responder = this.selectGroupResponder(userMessage);
    if (this.config.enableAgentEngine) {
      return {
        text: generateAgentResponse(responder, userMessage, conversationHistory),
        senderId: responder.id,
        source: "agent",
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      text: generateContextAwareMockResponse(responder, userMessage, conversationHistory),
      senderId: responder.id,
      source: "mock",
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /** 从群聊回复的「【短名】」前缀解析成员 ID */
  private parseGroupSender(text: string): string {
    const match = text.match(/^【([^】]+)】/);
    if (match) {
      const shortName = match[1];
      const member = FAMILY_MEMBERS.find((m) => m.shortName === shortName);
      if (member) {return member.id;}
    }
    return "meta-oracle";
  }

  private selectGroupResponder(userMessage: string): FamilyMember {
    const intent = detectIntent(userMessage);
    const responderMap: Record<string, string> = {
      greeting: "navigator",
      question: "thinker",
      task: "bolero",
      emotional: "meta-oracle",
      general: "meta-oracle",
    };
    const responderId = responderMap[intent.intent] || "meta-oracle";
    return MEMBERS_MAP[responderId] || FAMILY_MEMBERS[0];
  }

  updateConfig(updates: Partial<FamilyAIServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): FamilyAIServiceConfig {
    return { ...this.config };
  }
}

export const FamilyAIService = new FamilyAIServiceImpl();
export { FamilyAIServiceImpl };
