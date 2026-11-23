/**
 * @file: agent-linked.spec.ts
 * @description: agent 联动冒烟 — WS 连接态 / 操作中心真实动作回执（落档 72 v1.0.1）
 * @author: YanYuCloudCube Team
 * @version: v1.1.0
 * @created: 2026-11-24
 * @updated: 2026-11-24
 * @status: active
 * @tags: [e2e],[agent],[websocket],[ops-actions]
 *
 * @brief: 需要本机 agent 在跑的联动用例——CI 自动跳过（E2E_AGENT=1 本地执行）。
 *
 * @details:
 * - 令牌注入：yyc3_e2e_hook 守卫钩子于登录后写 SSOT 内存态（此前 localStorage+reload
 *   方案在本机 CFT 构建因 CryptoKey 不跨 reload 而失效，见 @details），
 *   覆盖 WS 鉴权与动作回执链路。
 * - 用例 1：首页 WS 徽标「已连接」+ 节点矩阵渲染真实节点（数据不出本地的实时链路）。
 * - 用例 2：操作中心「DGX 健康探针」真实执行（只读动作）→ 回执 toast 含 exit=0。
 * - 断言口径：不依赖 OpsPanel（探针脚本自封装 ssh）。
 */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** 需本机 agent：无 E2E_AGENT=1 时整组跳过（CI 无外部服务依赖，不跑） */
test.skip(!process.env.E2E_AGENT, "agent 联动用例：E2E_AGENT=1 + 本机 agent 在跑时执行");

/** 从本机 agent-token 文件读取令牌（不落日志/不写死）。
 *  惰性读取：CI runner 无该文件——模块顶层 readFileSync 会在 skip 判定前
 *  ENOENT 崩掉整个收集阶段（远端 CI 首跑实测），故仅在实际执行的用例内取用。 */
function agentToken(): string {
  try {
    return readFileSync(
      join(homedir(), ".yyc3-cloud-matrix", "agent-token"),
      "utf8",
    ).trim();
  } catch {
    return "";
  }
}

const E2E_PWD = ["e2e", "smoke", "pwd", "2026"].join("-");

/** 登录会话前缀（启用 e2e 钩子标志），登录后内存态注入 WS 令牌。
 *  根因（落档 72 v1.0.1 实测）：Playwright 的 Chromium CFT 构建 CryptoKey
 *  经 IDB 跨 reload 不可用（同载可解、跨载 OperationError）——localStorage
 *  +reload 注入会在凭据解密时回空；改走 yyc3_e2e_hook 守卫钩子于登录后
 *  直接写 SSOT 内存态（WS 重连窗口 ≤10 次 ×5s 内生效）。 */
async function ensureAgentSession(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("yyc3_e2e_hook", "1");
  });
  await page.goto(`/?v=${Date.now()}#/`);
  await expect(page.getByTestId("login-submit-button")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("login-email-input").fill("e2e-admin");
  await page.getByTestId("login-password-input").fill(E2E_PWD);
  const confirm = page.getByTestId("login-confirm-password-input");
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.fill(E2E_PWD);
  }
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("login-submit-button")).toBeHidden({ timeout: 20_000 });
  const injected = await page.evaluate((tk) => {
    const hook = (window as unknown as { __yyc3E2E?: { setWsToken: (t: string) => void; getWsToken: () => string } }).__yyc3E2E;
    if (!hook) { return "hook-missing"; }
    hook.setWsToken(tk);
    return "injected:len" + hook.getWsToken().length;
  }, agentToken());
  expect(injected).toContain("injected:len");
}

test("WS 令牌注入后首页「已连接」且节点矩阵渲染真实节点", async ({ page }) => {
  await ensureAgentSession(page);
  await expect(page.getByText("已连接").first()).toBeVisible({ timeout: 20_000 });
  // 节点矩阵渲染真实节点（yyc3-22 本机 agent 采集；无证据 GPU 显「—」属真实口径）
  await expect(page.getByText("yyc3-22").first()).toBeVisible({ timeout: 20_000 });
});

test("操作中心 DGX 健康探针真实执行并产生回执", async ({ page }) => {
  await ensureAgentSession(page);
  await page.goto(`/?v=${Date.now()}#/operations`);
  await expect(page.getByText("DGX 健康探针").first()).toBeVisible({ timeout: 20_000 });
  const clicked = await page.evaluate(() => {
    const btns = Array.prototype.slice.call(document.querySelectorAll("button"));
    const card = btns.find((b) => (b.textContent || "").indexOf("DGX 健康探针") >= 0);
    if (!card) { return false; }
    card.click();
    return true;
  });
  expect(clicked).toBe(true);
  // 探针为真实执行（60s 超时预算 + 探针内部多次 ssh/HTTP），回执 toast 含 exit=0
  await expect(page.locator("[data-sonner-toast]")).toContainText("exit=0", { timeout: 70_000 });
});

test("告警规则创建 → 下发 → agent 回读全链路（落档 73）", async ({ page }) => {
  await ensureAgentSession(page);
  await page.goto(`/?v=${Date.now()}#/alerts`);
  await expect(page.getByTestId("create-rule-btn")).toBeVisible({ timeout: 20_000 });

  // 建规则：命名 + 选真实 WS 节点（异步到达，先等节点 chips 渲染）+ 默认阈值 → 提交
  await page.getByTestId("create-rule-btn").click();
  await expect(page.getByTestId("create-rule-modal")).toBeVisible();
  await page.getByTestId("rule-name-input").fill("e2e-closure-rule");
  const nodeChip = page.locator('[data-testid^="node-"]').first();
  await expect(nodeChip).toBeVisible({ timeout: 20_000 });
  await nodeChip.click();
  await page.getByTestId("submit-rule-btn").click();
  await expect(page.getByTestId("create-rule-modal")).toBeHidden({ timeout: 10_000 });

  // 防抖下发（800ms）+ PUT + GET 回读 → chip 应显示已同步且数量一致
  await expect(page.getByTestId("rules-sync-status")).toContainText("已同步 1 条", { timeout: 15_000 });

  // Node 侧回读 agent 权威数据（闭环的外部证据）
  await expect
    .poll(async () => {
      const r = await fetch(`http://localhost:3113/rules?token=${encodeURIComponent(agentToken())}`);
      const d = (await r.json()) as { rules?: Array<{ name?: string }> };
      return (d.rules ?? []).some((x) => x.name === "e2e-closure-rule");
    }, { timeout: 15_000, intervalMs: 1_000 })
    .toBe(true);

  // 清理：面板删除该规则（按文本定位卡片，agent 侧 id 可能被 sanitize 重写）
  const card = page.locator('[data-testid^="rule-card-"]').filter({ hasText: "e2e-closure-rule" }).first();
  await card.scrollIntoViewIfNeeded();
  await card.getByTestId("delete-rule-btn").click();
  await expect
    .poll(async () => {
      const r = await fetch(`http://localhost:3113/rules?token=${encodeURIComponent(agentToken())}`);
      const d = (await r.json()) as { rules?: Array<{ name?: string }> };
      return (d.rules ?? []).some((x) => x.name === "e2e-closure-rule");
    }, { timeout: 15_000, intervalMs: 1_000 })
    .toBe(false);
});
