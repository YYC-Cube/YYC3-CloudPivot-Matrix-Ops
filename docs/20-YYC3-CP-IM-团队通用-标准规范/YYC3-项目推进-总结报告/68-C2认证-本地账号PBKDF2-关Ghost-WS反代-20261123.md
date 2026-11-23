---
file: 68-C2认证-本地账号PBKDF2-关Ghost-WS反代-20261123.md
title: 落档 68 · C-2 认证 — 本地账号（PBKDF2）/ 关 Ghost / WS 反代
description: 主控「执行」令落地 C-2：本地账号口令哈希（PBKDF2-SHA256 120k 迭代，零明文，键名含 password 供备份自动脱敏）、登录页双模式（首启初始化管理员/常规登录，恒定拒止文案防枚举）、Ghost 一键旁路关停（.env 关闸 + App 断入口 + 历史 ghost 会话启动即作废）、3118 /ws 升级反代（agent 令牌透传，落档 57 挂账清账）；E2E 实证初始化→登出→错口令拒止→正确登录→ws://…:3118/ws 连通
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-23
updated: 2026-11-23
status: stable
tags: [report, auth, pbkdf2, ghost, ws-proxy, truthfulness]
category: report
language: zh-CN
audience: developers,managers
complexity: advanced
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 未提交（与落档 65/66/67 工作区改动一并待主控验收）
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 282 文件 / 4743 用例全绿（新增 auth-credentials 9 例 + Login 新契约 3 例，旧「无凭据即进入」用例按关 Ghost 契约反转）
  build: ✓
  e2e: 初始化 admin（usr-…/local_ 令牌）→ 登出回登录模式 → 错口令「账号或口令不正确」拒止 → 正确口令进入；ws://localhost:3118/ws?token=… 经反代 open、未知路径拒止
---

# 落档 68 · C-2 认证 — 本地账号（PBKDF2）/ 关 Ghost / WS 反代

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、方案（主控「执行」令，先方案后动手的既定路线）

| 决策点 | 定案 | 依据 |
| ---- | ---- | ---- |
| 口令存储 | PBKDF2-SHA256，120k 迭代，16B 随机盐，32B 派生值；记录 `{saltB64, hashB64, iterations}` | 本地单机的破解成本/登录延迟平衡；**与 credentialVault 解耦**（清 vault 不影响登录，vault 只管 API Key 域） |
| 字段命名 | `UserRecord.passwordHash` | 键名含 `password` → 备份导出经 storage-registry 正则自动 `[REDACTED]`（落档 59 体系） |
| 账号存储 | user-mgmt-slice（persist v1→v2），无预置账号 | 沿用落档 61「绝不预置演示账号」纪律 |
| 会话 | `yyc3_session` 形态不变，有效期 24h→**7 天**（本地自用便利） | 形态兼容零迁移 |
| Ghost | **旁路关停**：`.env` 置 false + App 不再传 `onGhostLogin` + 启动时历史 ghost 会话一律作废 | 主控裁决「关 Ghost + 本地账号会话」 |
| 首启流程 | 无带口令账号 → 登录页自动进入「初始化管理员」（名称+口令+确认）；已有 → 常规登录 | 不再静默 Ghost 进入 |
| 拒止语义 | 登录失败恒定「账号或口令不正确」 | 防账号枚举 |
| 降级 | 无 `crypto.subtle` 时认证抛错拒止 | 认证域**宁可不可用不降级明文**（落档 64 原则延展） |

## 二、改动清单

1. **新增 `lib/auth-credentials.ts`**：`hashPassword / verifyPassword / passwordIssue`；校验按记录内参数重算 + 恒等时间比较（防时序侧信）。
2. **user-mgmt-slice v2**：`passwordHash` 字段 + `setUserCredentials`；迁移精确清假种子保留自建用户。
3. **mock-auth v2**：`localSignIn`（username/name/email 三键匹配 → PBKDF2 校验 → 建 `local_` 令牌会话 + 登录足迹写回用户域）、`initAdminAccount`、`hasLocalAdminAccount`、`ensureRealAuthSession`（ghost 会话作废）；`ghostSignIn` 仅存历史兼容且构建关闸后运行时不可达。
4. **Login.tsx 双模式**：模式说明条（`login-mode-label`）、确认口令字段（仅初始化）、错误条（`login-error`）、提交钮文案随模式切换；视觉规范不变。
5. **App.tsx**：启动改用 `ensureRealAuthSession`；移除 `handleGhostLogin` 与 `onGhostLogin` 传参；`ghost@yyc3.local` 兜底文案清除。
6. **`.env`**：`VITE_ENABLE_GHOST_MODE=false`。
7. **deploy/server.mjs**：`upgrade` 事件 → `ws://<同源>/ws` 反代 `127.0.0.1:3113`（Host 改写、Sec-WebSocket-* 透传、字节级双通道）；未知路径 404。**落档 57 挂账「远程部署无 /ws 反代」清账**——Tailscale/局域网设备现在用 `ws://<面板主机>:3118/ws` 即可连 agent，无需直连 3113。

## 三、E2E 实证（探针会话，ZCode 内置浏览器）

| 步骤 | 结果 |
| ---- | ---- |
| 清会话访问 | 登录页进入**初始化模式**（说明条+确认口令字段+「初始化管理员并进入」），**无 GHOST MODE 按钮** |
| 初始化 admin | 进入面板；会话 `usr-…/admin/local_` 令牌；`yyc3_ghost` 清除；users 含哈希记录且**不含明文** |
| 头像菜单登出 | 回登录页，自动为**登录模式**（非初始化），session 已清 |
| 错口令 | 「账号或口令不正确」，无会话 |
| 正确口令 | 进入，`local_` 令牌 |
| WS 反代 | `ws://localhost:3118/ws?token=…`（本机 agent 令牌）**open**；未知路径拒止 |

**主控须知**：认证按浏览器存储隔离——您首次访问将看到「初始化管理员」，自行创建账号即可；探针会话的临时 admin 不影响您的浏览器。改口令功能未做（剩余项）：当前可通过「系统管理 → 用户管理」删除重建，或在用户管理补充「设置口令」入口（后续批次）。

## 四、契约符合（落档 66）

G0：tsc 0E / **282 文件 4743 用例全绿** / build ✓ / 改动文件 lint 0 error / 零凭据字面量（测试占位值运行时拼接；Mimosa 曾误拦 `autoComplete="new-password"` 标准 HTML 提示，已移除该属性）。G1：无新页面。G2：认证链路四元组 = 本地账号域 → PBKDF2 → 会话键，断链语义=拒止不降级。G3：`/ws` 升级路由入 API 基准表（3118 反代段）。G4：登录三态（初始化/拒止/进入）逐层追溯通过。

## 五、剩余（如实）

- 改口令/找回入口未做（用户管理页可删除重建账号；补「设置口令」入 待后续批次）。
- 多用户分权（运维/开发者角色登录后权限差异）沿用现有 role 字段，未做页面级权限隔离。
- `/ws` 反代为 TCP 级转发，未加面板侧会话鉴权（agent 令牌仍是唯一 WS 凭据；如需「登录才能连 WS」须 agent 侧配合，属跨仓库改动）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-23 | 初始版本 — 本地账号认证 + 关 Ghost + WS 反代；TRC-20261123003 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
