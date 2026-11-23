/**
 * @file: mock-auth.ts
 * @description: 本地认证 — 真实账号登录与会话存取（纯 localStorage，零后端）
 * @author: YanYuCloudCube Team
 * @version: v2.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-23
 * @status: active
 * @tags: [lib],[auth],[local]
 *
 * @brief: C-2 认证（落档 68）：登录 = 本地账号 + 口令（PBKDF2 校验，零明文落盘）。
 *         Ghost 一键旁路已关停（主控 2026-11-23 裁决）；历史 ghost 会话在启动时
 *         被清除并强制走一次真实登录。会话形态不变（yyc3_session），有效期 7 天。
 * @notes: supabase 双客户端已按落档 18「历史遗留不得接线」红线删除；
 *         ghostSignIn 仅保留给历史调用兼容且受 VITE_ENABLE_GHOST_MODE 构建
 *         开关门禁（现 .env 已置 false，运行时不可达）。
 */

import type { AppSession, AppUser } from "../types";
import { useUserMgmtSlice } from "../store/slices/user-mgmt-slice";
import { verifyPassword } from "./auth-credentials";

const SESSION_KEY = "yyc3_session";
const GHOST_KEY = "yyc3_ghost";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 读取 Vite 构建环境（file:// 桌面端同样可用） */
function ghostBuildEnabled(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const enabled = env?.VITE_ENABLE_GHOST_MODE === "true";
    if (env?.PROD && !enabled) { return false; }
    return true;
  } catch {
    return true; // env 不可读（极端环境）按非 PROD 处理
  }
}

/** 当前是否处于幽灵模式（仅历史会话兼容判定；新登录不再产生该态） */
export function isGhostMode(): boolean {
  if (!ghostBuildEnabled()) { return false; }
  return localStorage.getItem(GHOST_KEY) === "1";
}

/**
 * 幽灵登录（已关停）：主控 2026-11-23 裁决关闭无鉴权 admin 旁路。
 * 仅当构建开关显式开启且非 PROD 时可用，用于开发态临时演示。
 */
export function ghostSignIn(): AppSession | null {
  if (!ghostBuildEnabled() || (import.meta as unknown as { env?: Record<string, unknown> }).env?.PROD) {
    return null;
  }
  const session: AppSession = {
    user: { id: "ghost-000", email: "ghost@yyc3.local", role: "admin", name: "Ghost Operator" },
    token: `ghost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(GHOST_KEY, "1");
  return session;
}

/** 是否已存在可用本地账号（带口令哈希且未锁定）——决定登录页走初始化还是登录 */
export function hasLocalAdminAccount(): boolean {
  return useUserMgmtSlice
    .getState()
    .users.some((u) => Boolean(u.passwordHash) && !u.locked);
}

/**
 * 启动迁移：历史 ghost 会话一律作废（关 Ghost 裁决），强制走一次真实登录。
 * 返回清理后的有效会话（无则 null）。
 */
export function ensureRealAuthSession(): AppSession | null {
  const session = getLocalSession();
  if (session && session.user?.id === "ghost-000") {
    signOutLocal();
    return null;
  }
  return session;
}

/**
 * 本地账号登录：按用户名（username 或 name 或 email）匹配账号 → PBKDF2 校验
 * → 创建会话。失败返回 null 并给出原因（不区分「无此用户/口令错」防枚举）。
 */
export async function localSignIn(
  username: string,
  password: string,
): Promise<{ session: AppSession } | { error: string }> {
  const name = username.trim();
  const passwordIssue = !name || !password ? "请输入账号与口令" : null;
  if (passwordIssue) { return { error: passwordIssue }; }

  const user = useUserMgmtSlice.getState().users.find(
    (u) => !u.locked
      && (u.username === name || u.name === name || u.email === name)
      && Boolean(u.passwordHash),
  );
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    // 恒定提示语：不泄露账号是否存在
    return { error: "账号或口令不正确" };
  }

  const appUser: AppUser = {
    id: user.id,
    email: user.email || `${user.username}@yyc3.local`,
    role: (user.role as AppUser["role"]) ?? "admin",
    name: user.name,
  };
  const session: AppSession = {
    user: appUser,
    token: `local_${Date.now()}_${crypto.getRandomValues(new Uint32Array(2)).join("")}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(GHOST_KEY);
  // 同步用户管理域的登录足迹（lastLogin/sessions/status）
  useUserMgmtSlice.getState().updateUser(user.id, {
    status: "online",
    lastLogin: new Date().toLocaleString("zh-CN", { hour12: false }),
    sessions: (user.sessions ?? 0) + 1,
  });
  return { session };
}

/** 初始化管理员（首启无账号时）：创建带口令哈希的 admin 账号并直接登录 */
export async function initAdminAccount(
  name: string,
  password: string,
  passwordHashRecord: { saltB64: string; hashB64: string; iterations: number },
): Promise<AppSession> {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  useUserMgmtSlice.getState().addUser({
    name: name.trim() || "admin",
    username: (name.trim() || "admin").toLowerCase(),
    email: `${(name.trim() || "admin").toLowerCase()}@yyc3.local`,
    role: "admin",
    status: "online",
    lastLogin: now,
    sessions: 1,
    apiCalls: 0,
    locked: false,
  });
  const created = useUserMgmtSlice.getState().users[useUserMgmtSlice.getState().users.length - 1];
  if (!created) { throw new Error("管理员账号创建失败"); }
  useUserMgmtSlice.getState().setUserCredentials(created.id, passwordHashRecord);

  const session: AppSession = {
    user: { id: created.id, email: created.email, role: "admin", name: created.name },
    token: `local_${Date.now()}_${crypto.getRandomValues(new Uint32Array(2)).join("")}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(GHOST_KEY);
  return session;
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
