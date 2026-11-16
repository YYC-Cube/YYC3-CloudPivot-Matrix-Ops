/**
 * @file: family-ai-realpath.test.ts
 * @description: AI Family 真实化链路测试 — 成员接线就绪判定 + 假种子 migrate 清除
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [test],[ai-family],[real-data],[migrate]
 */

import { beforeEach, describe, expect, it } from "vitest";
import { checkMemberReadiness } from "../lib/family-ai-service";
import { useFamilyMemberSlice } from "../modules/ai-family/store/family-member-slice";
import { useFamilyChatSlice } from "../modules/ai-family/store/family-chat-slice";
import { useFamilyPostsSlice } from "../modules/ai-family/store/family-posts-slice";
import { useFamilySettingsSlice } from "../modules/ai-family/store/family-settings-slice";
import { useProviderSlice } from "../store/slices/provider-slice";
import type { ConfiguredModel, ModelProviderDef } from "../types";

// ═══ 工具 ═══

const makeProvider = (overrides: Partial<ModelProviderDef> = {}): ModelProviderDef => ({
  id: "zhipu",
  label: "智谱 AI",
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  authType: "bearer",
  models: ["glm-4.5"],
  requiresApiKey: true,
  isLocal: false,
  ...overrides,
});

const makeConfiguredModel = (overrides: Partial<ConfiguredModel> = {}): ConfiguredModel => ({
  id: "cm-test-1",
  providerId: "zhipu",
  providerLabel: "智谱 AI",
  model: "glm-4.5",
  apiKey: "",
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  createdAt: Date.now(),
  lastUsed: null,
  status: "unchecked",
  ...overrides,
});

/** 预置 v0 持久化数据并触发 rehydrate（走 migrate） */
async function seedAndRehydrate(
  key: string,
  state: unknown,
  rehydrate: () => Promise<void> | void,
) {
  localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
  await rehydrate();
}

// ═══ 成员接线就绪判定（真实路径核心） ═══

describe("checkMemberReadiness · 成员接线就绪判定", () => {
  beforeEach(() => {
    useProviderSlice.setState({
      providers: [makeProvider()],
      configuredModels: [],
    });
    // 恢复一个确定绑定
    useFamilyMemberSlice.getState().updateModelAssignment("navigator", {
      providerId: "zhipu",
      modelId: "glm-4.5",
    });
  });

  it("未绑定模型 → 不就绪并提示去模型设置", () => {
    useFamilyMemberSlice.getState().updateModelAssignment("navigator", {
      providerId: "",
      modelId: "",
    });
    const r = checkMemberReadiness("navigator");
    expect(r.ready).toBe(false);
    expect(r.reason).toContain("未绑定模型");
  });

  it("绑定模型但未在模型管理中配置 → 不就绪并提示先添加模型", () => {
    const r = checkMemberReadiness("navigator");
    expect(r.ready).toBe(false);
    expect(r.reason).toContain("未在「模型管理」中配置");
  });

  it("服务商需要密钥但未配置 → 不就绪并提示缺少 API Key", () => {
    useProviderSlice.setState({ configuredModels: [makeConfiguredModel()] });
    const r = checkMemberReadiness("navigator");
    expect(r.ready).toBe(false);
    expect(r.reason).toContain("缺少 API Key");
  });

  it("绑定 + 已配置 + 有密钥 → 就绪并返回配置模型", () => {
    useProviderSlice.setState({
      configuredModels: [makeConfiguredModel({ apiKey: process.env.TEST_API_KEY ?? "sk-placeholder" })],
    });
    const r = checkMemberReadiness("navigator");
    expect(r.ready).toBe(true);
    expect(r.configuredModel?.id).toBe("cm-test-1");
  });

  it("免密钥服务商（如 Ollama）无 Key 也就绪", () => {
    useProviderSlice.setState({
      providers: [makeProvider({ id: "ollama", label: "Ollama", requiresApiKey: false, isLocal: true })],
      configuredModels: [makeConfiguredModel({ providerId: "ollama", providerLabel: "Ollama", model: "qwen3:30b" })],
    });
    useFamilyMemberSlice.getState().updateModelAssignment("navigator", {
      providerId: "ollama",
      modelId: "qwen3:30b",
    });
    const r = checkMemberReadiness("navigator");
    expect(r.ready).toBe(true);
  });
});

// ═══ 假种子 migrate 清除（persist version 升级范式） ═══

describe("假种子 migrate 清除", () => {
  it("family-chat：v0 的伪造成员消息 m1/m2 被清除，真实消息保留", async () => {
    await seedAndRehydrate(
      "yyc3-family-chat",
      {
        channels: {
          "family-group": [
            { id: "m1", sender: "meta-oracle", text: "伪造的群聊消息", time: "09:01", type: "text" },
            { id: "m2", sender: "navigator", text: "伪造的群聊消息", time: "09:05", type: "text" },
            { id: "user-real-1", sender: "user", text: "真实用户消息", time: "10:00", type: "text" },
          ],
        },
      },
      () => useFamilyChatSlice.persist.rehydrate(),
    );
    const msgs = useFamilyChatSlice.getState().channels["family-group"] || [];
    expect(msgs.find((m) => m.id === "m1")).toBeUndefined();
    expect(msgs.find((m) => m.id === "m2")).toBeUndefined();
    expect(msgs.find((m) => m.id === "user-real-1")?.text).toBe("真实用户消息");
  });

  it("family-posts：v0 的假动态 p1~p6 被清除，用户自建动态保留", async () => {
    await seedAndRehydrate(
      "yyc3-family-posts",
      {
        posts: [
          { id: "p1", memberId: "navigator", content: "假动态", likes: 0, comments: [], createdAt: "2026-03-01T00:00:00Z" },
          { id: "p6", memberId: "creative", content: "假动态", likes: 0, comments: [], createdAt: "2026-03-01T00:00:00Z" },
          { id: "user-post-1", memberId: "thinker", content: "用户真实动态", likes: 2, comments: [], createdAt: "2026-11-16T00:00:00Z" },
        ],
      },
      () => useFamilyPostsSlice.persist.rehydrate(),
    );
    const posts = useFamilyPostsSlice.getState().posts;
    expect(posts.find((p) => p.id === "p1")).toBeUndefined();
    expect(posts.find((p) => p.id === "p6")).toBeUndefined();
    expect(posts.find((p) => p.id === "user-post-1")?.content).toBe("用户真实动态");
  });

  it("family-settings：v0 的假站内信 msg-001~msg-010 被清除，真实消息保留", async () => {
    await seedAndRehydrate(
      "yyc3-family-settings",
      {
        commMessages: [
          { id: "msg-001", from: "meta-oracle", to: "all", content: "假站内信", timestamp: "2026-03-10T08:00:00", type: "announcement", read: false },
          { id: "msg-010", from: "sentinel", to: "all", content: "假站内信", timestamp: "2026-03-10T22:00:00", type: "heartbeat", read: false },
          { id: "msg-real-1", from: "navigator", to: "thinker", content: "真实站内信", timestamp: "2026-11-16T08:00:00", type: "text", read: false },
        ],
      },
      () => useFamilySettingsSlice.persist.rehydrate(),
    );
    const msgs = useFamilySettingsSlice.getState().commMessages;
    expect(msgs.find((m) => m.id === "msg-001")).toBeUndefined();
    expect(msgs.find((m) => m.id === "msg-010")).toBeUndefined();
    expect(msgs.find((m) => m.id === "msg-real-1")?.content).toBe("真实站内信");
  });

  it("family-chat：初始默认仅含系统欢迎语，无任何伪造成员对话", () => {
    localStorage.removeItem("yyc3-family-chat");
    const msgs = useFamilyChatSlice.getState().channels["family-group"] || [];
    for (const m of msgs) {
      expect(m.type === "system" || m.sender === "user").toBe(true);
    }
  });
});
