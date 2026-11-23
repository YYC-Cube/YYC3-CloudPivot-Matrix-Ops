---
file: 72-E阶段治理第一批-Playwright冒烟入CI-覆盖率棘轮上调-20261124.md
title: 落档 72 · E 阶段治理第一批 — Playwright 冒烟入 CI + 覆盖率棘轮上调
description: 主控授权 E 阶段：Playwright 脚手架（chromium + webServer=deploy/server.mjs PORT=3999）+ 冒烟 4 例（首启初始化模式/Ghost 关停断言、初始化管理员进主界面、告警同步 chip、数据源页渲染；每用例独立 context 会话前缀）；ci.yml 新增 e2e job（复用 build 产物 + chromium 安装 + 报告归档）；覆盖率棘轮 45/44/31/44 → 55/56/41/54（实测 54.28/41.91/56.11/55.21 过线）；Mimosa 深扫完成= inconclusive（复查范围 0 发现，非运行时验证）
author: YYC³ Team <admin@0379.email>
version: v1.0.1
created: 2026-11-24
updated: 2026-11-24
status: stable
tags: [report, e2e, playwright, ci, coverage-ratchet, mimosa]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 本批待提交（主控已授权计划执行）
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 282 文件 / 4744 用例全绿；coverage 门禁新棘轮 55/56/41/54 实测通过（54.28/41.91/56.11/55.21）
  build: ✓
  e2e: playwright 4/4 通过（4.7s，本地 chromium-1255 直驱 E2E_EXECUTABLE_PATH；CI 走配套 chromium 安装）
---

# 落档 72 · E 阶段治理第一批 — Playwright 冒烟入 CI + 覆盖率棘轮上调

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、范围（主控授权计划：① Mimosa 完整审计 ② E 阶段治理）

Mimosa 深扫已完成（见 §四）；E 阶段治理第一批 = e2e 入 CI + 覆盖率棘轮。

## 二、Playwright 冒烟入 CI

| 件 | 内容 |
| ---- | ---- |
| `playwright.config.ts` | chromium 项目；webServer = `node deploy/server.mjs`（PORT=3999 避开常驻 3118；CI 复用 build 产物 dist）；serial 单 worker；`E2E_EXECUTABLE_PATH` 可直驱本地已缓存 Chromium（免下载，实测 chromium-1255 直驱通过），CI 不设置则安装配套版本 |
| `e2e/smoke.spec.ts` | 冒烟 4 例：①首启进入登录页**初始化模式** + `GHOST MODE` 按钮不存在（关 Ghost 断言）②初始化管理员 → 主界面 + `local_` 会话 ③告警规则页渲染 + 规则下发同步 chip 可见 ④数据源页渲染（NAS 行存在） |
| 用例隔离 | Playwright 每用例独立 context（localStorage 隔离）——`ensureSession()` 前缀完成初始化/登录（开发中实测：跨用例登录态丢失致用例 3 失败，已修） |
| `ci.yml` 新增 e2e job | `needs: [build]` → 下载 pages-dist 产物 → `playwright install --with-deps chromium` → `pnpm test:e2e` → 归档 playwright-report；不依赖 agent/OpsPanel 外部服务（断开空态属真实性行为） |

## 三、覆盖率棘轮上调

- 实测（七连批 65~71 附带测试补齐后）：**54.28% stmts / 41.91% branch / 56.11% funcs / 55.21% lines**（coverage include 范围 lib/hooks/components）。
- 棘轮上调：`45/44/31/44 → 55/56/41/54`（取整下限设防防回退），coverage 门禁实测通过（EXIT=0）。
- 目标 80/70/80/80 不变，后续随测试补齐逐级上调。

## 四、Mimosa 深扫结果（如实，不夸大）

- 扫描：`scan-2026-11-23T15-53-38.605Z-58a20098ea40`（deep，seal `aa5d8ddb…`，static_only 边界）
- **Run status: `inconclusive`**——复查范围内 **0 发现**（0 business-logic candidate），依赖 134 包扫描完成（1 条离线公告匹配=已知 extract-zip dev 工具链项，ci.yml 已有口径）；**覆盖缺口：调用图部分不完整（动态派发/超出分析规模），且非运行时验证**。
- 结论口径：**复查范围内零发现 ≠ 项目安全**；报告为封印工件的投影，动态行为（agent 动作执行、WS 反代）不在其覆盖内。

## 五、契约符合（落档 66）

G0 全绿（tsc 0E / 282 文件 4744 用例 / coverage 新棘轮通过 / build ✓ / lint 0 error）。G3：e2e 冒烟即 G3 的浏览器级执行（登录/告警/数据源三页真实可达）。其余两页断言纳入后续批次扩充。

## 六、剩余（如实）

- e2e 覆盖面扩展（WS 连接态、告警规则创建→回读全链路、模型管理录 Key→传播）需本地服务联动，按批次补。
- 覆盖率下一棘轮档位（如 60/50/45/58）待测试补齐后上调。
- Mimosa inconclusive 的调用图盲区：动态行为以 E2E + curl 回执作为互补核验（已具备）。

## 七、v1.0.1 增补（2026-11-24）：agent 联动用例 + CryptoKey 跨 reload 实证

**CI 首跑**（push `7557fa4`，run 45234156685）：四 job 全绿——Quality Gates ✓ / Test & Coverage ✓（新棘轮生效）/ Build ✓ / **E2E Smoke (Playwright) ✓**（GitHub Actions 真实浏览器通过）。

**agent 联动用例**（`e2e/agent-linked.spec.ts` v1.1.0，`E2E_AGENT=1` 门控、CI 自动跳过）：
1. WS 令牌注入 → 首页「已连接」+ 节点矩阵渲染真实节点；
2. 操作中心「DGX 健康探针」真实执行 → 回执 toast 含 exit=0。

**重要实测发现（落档 64 降级路径的真实实例）**：Playwright 的 Chromium CFT 构建 **CryptoKey 经 IDB 跨 reload 不可用**——同载写读加密成功，跨载读钥解密 OperationError。后果：该类构建内凭据信封每载解密回空（WS/动作报「未配置令牌」），localStorage+reload 注入方案失效。**处置**：新增 `yyc3_e2e_hook` 守卫钩子（App 启动按本地标志 `yyc3_e2e_hook=1` 暴露，生产日常不设标志即不暴露）→ Playwright 登录后 `__yyc3E2E.setWsToken()` 直写 SSOT 内存态（WS 重连窗口 ≤10×5s 内生效）。**常规浏览器不受影响**（主控凭据多日跨会话实证有效）。2/2 本地全绿（WS 已连接 6.7s；探针回执 1.7s）。

## 变更历史（v1.0.1 追加）

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-24 | 初始版本 — Playwright 冒烟入 CI + 覆盖率棘轮上调 + Mimosa 深扫登记；TRC-20261123007 | YYC³ Team |
| v1.0.1 | 2026-11-24 | 增补 — 远端 CI 首跑四 job 全绿；agent 联动用例 2 例（守卫钩子内存态注入令牌）；CryptoKey 跨 reload 在 CFT 构建不可用的实证与处置 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
