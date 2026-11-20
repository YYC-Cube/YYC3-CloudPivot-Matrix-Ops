---
file: 61-存储收尾-IDB历史上限-Family绑定单源-WiFi密码不落盘-部署路径对齐-20261121.md
title: 落档 61 · 存储收尾 — IDB 历史上限 · Family 绑定单源 · WiFi 密码不落盘 · 部署路径对齐
description: 启动时统一修剪 IDB 历史表（9 张表设上限）；Family 模型绑定以 member slice 为运行时唯一 SSOT，界面自动对齐；WiFi 密码不再持久化并迁移删除历史明文；agent/ops-panel/dashboard plist、nginx、setup 脚本路径改为当前仓库
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-21
updated: 2026-11-21
status: stable
tags: [report, storage, idb, family, deploy]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 本档同步提交
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 278 文件 / 4717 用例全绿
  build: ✓
---

# 落档 61 · 存储收尾 — IDB 历史上限 · Family 绑定单源 · WiFi 密码不落盘 · 部署路径对齐

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、IDB 历史表上限（启动修剪）

`pruneIdbHistory()` 在 `Layout` 挂载时执行一次（异常静默，不阻塞界面），按保留上限删除最旧记录：

| Store | 上限 |
| ---- | ---- |
| `operationLogs` | 1000 |
| `operationTemplates` | 100 |
| `patrolHistory` / `loopHistory` / `queryHistory` | 500 |
| `diagnosisHistory` | 200 |
| `reports` | 100 |
| `fileVersions` | 50 |
| `errorLog` | 500 |

时间字段按 `timestamp → createdAt → updatedAt → completedAt → at` 解析；无时间字段时按读取顺序（旧→新）修剪。配置/规则/连接类 store 不修剪。

## 二、Family 模型绑定单源

运行时（`family-ai-service`）只读 `family-member` slice；界面此前读 `family-settings.modelAssignments`，两套默认值不一致（6/8 成员不同）。现在 `FamilyModelSettings` 挂载时以 **member slice 为准**，把 settings 视图自动对齐；保存仍双写，但「界面显示的模型」从此等于「实际发送的模型」。

## 三、WiFi 密码不落盘

- `network-slice` `partialize` 剥离 `password`；`version: 1` 迁移会删除历史持久化中的明文密码。
- 需要连接时由用户重新输入；凭据不再进入 localStorage/备份。

## 四、部署路径对齐（仓库内模板）

| 文件 | 改动 |
| ---- | ---- |
| `deploy/com.yyc3.agent.plist` | ProgramArguments / WorkingDirectory → 当前仓库 |
| `deploy/com.yyc3.ops-panel.plist` | 同上 |
| `deploy/com.yyc3.dashboard.plist` | cp 命令与 server.mjs 路径 → 当前仓库 |
| `deploy/nginx.conf` | root → 当前仓库 dist |
| `deploy/setup-nginx.sh` | `PROJECT_DIR` → 当前仓库 |

> 已安装的 `com.yyc3.agent` 作业此前已手工修好；本批把仓库模板一并对齐，避免下次 `agent:install` 回退到旧路径。

## 五、验证

`tsc` 0E；**278 文件 / 4717 用例全绿**；build ✓。

## 六、剩余（下一批）

1. **live 凭据加密迁移**（最高优先）：provider `apiKey`、SSOT `aiApiKey/wsToken/dbPassword` 仍为 localStorage 明文；需 `crypto-vault` 异步水合或 OS keychain，并迁移现有明文。
2. **数据库三套 store 合并**。
3. **其余隐性外联**：占位图、soundhelix 音频、STUN、WebLLM 权重、外网连通性探测。
4. **错误日志双写**与同步队列共键（`yyc3_sync_queue` 两套 schema）。
5. **token 放 URL query**（agent WS/HTTP 鉴权）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-21 | 初始版本 — IDB 上限 / Family 单源 / WiFi 密码 / 部署路径；TRC-20261121006 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
