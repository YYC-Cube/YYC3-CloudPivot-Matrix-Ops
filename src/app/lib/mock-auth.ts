/**
 * @file: mock-auth.ts
 * @description: 本地 Mock 认证 — Ghost 语义与会话存取（纯 localStorage，零后端）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [lib],[auth],[local]
 *
 * @brief: P2 supabase 解耦（落档 31-P2 / 审计 N3）：自 supabaseClient.ts 提取的
 *         ghost 登录与会话逻辑，语义与原 MockSupabaseClient 完全一致——
 *         登录入口 = 一键进入（GHOST 语义），会话/登出纯本地键控。
 * @notes: supabase 双客户端已按落档 18「历史遗留不得接线」红线删除；
 *         PROD 下 ghost 受 VITE_ENABLE_GHOST_MODE 构建开关门禁（默认禁用）。
 */

import type { AppSession, AppUser } from "../types";

const SESSION_KEY = "yyc3_session";
const GHOST_KEY = "yyc3_ghost";

/** 幽灵用户 · Ghost Mode — 无需凭证，全权限（仅开发/自用构建） */
const GHOST_USER: AppUser = {
  id: "ghost-000",
  email: "ghost@yyc3.local",
  role: "admin",
  name: "Ghost Operator",
};

/** 读取 Vite 构建环境（file:// 桌面端同样可用） */
function ghostBuildEnabled(): boolean {
  try {
    // @ts-expect-error - Vite env
    const env = import.meta.env;
    const enabled = env?.VITE_ENABLE_GHOST_MODE === "true";
    if (env?.PROD && !enabled) { return false; }
    return true;
  } catch {
    return true; // env 不可读（极端环境）按非 PROD 处理
  }
}

/** 幽灵登录 · 跳过认证直接创建 admin 级会话（PROD 需构建开关放行） */
export function ghostSignIn(): AppSession | null {
  if (!ghostBuildEnabled()) {
    console.error("[Auth] Ghost mode is disabled. Set VITE_ENABLE_GHOST_MODE=true to enable.");
    return null;
  }
  const session: AppSession = {
    user: GHOST_USER,
    token: `ghost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(GHOST_KEY, "1");
  return session;
}

/** 当前是否处于幽灵模式（会话键存在且构建开关放行） */
export function isGhostMode(): boolean {
  if (!ghostBuildEnabled()) { return false; }
  return localStorage.getItem(GHOST_KEY) === "1";
}

/** 读取本地会话（过期自动清除；无会话返回 null） */
export function getLocalSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { return null; }
    const session: AppSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** 登出：清会话与幽灵键 */
export function signOutLocal(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(GHOST_KEY);
}
