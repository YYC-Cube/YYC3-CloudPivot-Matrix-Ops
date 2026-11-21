---
file: 63-数据库连接三套合并-db-conn-slice单一注册表-20261121.md
title: 落档 63 · 数据库连接三套合并 — db-conn-slice 单一注册表
description: /database 与 /db-connections 不再各自维护连接：db-conn-slice 成为唯一注册表，useLocalDatabase 从它水合并镜像 CRUD/状态；旧 IndexedDB dbConnections 一次性并入后清空；查询历史仍存 IDB；删除内置 localhost:5433 假连接种子；密码仅内存、不落盘
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-21
updated: 2026-11-21
status: stable
tags: [report, storage, database, merge]
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

# 落档 63 · 数据库连接三套合并 — db-conn-slice 单一注册表

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、合并前（三套互不联通）

| 位置 | 存储 | 问题 |
| ---- | ---- | ---- |
| `/database`（DatabaseManager） | `useLocalDatabase` 自持 state + IndexedDB `dbConnections` | 与连接配置页互不可见 |
| `/db-connections`（连接配置） | `db-conn-slice`（localStorage，密码剥离） | 与数据库管理页互不可见 |
| `/connection-monitor` | `connectionManager` 内存单例（从未被填充） | 永远「连接不存在」（落档 62 已改为读 slice） |

## 二、合并后（单一注册表）

- **`db-conn-slice` 是唯一连接注册表**：`/database`、`/db-connections`、`/connection-monitor` 读同一份清单。
- `useLocalDatabase`：
  - 挂载时从 slice 水合（状态统一置 `disconnected`）；
  - `addConnection / updateConnection / removeConnection` 同步写 slice；
  - 连接状态变化（connecting/connected/disconnected）镜像到 slice；
  - 旧 IndexedDB `dbConnections` **一次性并入** slice（解码历史密码）后清空该 store，避免丢连接；
  - `queryHistory` 仍由 IndexedDB 承担（历史数据不属于连接注册表）。
- 删除内置 `localhost:5433` 假连接种子：连接清单只来自用户/真实探测。
- 密码：slice 持久化继续剥离；`useLocalDatabase` 仅在内存中持有，刷新后需重新输入（当前无 `/api/db` 后端，不影响功能）。

## 三、兼容与测试

- `db-conn-slice.addConnection` 现返回创建的连接并支持传入 id；新增 `replaceConnections`（探测导入/迁移用）。
- `useLocalDatabase.test.ts` 逐例重置 slice（连接清单现在跨页面共享）。
- 全量 **278 文件 / 4717 用例全绿**；tsc 0E；build ✓。

## 四、仍未完成

1. 凭据加密（provider/SSOT live Key）——等待密钥策略。
2. `/api/db` 服务端代理（当前连接测试/SQL 均如实「未接」）。
3. `soundhelix` 演示音频本地化。
4. 同步队列 `yyc3_sync_queue` 两套 schema 拆命名空间。
5. agent token 从 URL query 改协议头。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-21 | 初始版本 — 数据库三套连接合并到 db-conn-slice；TRC-20261121008 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
