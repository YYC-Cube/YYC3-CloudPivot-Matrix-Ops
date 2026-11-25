---
file: 75-D阶段第三批-动作参数化UI-参数modal-CONFIRM两步-20261126.md
title: 落档 75 · D 阶段第三批 — 动作参数化执行 UI（参数 modal + CONFIRM 两步）
description: qa2/qa7/qa8/qa9 从计划模式升级为面板可执行：agent GET /actions 回传 args schema（与校验同源零漂移）→ 操作中心参数 modal（按 schema 渲染输入框/必填标注/CONFIRM 自动携带 destructive-confirm/客户端 pattern 预检）→ execOpsAction args 透传；demo-mode-off 契约更新（qa2 参数化两步流：executeAction 分流 modal → submitParamAction 实执行）；e2e 7/7 全绿
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-26
updated: 2026-11-26
status: stable
tags: [report, ops-actions, params-ui, confirm-two-step]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 本批待提交
gates:
  tsc: 0 错误
  lint: 改动文件 0 error（1 条历史 warning：FamilyModelSettings providers 未用）
  vitest: 284 文件 / 4766 用例全绿（demo-mode-off qa2 用例按参数化两步流重写）
  build: ✓
  e2e: 7/7 全绿（smoke 4 + agent-linked 3，含 WS 已连接/探针回执/告警全链路）
---

# 落档 75 · D 阶段第三批 — 动作参数化执行 UI（参数 modal + CONFIRM 两步）

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、范围（落档 74 遗留：面板参数输入 + CONFIRM 二次确认 UI）

落档 74 已把 DGX 部署/迁移/队列四动作接入 agent 白名单（plan→confirm 两步），但面板点击只会输出**执行计划**（缺 CONFIRM）——实际执行无法从面板完成。本批补齐最后一环：**参数输入 modal + CONFIRM 自动携带**，qa2/qa7/qa8/qa9 从面板即可完成「填参 → 确认 → 实执行 → 回执」。

## 二、实现

| 层 | 改动 |
| ---- | ---- |
| agent | `GET /actions` 的 `publicAction` 回传 `args` schema（与执行校验**同源零漂移**——改脚本参数声明面板自动跟随） |
| client | `execOpsAction(actionId, args?)` args 透传；`OpsActionDef` 增 `args` 字段 |
| hook | `PARAM_ACTIONS` 分流：需参数动作 executeAction 只**打开参数 modal**（不直执行）；`agentArgsSchemaCache` 由 `GET /actions` 回读填充；`submitParamAction(args)` 走 `executeArgsAction`（回执组装/toast/日志复用既有链路） |
| UI | OperationCenter 参数 modal：字段按 schema 渲染（key=env 名，desc 提示，必填 * 标注）；destructive 红色警示条说明 CONFIRM 自动携带；客户端 pattern/必填预检后再提交（服务端仍二次校验） |

**两步确认语义保持**：modal「执行」即正式提交（服务端校验+执行）；`CONFIRM=destructive-confirm` 由前端自动携带并明示。plan-only 预演可通过「取消」+ curl（不带 CONFIRM）完成，或后续加「仅看计划」按钮。

## 三、验证

- tsc 0E；**284 文件 / 4766 用例全绿**（demo-mode-off qa2 用例按两步流重写：executeAction 分流 modal → submitParamAction → 无令牌如实失败落日志）；build ✓；lint 0 error。
- e2e **7/7 全绿**（17.7s）：smoke 4 + agent-linked 3（WS 已连接 / 探针回执 exit=0 / 告警全链路创建→回读→删除）。

## 四、剩余（如实）

- e2e 参数化 UI 自动化用例（modal 填参 → plan 回执断言）按批补。
- 覆盖率棘轮维持 55/56/42/54；下一档随测试补齐。
- DGX 四动作真实执行验证仍待主控批复 + DGX 前置清单（缓办登记不变）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-26 | 初始版本 — 动作参数化执行 UI；TRC-20261126002 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
