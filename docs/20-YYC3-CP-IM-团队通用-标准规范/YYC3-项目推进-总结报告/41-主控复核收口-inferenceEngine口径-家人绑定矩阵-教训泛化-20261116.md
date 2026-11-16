---
file: 41-主控复核收口-inferenceEngine口径-家人绑定矩阵-教训泛化-20261116.md
title: 落档 41 · 主控复核收口 — inferenceEngine 口径裁定 · 家人绑定矩阵 · 教训泛化
description: 主控三指令闭环 — modelId 同族 Option B 裁定/8 成员可测尽测矩阵/两条教训入库/截图资产 gitignore
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-16
updated: 2026-11-16
status: stable
tags: [report, review, closure, lessons]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloud-matrix
phase: production
commit: acb4fd3（前置）
gates:
  inference-engine: Option B 裁定（零消费方 + 原生模型名，不改代码）
  bindings: 8/8 逐成员矩阵 + 可测性标注
  gitignore: public/项目导航-对齐截图/ 已补录
---

# 落档 41 · 主控复核收口 — inferenceEngine 口径裁定 · 家人绑定矩阵 · 教训泛化

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

> 主控复核三指令逐项收口。

## 一、inference-engine modelId 同族裁定（Option B）

**主控指令**：同族形态在 `inference-engine.ts` L159（OllamaBackend）与 L207（WebGPUBackend）还有两处 POST 体用 `config.modelId`——需逐后端核对语义后处置。

**裁定：Option B（不改代码，写明口径）**：

| 路径 | 语义 | 结论 |
| ---- | ---- | ---- |
| `OllamaBackend.generate()` L159 | POST 到 Ollama `/api/chat`；`config.modelId` 为 **Ollama 原生模型名**（如 `family-coder-14b-q4:latest`，由 `fetchOllamaModels` 回填或用户直接输入） | custom model（cm-xxx）**不经此路由** |
| `WebGPUBackend` L207/219 | MLC 模型加载+推理；`config.modelId` 为 **MLC 模型标识**（如 `gemma-2-2b-it-q4f16_1-MLC`，L77 默认） | custom model **不经此路由** |
| `useInference` hook | 唯一消费 `OllamaBackend` 的 hook | **零活跃消费方**（全仓 grep 实证）——预留 WebGPU 本地推理接口 |

**Custom model 实际路径**：`family-ai-service.buildChatUrl()` → `cm.baseUrl + proxyUrl` → OpenAI 兼容 API（已修 `modelName`，落档 40）。

## 二、8 位家人绑定可测尽测矩阵（指令 ①）

| # | 成员 | 服务商 | 模型 | 可测性 | 依赖项 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 1 | 千行 navigator | zhipu | glm-4.5 | ❌ | Z.ai API Key |
| 2 | 万物 thinker | deepseek | deepseek-chat | ❌ | DeepSeek API Key |
| 3 | 先知 prophet | qwen | qwen3-max | ❌ | 阿里 DashScope Key |
| 4 | 伯乐 bolero | zhipu | glm-4.5-air | ❌ | Z.ai API Key |
| 5 | 天枢 meta-oracle | deepseek | deepseek-chat | ❌ | DeepSeek API Key |
| 6 | 守护 sentinel | deepseek | deepseek-reasoner | ❌ | DeepSeek API Key |
| 7 | 宗师 master | claude | claude-sonnet-4 | ❌ | Anthropic Key |
| 8 | 灵韵 creative | qwen | qwen-vl-max | ❌ | 阿里 DashScope Key |
| — | **群聊路径** | **DGX vLLM** | **nemotron-3.5** | **✅ 已实测往返**（落档 39） | — |

**结论**：8 位成员预设绑定均为云端服务商（需 API Key），当前 **0/8 可测**。群聊路径经 DGX 已通（`getActiveModel()` 取激活模型）。成员级单聊需 key 到位后经 `#/ai-family/models` 三步诊断逐个激活。

## 三、教训泛化（入库）

### 教训 T-01 · modelId / modelName 契约陷阱

**场景**：内部 ID（cm-xxx）与实际模型名（API 调用名）在不同层传递，同族代码可能误用内部 ID 做外部 API 调用。

**教训**：同一字段名（`modelId`）在不同上下文有不同语义——cm 内部 ID vs Ollama 模型名 vs MLC 模型标识。**同族全仓审计是标准动作**（本次 connection-test-engine 修复后立即扫描 inference-engine 同族命中，确认零消费方后裁定 Option B）。

**规范**：新增 API 调用路径时，POST 体中模型字段应显式取 `model.model`（实际名）或 `config.modelName`，禁止取 `model.id` / `config.modelId`（内部标识）。

### 教训 T-02 · zustand 整 store 引用做 useEffect 依赖 = 无限循环

**场景**：`useEffect(() => { providerSlice.fetchOllamaModels(); }, [providerSlice])` —— `providerSlice` 是 `useProviderSlice()` 返回的**整 store 状态对象**，每次渲染返回新引用 → fetch 触发 state 变更 → 新引用再触发 effect → 无限循环冻结渲染器。

**教训**：zustand hook 无 selector 调用（`useStore()` 而非 `useStore(s => s.xxx)`）返回整 state，**不可直接作为 useEffect 依赖**。

**修复范式**：
```ts
// ❌ 反模式（无限循环）
const store = useStore();
useEffect(() => { store.action(); }, [store]);

// ✅ 正确（mount 一次）
useEffect(() => { useStore.getState().action(); }, []);
```

**同族扫描结论**：全仓 `grep -rn "useEffect.*\[.*[Ss]lice\]\|useEffect.*\[.*[Ss]tore\]"` 仅命中已修行（FamilyModelSettings.tsx:387），**无残留**。

## 四、截图资产处置（指令 ②）

`public/项目导航-对齐截图/`（82M，7 个子目录）——个人参照资产，**补录 .gitignore**（不入库、不随构建入 dist/dmg）。此前 707M dmg 体积超标此目录占 82M（P5 时已知但未处置，本次收口）。

## 五、P6 外部输入状态登记（指令 ③）

| 项 | 等什么 | 谁给 | 到位即做 | 当前状态 |
| ---- | ---- | ---- | ---- | ---- |
| NAS API key → #12 | key 本体 | 用户在 NAS 侧生成 | 复刻落档 39 反代流程实测 | ⬜ 等待 |
| #10 八动作接口 | 文档/字段口径 | 0379-World 仓/网关线 | 专项销项 | ⬜ 等待 |
| #13 内容包 | 内容包本体 | 用户交付 | 数据形式导入（非硬编码） | ⬜ 等待 |
| 8 位成员云端 key | Z.ai/DeepSeek/阿里/Anthropic key | 用户配置 | `#/ai-family/models` 逐成员三步诊断 | ⬜ 等待（矩阵见 §二） |

注册表 30 条不动（本档为复核收口，无代码提交）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-16 | 初始版本 — 主控复核三指令收口 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
