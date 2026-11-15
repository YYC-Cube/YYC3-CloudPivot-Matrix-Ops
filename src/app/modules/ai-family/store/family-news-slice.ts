/**
 * @file: family-news-slice.ts
 * @description: YYC³ AI Family 新闻资讯 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[news]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
  color: string;
  url?: string;
  createdAt: number;
}

// 新闻资讯默认空 — 真实资讯由用户添加或真实订阅源写入
const SEED_NEWS: NewsItem[] = [];

// 历史假种子 ID（v0 写入的虚构新闻），migrate 时精确清除
const LEGACY_FAKE_NEWS_IDS = new Set(["n1", "n2", "n3", "n4", "n5"]);

interface FamilyNewsSlice {
  news: NewsItem[];
  addNews: (item: Omit<NewsItem, "id" | "createdAt">) => void;
  updateNews: (id: string, updates: Partial<Omit<NewsItem, "id" | "createdAt">>) => void;
  deleteNews: (id: string) => void;
}

export const useFamilyNewsSlice = create<FamilyNewsSlice>()(
  persist(
    (set) => ({
      news: SEED_NEWS,

      addNews: (item) =>
        set((s) => ({
          news: [
            { ...item, id: `n-${Date.now()}`, createdAt: Date.now() },
            ...s.news,
          ],
        })),

      updateNews: (id, updates) =>
        set((s) => ({
          news: s.news.map((n) =>
            n.id === id ? { ...n, ...updates } : n,
          ),
        })),

      deleteNews: (id) =>
        set((s) => ({
          news: s.news.filter((n) => n.id !== id),
        })),
    }),
    {
      name: "yyc3-family-news",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { news?: NewsItem[] } | undefined;
        if (version < 1 && state?.news) {
          // v0 → v1：精确清除历史虚构新闻，保留用户真实条目
          return { news: state.news.filter((n) => !LEGACY_FAKE_NEWS_IDS.has(n.id)) };
        }
        return state as { news: NewsItem[] };
      },
    },
  ),
);
