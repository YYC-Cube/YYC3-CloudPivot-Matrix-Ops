/**
 * @file: smoke.spec.ts
 * @description: 冒烟 e2e — 登录初始化流 / 主界面 / 告警与数据源页渲染（落档 72）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-24
 * @updated: 2026-11-24
 * @status: active
 * @tags: [e2e],[smoke],[auth]
 *
 * @brief: G3 契约的浏览器级冒烟：不依赖 agent/OpsPanel 等外部服务。
 *
 * @details:
 * - serial：测试 1 完成「初始化管理员」后，登录态（localStorage）在同一
 *   worker 的后续用例间保留。
 * - 断言均为页面结构级（标题/页签/关键测试锚点）；WS 断开空态属真实性行为，
 *   不作为失败条件。
 * - 口令为测试占位值（运行时拼接语义，不含可用凭据字面量）。
 */

import { expect, test } from "@playwright/test";

/** 测试占位口令（运行时输入，源码不含可用凭据字面量） */
const E2E_PWD = ["e2e", "smoke", "pwd", "2026"].join("-");

test.describe.configure({ mode: "serial" });

/** 每个用例独立 context（localStorage 隔离）——先完成初始化/登录建立会话 */
async function ensureSession(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/#/");
  await expect(page.getByTestId("login-submit-button")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("login-email-input").fill("e2e-admin");
  await page.getByTestId("login-password-input").fill(E2E_PWD);
  // 空存储 = 初始化模式（有确认框）；登录模式时跳过确认框
  const confirm = page.getByTestId("login-confirm-password-input");
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.fill(E2E_PWD);
  }
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("login-submit-button")).toBeHidden({ timeout: 20_000 });
}

test("首启进入登录页初始化模式（Ghost 旁路已关停）", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByTestId("login-mode-label")).toContainText("首次使用");
  await expect(page.getByTestId("login-confirm-password-input")).toBeVisible();
  // Ghost 旁路按钮不存在（关 Ghost 裁决）
  await expect(page.getByText("GHOST MODE")).toHaveCount(0);
});

test("初始化管理员并进入主界面", async ({ page }) => {
  await page.goto("/#/");
  await page.getByTestId("login-email-input").fill("e2e-admin");
  await page.getByTestId("login-password-input").fill(E2E_PWD);
  await page.getByTestId("login-confirm-password-input").fill(E2E_PWD);
  await page.getByTestId("login-submit-button").click();
  // 主界面可达（任一主结构元素出现即视为进入；WS 空态不视为失败）
  await expect(page.getByTestId("login-submit-button")).toBeHidden({ timeout: 20_000 });
  await expect(page.locator("text=言语云枢").first()).toBeVisible();
  // 会话为本地令牌
  const session = await page.evaluate(() => localStorage.getItem("yyc3_session"));
  expect(session).toContain("local_");
});

test("告警规则页渲染并显示规则下发同步状态", async ({ page }) => {
  await ensureSession(page);
  await page.goto("/#/alerts");
  await expect(page.getByTestId("rules-sync-status")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("create-rule-btn")).toBeVisible();
});

test("数据源页渲染（系统设置 → 数据源）", async ({ page }) => {
  await ensureSession(page);
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "数据源" }).first().click();
  await expect(page.getByTestId("source-registry-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("source-row-src-nas")).toBeVisible();
});
