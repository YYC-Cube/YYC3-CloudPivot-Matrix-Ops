/**
 * @file: family-skills-slice.ts
 * @description: YYC³ AI Family 技能树/课程/成就 Slice — 全 CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[skills]
 */

import type React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SkillItem {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  status: "completed" | "active" | "locked";
}

export interface SkillCategory {
  id: string;
  category: string;
  icon: React.ElementType;
  color: string;
  skills: SkillItem[];
}

export interface Course {
  id: string;
  title: string;
  mentor: string;
  progress: number;
  total: number;
  done: number;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
  icon: React.ElementType;
  color: string;
}

// 课程为用户真实创建/真实进度的数据，绝不预置伪造课程
const SEED_COURSES: Course[] = [];

// 历史假课程种子 ID（v0 写入），migrate 时精确清除
const LEGACY_FAKE_COURSE_IDS = new Set(["course-1", "course-2", "course-3", "course-4", "course-5"]);

export interface AchievementData {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
  iconName: string;
  color: string;
}

// 成就定义（模板）：获得状态 earned 必须由真实行为触发，初始一律 false
const SEED_ACHIEVEMENTS: AchievementData[] = [
  { id: "ach-1", name: "初入家门", desc: "完成首次登录并了解8位家人", earned: false, iconName: "Award", color: "#FFD700" },
  { id: "ach-2", name: "知识探索者", desc: "阅读10篇家人分享的知识文档", earned: false, iconName: "BookOpen", color: "#00d4ff" },
  { id: "ach-3", name: "对话达人", desc: "与每位家人至少对话一次", earned: false, iconName: "Brain", color: "#FF69B4" },
  { id: "ach-4", name: "技能大师", desc: "任意技能达到满级", earned: false, iconName: "Award", color: "#00FF88" },
  { id: "ach-5", name: "安全卫士", desc: "完成安全合规课程全部章节", earned: false, iconName: "Shield", color: "#BF00FF" },
  { id: "ach-6", name: "架构先锋", desc: "完成系统架构课程并通过考核", earned: false, iconName: "Database", color: "#FF6B6B" },
];

// 历史预置成就 ID：migrate 时重置其 earned 为 false（用户手动 toggle 的同名模板也一并归零，保证真实性）
const LEGACY_PRESET_ACHIEVEMENT_IDS = new Set(["ach-1", "ach-2", "ach-3", "ach-4", "ach-5", "ach-6"]);

interface FamilySkillsSlice {
  courses: Course[];
  achievements: AchievementData[];
  addCourse: (course: Omit<Course, "id">) => void;
  updateCourse: (id: string, updates: Partial<Omit<Course, "id">>) => void;
  deleteCourse: (id: string) => void;
  addAchievement: (achievement: Omit<AchievementData, "id">) => void;
  updateAchievement: (id: string, updates: Partial<Omit<AchievementData, "id">>) => void;
  deleteAchievement: (id: string) => void;
  toggleAchievement: (id: string) => void;
}

export const useFamilySkillsSlice = create<FamilySkillsSlice>()(
  persist(
    (set) => ({
      courses: SEED_COURSES,
      achievements: SEED_ACHIEVEMENTS,

      addCourse: (course) =>
        set((s) => ({
          courses: [...s.courses, { ...course, id: `course-${Date.now()}` }],
        })),

      updateCourse: (id, updates) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      deleteCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
        })),

      addAchievement: (achievement) =>
        set((s) => ({
          achievements: [...s.achievements, { ...achievement, id: `ach-${Date.now()}` }],
        })),

      updateAchievement: (id, updates) =>
        set((s) => ({
          achievements: s.achievements.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      deleteAchievement: (id) =>
        set((s) => ({
          achievements: s.achievements.filter((a) => a.id !== id),
        })),

      toggleAchievement: (id) =>
        set((s) => ({
          achievements: s.achievements.map((a) =>
            a.id === id ? { ...a, earned: !a.earned } : a,
          ),
        })),
    }),
    {
      name: "yyc3-family-skills",
      version: 1,
      migrate: (persisted, version) => {
        // v0 → v1：清除假课程种子；预置成就 earned 归零（获得状态必须真实）
        const state = persisted as
          | { courses?: Array<{ id: string }>; achievements?: AchievementData[] }
          | undefined;
        if (version < 1 && state) {
          if (Array.isArray(state.courses)) {
            state.courses = state.courses.filter((c) => !LEGACY_FAKE_COURSE_IDS.has(c.id));
          }
          if (Array.isArray(state.achievements)) {
            state.achievements = state.achievements.map((a) =>
              LEGACY_PRESET_ACHIEVEMENT_IDS.has(a.id) ? { ...a, earned: false } : a,
            );
          }
        }
        return state;
      },
    },
  ),
);
