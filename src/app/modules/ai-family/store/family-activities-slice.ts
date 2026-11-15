/**
 * @file: family-activities-slice.ts
 * @description: YYC³ AI Family 活动记录 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[activities]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FamilyActivity {
  id: string;
  title: string;
  type: "game" | "talent" | "learning" | "challenge" | "celebration";
  date: string;
  participants: string[];
  scores?: Record<string, number>;
  winner?: string;
  description: string;
  medals?: string[];
  createdAt: number;
}

// 活动记录默认空 — 真实活动由用户/系统在真实发生时写入
const SEED_ACTIVITIES: FamilyActivity[] = [];

// 历史假种子 ID（v0 写入的虚构活动），migrate 时精确清除
const LEGACY_FAKE_ACTIVITY_IDS = new Set(["act-001", "act-002"]);

interface FamilyActivitiesSlice {
  activities: FamilyActivity[];
  addActivity: (activity: Omit<FamilyActivity, "id" | "createdAt">) => void;
  updateActivity: (id: string, updates: Partial<Omit<FamilyActivity, "id" | "createdAt">>) => void;
  deleteActivity: (id: string) => void;
}

export const useFamilyActivitiesSlice = create<FamilyActivitiesSlice>()(
  persist(
    (set) => ({
      activities: SEED_ACTIVITIES,

      addActivity: (activity) =>
        set((s) => ({
          activities: [
            { ...activity, id: `act-${Date.now()}`, createdAt: Date.now() },
            ...s.activities,
          ],
        })),

      updateActivity: (id, updates) =>
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      deleteActivity: (id) =>
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== id),
        })),
    }),
    {
      name: "yyc3-family-activities",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { activities?: FamilyActivity[] } | undefined;
        if (version < 1 && state?.activities) {
          // v0 → v1：精确清除历史虚构活动，保留用户真实条目
          return { activities: state.activities.filter((a) => !LEGACY_FAKE_ACTIVITY_IDS.has(a.id)) };
        }
        return state as { activities: FamilyActivity[] };
      },
    },
  ),
);
