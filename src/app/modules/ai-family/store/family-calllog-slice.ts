/**
 * @file: family-calllog-slice.ts
 * @description: YYC³ AI Family 通话记录 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[calllog]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CallLog {
  id: string;
  memberId: string;
  time: string;
  duration: string;
  type: "incoming" | "outgoing" | "missed";
  createdAt: number;
}

// 通话记录默认空 — 真实通话由真实呼叫行为写入
const SEED_CALL_LOGS: CallLog[] = [];

// 历史假种子 ID（v0 写入的虚构通话记录），migrate 时精确清除
const LEGACY_FAKE_CALL_IDS = new Set(["c1", "c2", "c3", "c4", "c5", "c6"]);

interface FamilyCallLogSlice {
  callLogs: CallLog[];
  addCallLog: (log: Omit<CallLog, "id" | "createdAt">) => void;
  deleteCallLog: (id: string) => void;
  clearCallLogs: () => void;
}

export const useFamilyCallLogSlice = create<FamilyCallLogSlice>()(
  persist(
    (set) => ({
      callLogs: SEED_CALL_LOGS,

      addCallLog: (log) =>
        set((s) => ({
          callLogs: [
            { ...log, id: `call-${Date.now()}`, createdAt: Date.now() },
            ...s.callLogs,
          ],
        })),

      deleteCallLog: (id) =>
        set((s) => ({
          callLogs: s.callLogs.filter((c) => c.id !== id),
        })),

      clearCallLogs: () => set({ callLogs: [] }),
    }),
    {
      name: "yyc3-family-calllog",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { callLogs?: CallLog[] } | undefined;
        if (version < 1 && state?.callLogs) {
          // v0 → v1：精确清除历史虚构通话记录，保留用户真实条目
          return { callLogs: state.callLogs.filter((c) => !LEGACY_FAKE_CALL_IDS.has(c.id)) };
        }
        return state as { callLogs: CallLog[] };
      },
    },
  ),
);
