/**
 * @file: family-milestones-slice.ts
 * @description: YYC³ AI Family 里程碑 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[milestones]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Milestone {
  id: string;
  date: string;
  title: string;
  desc: string;
  color: string;
  iconName: string;
  createdAt: number;
}

// 里程碑默认空 — 真实里程碑在真实达成时写入
const SEED_MILESTONES: Milestone[] = [];

// 历史假种子 ID（v0 写入的虚构里程碑），migrate 时精确清除
const LEGACY_FAKE_MILESTONE_IDS = new Set(["ms-1", "ms-2", "ms-3", "ms-4", "ms-5", "ms-6"]);

interface FamilyMilestonesSlice {
  milestones: Milestone[];
  addMilestone: (milestone: Omit<Milestone, "id" | "createdAt">) => void;
  updateMilestone: (id: string, updates: Partial<Omit<Milestone, "id" | "createdAt">>) => void;
  deleteMilestone: (id: string) => void;
}

export const useFamilyMilestonesSlice = create<FamilyMilestonesSlice>()(
  persist(
    (set) => ({
      milestones: SEED_MILESTONES,

      addMilestone: (milestone) =>
        set((s) => ({
          milestones: [
            { ...milestone, id: `ms-${Date.now()}`, createdAt: Date.now() },
            ...s.milestones,
          ],
        })),

      updateMilestone: (id, updates) =>
        set((s) => ({
          milestones: s.milestones.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),

      deleteMilestone: (id) =>
        set((s) => ({
          milestones: s.milestones.filter((m) => m.id !== id),
        })),
    }),
    {
      name: "yyc3-family-milestones",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { milestones?: Milestone[] } | undefined;
        if (version < 1 && state?.milestones) {
          // v0 → v1：精确清除历史虚构里程碑，保留用户真实条目
          return { milestones: state.milestones.filter((m) => !LEGACY_FAKE_MILESTONE_IDS.has(m.id)) };
        }
        return state as { milestones: Milestone[] };
      },
    },
  ),
);
