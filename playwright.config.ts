/**
 * @file: playwright.config.ts
 * @description: E2E 冒烟配置 — 本地部署服务器 + 真实浏览器（落档 72 / E 阶段治理第一批）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-24
 * @updated: 2026-11-24
 * @status: active
 * @tags: [config],[e2e],[playwright]
 *
 * @brief: 冒烟级 e2e：登录初始化 → 主界面 → 告警/数据源页渲染。
 *
 * @details:
 * - webServer = deploy/server.mjs（生产 dist + 同源反代），PORT=3999 避开
 *   本机常驻 3118；CI 中由 build 产物提供 dist。
 * - 用例不依赖 agent/OpsPanel 等外部服务（断言页面结构与本地认证流，
 *   WS 断开时的空态属真实性行为，不作为失败条件）。
 * - serial 模式：同一 context 内登录态跨用例复用（localStorage 持久）。
 * - 浏览器解析：CI 安装配套 chromium；本地设置 E2E_EXECUTABLE_PATH 可直驱
 *   已缓存的 Chromium 成品（免下载，如 chromium-1255），不设置则默认解析。
 */

import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3999;
const executablePath = process.env.E2E_EXECUTABLE_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `node deploy/server.mjs`,
    url: `http://127.0.0.1:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      PORT: String(E2E_PORT),
      HOST: "127.0.0.1",
    },
  },
});
