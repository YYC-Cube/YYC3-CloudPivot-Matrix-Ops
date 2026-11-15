/**
 * @file: family-memories-slice.ts
 * @description: YYC³ AI Family 成长记忆 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[memories]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MemoryType = "diary" | "milestone" | "mood" | "interaction" | "learning" | "creation";
export type MemoryPrivacy = "self" | "family" | "public";

export interface GrowthMemory {
  id: string;
  memberId: string;
  date: string;
  type: MemoryType;
  title: string;
  content: string;
  privacy: MemoryPrivacy;
  createdAt: number;
}

// 成长记忆默认空 — 真实记忆由真实互动沉淀写入
const SEED_MEMORIES: GrowthMemory[] = [];

// 历史假种子 ID（v0 写入的虚构记忆），migrate 时精确清除
const LEGACY_FAKE_MEMORY_IDS = new Set([
  "mem-001", "mem-002", "mem-003", "mem-004",
  "mem-005", "mem-006", "mem-007", "mem-008",
]);

interface FamilyMemoriesSlice {
  memories: GrowthMemory[];
  addMemory: (memory: Omit<GrowthMemory, "id" | "createdAt">) => void;
  updateMemory: (id: string, updates: Partial<Omit<GrowthMemory, "id" | "createdAt">>) => void;
  deleteMemory: (id: string) => void;
}

export const useFamilyMemoriesSlice = create<FamilyMemoriesSlice>()(
  persist(
    (set) => ({
      memories: SEED_MEMORIES,

      addMemory: (memory) =>
        set((s) => ({
          memories: [
            { ...memory, id: `mem-${Date.now()}`, createdAt: Date.now() },
            ...s.memories,
          ],
        })),

      updateMemory: (id, updates) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),

      deleteMemory: (id) =>
        set((s) => ({
          memories: s.memories.filter((m) => m.id !== id),
        })),
    }),
    {
      name: "yyc3-family-memories",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { memories?: GrowthMemory[] } | undefined;
        if (version < 1 && state?.memories) {
          // v0 → v1：精确清除历史虚构记忆，保留用户真实条目
          return { memories: state.memories.filter((m) => !LEGACY_FAKE_MEMORY_IDS.has(m.id)) };
        }
        return state as { memories: GrowthMemory[] };
      },
    },
  ),
);
