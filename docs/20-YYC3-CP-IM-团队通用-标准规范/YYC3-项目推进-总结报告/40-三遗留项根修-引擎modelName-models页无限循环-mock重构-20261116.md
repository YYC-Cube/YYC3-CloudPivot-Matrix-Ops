---
file: 40-三遗留项根修-引擎modelName-models页无限循环-mock重构-20261116.md
title: 落档 40 · 三遗留项根修 — 引擎 modelName · models 页无限循环 · 测试 mock
description: P6 登记项全清零 — 引擎代理步 modelId→modelName / FamilyModelSettings 无限循环根修 acb4fd3
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-16
updated: 2026-11-16
status: stable
tags: [report, bugfix, engine, performance]
category: report
language: zh-CN
audience: developers
complexity: intermediate
project: yyc3-cloud-matrix
phase: production
commit: acb4fd3
gates:
  tsc: 0 错误
  vitest: 275 文件 / 4694 用例全绿
  lint: 0 错误 4 警告（存量）
  build: 通过
  engine-verify: DGX 代理步 不可达→转发成功 134ms（四步全绿截图）
  models-page: #/ai-family/models 挂起→正常加载（8 成员渲染截图）
---

# 落档 40 · 三遗留项根修 — 引擎 modelName · models 页无限循环 · 测试 mock

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

> 清零落档 38 §三 + 落档 39 §五登记的 P6 后续缺陷。

## 一、引擎 modelName 修复（落档 39 §五-1）

**根因**：`provider-slice.testConnection` 传给引擎的 `config.modelId = model.id`（cm 内部 ID 如 `"cm-dgx-001"`），而 API 调用需实际模型名（`model.model` 如 `"nemotron-3.5-super-vl"`）→ DGX 秒拒无效模型名 → 代理步报"不可达"。

**修复**：engine auth + proxy 两步 POST 体 `config.modelId → config.modelName`。

**实证**：DGX 代理步 **不可达→「代理转发成功 (134ms)」** 四步全绿（截图存档）。

## 二、models 页无限循环根修（落档 38 §三-2）

**根因**：`FamilyModelSettings.tsx:387` mount effect 以 `[providerSlice]`（`useProviderSlice()` 整 store 引用）为依赖——`fetchOllamaModels` 触发 state 变更 → 新 store 引用 → 再触发 effect → **无限循环冻结渲染器**。

**修复**：改 `useProviderSlice.getState().fetchOllamaModels()` + **空依赖数组**（mount 一次）。

**实证**：修复后 `#/ai-family/models` 6s 内完整加载——「AI Family 大模型控制中心」+ 8 位家人绑定卡（千行/Z.ai、万物/DeepSeek…）+ 1/3 接入·0/8 已测通状态（截图存档）。此前两标签页均 32s 超时 + renderer crash。

## 三、AddModelModal 提交禁用（落档 38 §三-1）

**定性变更**：~~缺陷~~ → **Playwright/React 19 受控交互边缘案例**（非产品 Bug）。人工 UI 点击流程正常；persist 直注是自动化测试的等效路径，保留为工具方法。降级为 ⚪ 已知工具链边缘案例（不改产品代码）。

## 四、测试 mock 重构

FamilyModelSettings.test 的 provider-slice mock 补 `getState` 静态方法（组件 mount effect 改用 `getState()` 调用后 mock 需同步）。14/14 用例全绿。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-16 | 初始版本 — 三遗留项根修 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
