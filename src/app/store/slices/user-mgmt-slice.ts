/**
 * @file: user-mgmt-slice.ts
 * @description: user-mgmt-slice.ts description
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-15
 * @updated: 2026-04-15
 * @status: active
 * @tags: [type]
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId } from '../../lib/id';
import type { UserRecord } from '../../types';

// 历史假种子 ID（v0 写入的 5 个演示用户），migrate 时精确清除
const LEGACY_FAKE_USER_IDS = new Set(["usr-1", "usr-2", "usr-3", "usr-4", "usr-5"]);

export interface UserMgmtSlice {
  users: UserRecord[];
  addUser: (user: Omit<UserRecord, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserRecord>) => void;
  removeUser: (id: string) => void;
  toggleLock: (id: string) => void;
  /** 本地认证（落档 68 / C-2）：写入/更新账号口令哈希（PBKDF2 记录，零明文） */
  setUserCredentials: (id: string, hash: NonNullable<UserRecord['passwordHash']>) => void;
}

export const useUserMgmtSlice = create<UserMgmtSlice>()(
  persist(
    (set, _get) => ({
      // 无后端设计：用户列表由管理员真实维护，绝不预置演示账号
      users: [],
      addUser: (user) => set((s) => ({ users: [...s.users, { ...user, id: newId('usr') }] })),
      updateUser: (id, updates) => set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, ...updates } : u) })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      toggleLock: (id) => set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, locked: !u.locked } : u) })),
      setUserCredentials: (id, hash) => set((s) => ({
        users: s.users.map((u) => u.id === id ? { ...u, passwordHash: hash } : u),
      })),
    }),
    {
      name: 'yyc3-user-mgmt-slice',
      version: 2,
      partialize: (state) => ({ users: state.users }),
      migrate: (persisted) => {
        const state = persisted as { users?: UserRecord[] } | undefined;
        if (state?.users) {
          // 精确清除历史假种子，保留管理员自建用户；v2 起携带 passwordHash（PBKDF2 记录）
          const cleaned = state.users.filter((u) => !LEGACY_FAKE_USER_IDS.has(u.id))
            .map((u) => ({ ...u, passwordHash: u.passwordHash }));
          return { users: cleaned };
        }
        return { users: [] };
      },
    }
  )
);
