/**
 * @file: family-chat-slice.ts
 * @description: YYC³ AI Family 对话历史 Slice — 按频道隔离 + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[chat]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 消息富内容分段（落档 48 气泡对齐：交互气泡-设计文档 §4.1 七层结构简化版） */
export interface ChatMessagePart {
  type: "text" | "code";
  text: string;
  /** code 段语言标注（```lang） */
  lang?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: "text" | "system" | "thinking";
  /** llm=真实模型 agent/mock=演示引擎 error=诚实离线提示 */
  source?: "llm" | "agent" | "mock" | "error";
  /** 生命周期（§4.5 状态机）：pending 发送中 → complete 完成；error 失败可重试 */
  lifecycle?: "pending" | "streaming" | "complete" | "error";
  /** 端到端耗时（真实 LLM 往返） */
  latencyMs?: number;
  /** 富内容分段（代码块等）；缺省时按纯文本渲染 */
  parts?: ChatMessagePart[];
}

// 仅保留系统欢迎语（UI 提示，非伪造对话）；历史假消息 m1/m2 由 migrate 清除
const SEED_GROUP_MESSAGES: ChatMessage[] = [
  { id: "sys-1", sender: "system", text: "欢迎来到 AI Family 家庭群聊，这里是我们的温馨空间。", time: "09:00", type: "system" },
];

// 历史假种子 ID（v0 写入的伪造成员消息），migrate 时精确清除
const LEGACY_FAKE_MESSAGE_IDS = new Set(["m1", "m2"]);

const MAX_MESSAGES_PER_CHANNEL = 200;

interface FamilyChatSlice {
  channels: Record<string, ChatMessage[]>;
  addMessage: (channelId: string, message: Omit<ChatMessage, "id">) => string;
  /** 更新已发消息（生命周期/富内容/延迟）——落档 48 气泡状态机 */
  updateMessage: (channelId: string, id: string, patch: Partial<Omit<ChatMessage, "id" | "sender">>) => void;
  clearChannel: (channelId: string) => void;
  getChannelMessages: (channelId: string) => ChatMessage[];
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.length > MAX_MESSAGES_PER_CHANNEL
    ? messages.slice(-MAX_MESSAGES_PER_CHANNEL)
    : messages;
}

export const useFamilyChatSlice = create<FamilyChatSlice>()(
  persist(
    (set, get) => ({
      channels: { "family-group": SEED_GROUP_MESSAGES },

      addMessage: (channelId, message) => {
        const newId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((s) => {
          const existing = s.channels[channelId] || [];
          const updated = trimMessages([
            ...existing,
            { ...message, id: newId },
          ]);
          return { channels: { ...s.channels, [channelId]: updated } };
        });
        return newId;
      },

      updateMessage: (channelId, id, patch) =>
        set((s) => {
          const existing = s.channels[channelId] || [];
          return {
            channels: {
              ...s.channels,
              [channelId]: existing.map((m) => (m.id === id ? { ...m, ...patch } : m)),
            },
          };
        }),

      clearChannel: (channelId) =>
        set((s) => {
          const updated = { ...s.channels };
          delete updated[channelId];
          return { channels: updated };
        }),

      getChannelMessages: (channelId) => get().channels[channelId] || [],
    }),
    {
      name: "yyc3-family-chat",
      version: 1,
      partialize: (state) => ({ channels: state.channels }),
      migrate: (persisted, version) => {
        const state = persisted as { channels?: Record<string, ChatMessage[]> } | undefined;
        if (version < 1 && state?.channels) {
          // v0 → v1：精确清除历史伪造成员消息，保留真实会话与系统提示
          const channels: Record<string, ChatMessage[]> = {};
          for (const [cid, msgs] of Object.entries(state.channels)) {
            channels[cid] = msgs.filter((m) => !LEGACY_FAKE_MESSAGE_IDS.has(m.id));
          }
          return { channels };
        }
        return state as { channels: Record<string, ChatMessage[]> };
      },
    },
  ),
);
