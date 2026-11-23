---
file: 70-D阶段-运维闭环第一批-agent动作白名单-Ollama拉起-20261123.md
title: 落档 70 · D 阶段运维闭环第一批 — agent 动作白名单（不经 OpsPanel）+ Ollama 拉起
description: 主控三裁决落地：①运维闭环不经 OpsPanel——agent 侧白名单动作框架（GET /actions 回读/POST /actions/exec 回执/GET history，token 鉴权+sha256 钉扎校验+超时强杀+并发锁+回执持久化 50 条 0600，actions.json 源控可覆盖），DGX 四脚本首批接入，操作中心 qa1/qa3/qa6/qa10 真实执行、未接动作如实标注（C13 执行假/随机收口）；②Ollama 授权拉起（serve 重启，直连+3118 反代 200）；③单用户三项豁免登记；E2E 实证 curl 回执 exit=0 与面板点击→toast 回执→日志落 receipt
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-23
updated: 2026-11-23
status: stable
tags: [report, ops-actions, agent, whitelist, ollama, truthfulness]
category: report
language: zh-CN
audience: developers,managers
complexity: advanced
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 未提交（与落档 65~69 工作区改动一并待主控验收）
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 282 文件 / 4744 用例全绿（demo-mode-off 2 例按新契约反转：未接动作不伪造、已接动作真实执行失败也落日志）
  build: ✓
  e2e: curl exec 回执 exit=0 · 648ms（探针全 200/ok）→ history 回读；sha256 篡改拒止；面板点击→toast 带回执 id→操作日志落 receipt
---

# 落档 70 · D 阶段运维闭环第一批 — agent 动作白名单（不经 OpsPanel）+ Ollama 拉起

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、主控三裁决与本批落点

| 裁决 | 落点 |
| ---- | ---- |
| 运维闭环**可用 OpsPanel 的数据，但不要必须通过 OpsPanel** | 动作通道自建在 **yyc3-agent**（本仓库自有组件）：白名单执行 + 回执 + 历史回读；OpsPanel 端口口径仅作数据参照（脚本内置），运行零依赖 |
| Ollama serve 挂起 → **授权拉起** | 已重启为独立进程（`ollama serve` detached），直连 `/api/tags` 200、3118 反代 200，agent ollama 探活恢复 |
| 智能引擎闭环 / 多用户页面级权限 / WS 反代会话鉴权 → **✅ 豁免**（当前项目只有 YYC3 使用） | 登记为本档豁免决议，不再列为挂账 |

## 二、运维动作框架（agent 侧白名单）

**端点**（token 鉴权与 WS 同源）：`GET /actions`（列表回读+最近回执摘要）、`GET /actions/history`（回执历史，最近在前）、`POST /actions/exec {actionId}`（执行并返回回执）。

**安全设计**：
- **sha256 钉扎校验**：脚本前 16 位哈希不符即拒执行（实测：篡改哈希 → `sha256 mismatch: expect … got …（脚本被改动，拒绝执行；如为有意变更请更新 actions.json）`）；
- 固定超时强杀（SIGKILL）、单动作并发锁 + 全局并发上限 2、输出尾部截断 8KB；
- 回执持久化 `~/.yyc3-cloud-matrix/action-history.json`（最近 50 条，0600）；
- **源控**：`~/.yyc3-cloud-matrix/actions.json` 存在即全量覆盖内置注册表——动作增删改在主控侧文件完成（后续可入系统管理面板）。

**首批白名单（DGX 四脚本，落档 54 口径对齐）**：健康探针（只读）/ 队列水位（只读）/ 清理缓存（destructive）/ vLLM 重启（destructive）。脚本在本机执行、内部自封装 ssh（别名 yyc3-n1/n2 实测 ok），不依赖 OpsPanel。

## 三、操作中心接线（C13「执行假/随机」收口）

- `useOperationCenter` 新增 `AGENT_ACTION_BY_QA` 映射与真实执行分支：**qa1 重启 vLLM / qa3 清理缓存 / qa6 批量重启 vLLM / qa10 DGX 健康探针** 走 agent 回执链路（destructive 由 QuickActionGrid 二次确认）；qa10 失败回退 `/healthz` 快检。
- **未接动作如实标注**：qa2 部署模型 / qa7 模型迁移 / qa8 暂停队列 / qa9 恢复队列 / qa12 自定义脚本 → 描述改为「未接：…」，非演示模式点击如实拒止（原 1.5~3.5s 随机延迟 + 85% 随机成功的假执行彻底移除其生产路径）。
- demo 契约测试 2 例反转：未接动作不伪造不落日志；**已接动作 demo 关闭也真实执行**（失败如实落日志——测试环境无令牌 →「未配置 agent 令牌」）。

## 四、E2E 实证

| 步骤 | 结果 |
| ---- | ---- |
| `POST /actions/exec dgx-node-health-probe`（curl） | 回执 `act-…` exit=0 · 648ms，stdout 全 200/ok；history 回读 1 条 |
| sha256 篡改守卫 | 400 拒止（expect/got 明示）；移除 actions.json 重启后内置 4 动作恢复 |
| 面板「操作中心」点 DGX 健康探针 | toast：`执行成功 · 回执 act-…（exit=0 · 673ms）：n2:8002 … n2 ssh:22 ok`；操作日志落回执 |
| Ollama | serve 拉起后 `/api/tags` 直连 200、3118 反代 200（family-coder-14b 在册） |

**主控浏览器「已断开+空态」说明**：截图会话是浏览器未加载新包（落档 65~70 多批次改动需刷新 `?v=` 时间戳强制更新）；断开时全空态**符合真实性契约**（无实时数据不编造）；顶部 3 条告警为持久化跟进工单，请到「一键跟进」确认/闭环。当前探针会话实测：已连接 · 7/7 节点 · 34.3s 真值。

## 五、契约符合（落档 66）

G0 全绿（tsc 0E / 282 文件 4744 用例 / build ✓ / lint 0 error / 零凭据字面量）。G2：动作链路四元组 = 前端动作目录 → agent 白名单 → 脚本执行 → 回执（log-slice/操作日志双落）。G3：agent `/actions*` 三端点入 API 基准表。G4：回执 id/exit/耗时三方（toast/日志/history）一致。

## 六、剩余（如实）

- qa2 部署模型 / qa7 模型迁移 / qa8-9 队列 pause-resume：需 DGX 侧提供部署/迁移/队列端点后按同框架接入（actions.json 增条目即可）。
- 整机重启（非 vLLM 服务重启）未接。
- Ollama 当前为手工拉起（非 launchd 常驻）——如需开机自启请主控示意（此前 SERVICES.md 曾有「生产停用」决议，未擅动）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-23 | 初始版本 — agent 动作白名单框架 + 四脚本接入 + 操作中心真实执行 + Ollama 拉起；TRC-20261123005 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
