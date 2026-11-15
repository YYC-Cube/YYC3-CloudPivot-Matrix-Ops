/**
 * @file: family-posts-slice.ts
 * @description: YYC³ AI Family 分享帖子 Slice — CRUD + 持久化
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-25
 * @updated: 2026-04-25
 * @status: active
 * @tags: [store],[slice],[ai-family],[posts]
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PostCategory = "knowledge" | "insight" | "creative" | "growth";

export interface SharePost {
  id: string;
  author: string;
  category: PostCategory;
  title: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
  bookmarks: number;
  tags: string[];
  liked: boolean;
  bookmarked: boolean;
  createdAt: number;
}

// 动态广场不再预置伪造帖子：用户真实发布的内容才进入列表
const SEED_POSTS: SharePost[] = [];

// 历史假种子 ID（v0 写入的 6 条伪造帖子），migrate 时精确清除
const LEGACY_FAKE_POST_IDS = new Set(["p1", "p2", "p3", "p4", "p5", "p6"]);

interface FamilyPostsSlice {
  posts: SharePost[];
  addPost: (post: Omit<SharePost, "id" | "createdAt" | "likes" | "comments" | "bookmarks" | "liked" | "bookmarked">) => void;
  updatePost: (id: string, updates: Partial<Omit<SharePost, "id" | "createdAt">>) => void;
  deletePost: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

export const useFamilyPostsSlice = create<FamilyPostsSlice>()(
  persist(
    (set) => ({
      posts: SEED_POSTS,

      addPost: (post) =>
        set((s) => ({
          posts: [
            {
              ...post,
              id: `post-${Date.now()}`,
              createdAt: Date.now(),
              likes: 0, comments: 0, bookmarks: 0, liked: false, bookmarked: false,
            },
            ...s.posts,
          ],
        })),

      updatePost: (id, updates) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      deletePost: (id) =>
        set((s) => ({
          posts: s.posts.filter((p) => p.id !== id),
        })),

      toggleLike: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
              : p,
          ),
        })),

      toggleBookmark: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, bookmarked: !p.bookmarked, bookmarks: p.bookmarked ? p.bookmarks - 1 : p.bookmarks + 1 }
              : p,
          ),
        })),
    }),
    {
      name: "yyc3-family-posts",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { posts?: SharePost[] } | undefined;
        if (version < 1 && state?.posts) {
          // v0 → v1：精确清除 6 条历史伪造帖子，保留用户真实发布
          return { posts: state.posts.filter((p) => !LEGACY_FAKE_POST_IDS.has(p.id)) };
        }
        return state as { posts: SharePost[] };
      },
    },
  ),
);
