---
file: 40-三遗留项根修-引擎modelName-models页无限循环-mock重构-守护DGX真实回复-20261116.md
title: 落档 40 · 三遗留项根修 — 引擎 modelName · models 页无限循环 · 守护 DGX 真实回复
description: P6 登记项全清零 + DGX nemotron 8/8 家人绑定 + 守护真实安全报告（592KB 截图）+ mock 重构
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-11-16
updated: 2026-11-16
status: stable
tags: [report, bugfix, dgx, chat]
category: report
language: zh-CN
audience: developers,managers
complexity: advanced
project: yyc3-cloud-matrix
phase: production
commit: acb4fd3 / d3c7254
gates:
  tsc: 0 错误
  vitest: 275 文件 / 4694 用例全绿（+ FamilyModelSettings mock getState 14 用例）
  lint: 0 错误 4 警告（存量）
  build: 通过
  dgx-chat: 守护经 DGX nemotron 真实回复（含人格 + @家人引用），592KB 截图存档
  security-scan: Mimosa 本批缓冲区不足未出完整结论（不宣称通过）
---

# 落档 40 · 三遗留项根修 — 引擎 modelName · models 页无限循环 · 守护 DGX 真实回复

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

> 清零落档 38 §三 + 落档 39 §五登记的 P6 后续缺陷；追加守护 DGX nemotron 真实回复实证。

## 一、三遗留项根修（`acb4fd3`）

### 1. 引擎 auth+proxy POST 体 modelId→modelName

**根因**：`provider-slice.testConnection` 传给引擎的 `config.modelId = model.id`（cm 内部 ID 如 `"cm-dgx-001"`），API 调用需实际模型名（`model.model` 如 `"nemotron-3.5-super-vl"`）→ DGX 秒拒无效模型名 → 代理步报"不可达"。

**修复**：engine auth + proxy 两步 POST 体 `config.modelId → config.modelName`。

**实证**：DGX 代理步 **不可达→「代理转发成功 (134ms)」** 四步全绿（截图存档）。

### 2. FamilyModelSettings mount effect 无限循环（models 页挂起根因）

**根因**：`FamilyModelSettings.tsx:387` mount effect 以 `[providerSlice]`（`useProviderSlice()` 整 store 引用）为依赖——`fetchOllamaModels` 触发 state 变更 → 新 store 引用 → 再触发 effect → **无限循环冻结渲染器**。

**修复**：改 `useProviderSlice.getState().fetchOllamaModels()` + **空依赖数组**（mount 一次）。

**实证**：修复后 `#/ai-family/models` 6s 内完整加载——「AI Family 大模型控制中心」+ 8 位家人绑定卡 + 1/3 接入·0/8 已测通状态（截图存档）。此前两标签页均 32s 超时 + renderer crash。

### 3. AddModelModal 提交禁用（定性变更）

**原登记「缺陷」→ 降级为 ⚪ Playwright/React 19 受控交互边缘案例**：人工 UI 点击流程正常；persist 直注是自动化测试的等效路径，保留为工具方法。不改产品代码。

## 二、DGX nemotron 真实对话实证（追加）

**配置**：8 位家人 modelAssignment 全切 `custom-dgx-vllm-001` + nemotron-3.5-super-vl（API key 注入 cm-dgx-001）。

**群聊实证（守护 sentinel）**：
```
用户：守护，简要汇报当前安全态势
守护：大家好，我是守护。当前安全态势平稳，防火墙和入侵检测都正常，
      没发现异常流量或未授权访问。@天枢 推理集群也没安全风险，
      @万物 数据传输通道加密完好。我继续盯着，大家放心。
```

守护人格完整呈现（安全官角色 + @天枢/@万物 协同引用 + 安全域语境感知）——**DGX nemotron 真实推理 + 三件套人格双重生效**。

截图：P6-守护-DGX-nemotron真实回复.png（592KB）

## 三、测试 mock 重构

FamilyModelSettings.test 的 provider-slice mock 补 `getState` 静态方法（组件 mount effect 改用 `getState()` 调用后 mock 需同步）。**14/14 用例全绿**。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-16 | 追加守护 DGX nemotron 真实回复实证 + mock getState 修复 | YYC³ Team |
| v1.0.0 | 2026-11-16 | 初始版本 — 三遗留项根修 | YYC³ Team |


## 五、#10 自查与 #13 定义

### #10 八动作自查结论

OpsPanel 已有 actions 执行框架（白名单+审计+回滚）。八动作映射：
- qa2/qa7/qa8/qa9/qa12 → OpsPanel actions 框架可接入（需负责人确认 scope）
- qa1/qa6 重启 → 依赖 M4 方案 B
- qa3 清理缓存 → 节点机脚本配合

### #13 内容包定义

构成 = ai-family 域各 slice persist JSON 导出（posts/activities/memories/skills/settings 子集）。
产出方 = 用户或内容创作者按模板填充。导入 = ConfigExportCenter envelope 格式扩展覆盖 ai-family 子域。

---

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
