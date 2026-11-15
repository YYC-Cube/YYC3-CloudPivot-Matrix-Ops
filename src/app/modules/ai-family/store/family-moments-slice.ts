/**
 * @file: family-moments-slice.ts
 * @description: YYC³ AI Family 家庭动态 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[moments]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FamilyMoment {
  id: string;
  member: string;
  text: string;
  time: string;
  color: string;
  createdAt: number;
}

// 家庭动态默认空 — 真实动态由真实事件写入
const SEED_MOMENTS: FamilyMoment[] = [];

// 历史假种子 ID（v0 写入的虚构动态），migrate 时精确清除
const LEGACY_FAKE_MOMENT_IDS = new Set(["fm-1", "fm-2", "fm-3", "fm-4", "fm-5"]);

interface FamilyMomentsSlice {
  moments: FamilyMoment[];
  addMoment: (moment: Omit<FamilyMoment, "id" | "createdAt">) => void;
  updateMoment: (id: string, updates: Partial<Omit<FamilyMoment, "id" | "createdAt">>) => void;
  deleteMoment: (id: string) => void;
}

export const useFamilyMomentsSlice = create<FamilyMomentsSlice>()(
  persist(
    (set) => ({
      moments: SEED_MOMENTS,

      addMoment: (moment) =>
        set((s) => ({
          moments: [
            { ...moment, id: `fm-${Date.now()}`, createdAt: Date.now() },
            ...s.moments,
          ],
        })),

      updateMoment: (id, updates) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),

      deleteMoment: (id) =>
        set((s) => ({
          moments: s.moments.filter((m) => m.id !== id),
        })),
    }),
    {
      name: "yyc3-family-moments",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { moments?: FamilyMoment[] } | undefined;
        if (version < 1 && state?.moments) {
          // v0 → v1：精确清除历史虚构动态，保留用户真实条目
          return { moments: state.moments.filter((m) => !LEGACY_FAKE_MOMENT_IDS.has(m.id)) };
        }
        return state as { moments: FamilyMoment[] };
      },
    },
  ),
);
