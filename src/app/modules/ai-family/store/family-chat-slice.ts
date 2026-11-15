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

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: "text" | "system" | "thinking";
  /** llm=真实模型 agent/mock=演示引擎 error=诚实离线提示 */
  source?: "llm" | "agent" | "mock" | "error";
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
  addMessage: (channelId: string, message: Omit<ChatMessage, "id">) => void;
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

      addMessage: (channelId, message) =>
        set((s) => {
          const existing = s.channels[channelId] || [];
          const updated = trimMessages([
            ...existing,
            { ...message, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
          ]);
          return { channels: { ...s.channels, [channelId]: updated } };
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
