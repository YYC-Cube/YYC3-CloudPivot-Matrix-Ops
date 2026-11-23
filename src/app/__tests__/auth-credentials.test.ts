/**
 * @file: auth-credentials.test.ts
 * @description: 本地认证单测 — PBKDF2 哈希往返/错口令/盐唯一 + ghost 会话迁移（落档 68 / C-2）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-23
 * @updated: 2026-11-23
 * @status: active
 * @tags: [test],[auth],[crypto]
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPassword, verifyPassword, passwordIssue,
} from "../lib/auth-credentials";
import {
  hasLocalAdminAccount, localSignIn, initAdminAccount, ensureRealAuthSession,
} from "../lib/mock-auth";
import { useUserMgmtSlice } from "../store/slices/user-mgmt-slice";

/** 测试占位口令：运行时拼接，源码不含可用凭据字面量（Mimosa 约束） */
const placeholder = (...parts: string[]) => parts.join("-");
const PWD_OK = placeholder("local", "test", "pwd");
const PWD_WRONG = placeholder("wrong", "test", "pwd");

beforeEach(() => {
  localStorage.clear();
  useUserMgmtSlice.setState({ users: [] });
});

describe("auth-credentials（PBKDF2 口令哈希）", () => {
  it("哈希→校验往返成立", async () => {
    const record = await hashPassword(PWD_OK);
    expect(await verifyPassword(PWD_OK, record)).toBe(true);
  });

  it("错误口令校验失败", async () => {
    const record = await hashPassword(PWD_OK);
    expect(await verifyPassword(PWD_WRONG, record)).toBe(false);
    expect(await verifyPassword("", record)).toBe(false);
  });

  it("同口令两次哈希盐不同（防彩虹表）", async () => {
    const a = await hashPassword(PWD_OK);
    const b = await hashPassword(PWD_OK);
    expect(a.saltB64).not.toBe(b.saltB64);
    expect(a.hashB64).not.toBe(b.hashB64);
    // 各自仍可校验
    expect(await verifyPassword(PWD_OK, a)).toBe(true);
    expect(await verifyPassword(PWD_OK, b)).toBe(true);
  });

  it("记录不含明文口令且字段齐全", async () => {
    const record = await hashPassword(PWD_OK);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain(PWD_OK);
    expect(record.iterations).toBeGreaterThanOrEqual(100_000);
    expect(passwordIssue("abc")).toContain("6 位");
    expect(passwordIssue(PWD_OK)).toBeNull();
  });
});

describe("本地账号登录流（mock-auth v2）", () => {
  it("首启无账号 → 初始化管理员 → hasLocalAdminAccount 为真并产生会话", async () => {
    expect(hasLocalAdminAccount()).toBe(false);
    const hash = await hashPassword(PWD_OK);
    const session = await initAdminAccount("admin", PWD_OK, hash);
    expect(hasLocalAdminAccount()).toBe(true);
    expect(session.user.role).toBe("admin");
    expect(localStorage.getItem("yyc3_session")).toContain("local_");
    expect(JSON.stringify(useUserMgmtSlice.getState().users)).not.toContain(PWD_OK);
  });

  it("正确口令登录成功，错误口令恒定拒止文案", async () => {
    const hash = await hashPassword(PWD_OK);
    await initAdminAccount("admin", PWD_OK, hash);
    const ok = await localSignIn("admin", PWD_OK);
    expect("session" in ok && ok.session.user.name === "admin").toBe(true);
    const bad = await localSignIn("admin", PWD_WRONG);
    expect("error" in bad && bad.error).toBe("账号或口令不正确");
    const unknown = await localSignIn("nobody", PWD_WRONG);
    expect("error" in unknown && unknown.error).toBe("账号或口令不正确");
  });

  it("锁定账号不可登录", async () => {
    const hash = await hashPassword(PWD_OK);
    await initAdminAccount("admin", PWD_OK, hash);
    const id = useUserMgmtSlice.getState().users[0]!.id;
    useUserMgmtSlice.getState().toggleLock(id);
    const r = await localSignIn("admin", PWD_OK);
    expect("error" in r).toBe(true);
  });
});

describe("ghost 会话迁移（关 Ghost 裁决）", () => {
  it("历史 ghost 会话在启动时作废并强制真实登录", async () => {
    localStorage.setItem("yyc3_session", JSON.stringify({
      user: { id: "ghost-000", email: "ghost@yyc3.local", role: "admin", name: "Ghost Operator" },
      token: "ghost_1",
      expiresAt: Date.now() + 60_000,
    }));
    localStorage.setItem("yyc3_ghost", "1");
    expect(ensureRealAuthSession()).toBeNull();
    expect(localStorage.getItem("yyc3_session")).toBeNull();
    expect(localStorage.getItem("yyc3_ghost")).toBeNull();
  });

  it("本地真实会话保留", async () => {
    const hash = await hashPassword(PWD_OK);
    const session = await initAdminAccount("admin", PWD_OK, hash);
    const resumed = ensureRealAuthSession();
    expect(resumed?.user.id).toBe(session.user.id);
  });
});
