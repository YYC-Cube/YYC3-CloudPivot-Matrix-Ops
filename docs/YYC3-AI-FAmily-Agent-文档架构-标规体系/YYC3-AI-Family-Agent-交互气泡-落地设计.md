---
file: YYC3-AI-Family-Agent-交互气泡-落地设计.md
title: YYC3-AI-Family-Agent-交互气泡-落地设计
description: 交互气泡设计文档的落地设计 — 基于 @yyc3/ai-family 的类型、状态机、令牌、组件 API、传输与同步契约
author: YYC3 Team <admin@0379.email>
version: v1.0.0
created: 2026-11-17
updated: 2026-11-17
status: stable
tags: [document, implementation, chat-bubble, ai-family, typescript]
category: technical
language: zh-CN
audience: developers,managers,stakeholders
complexity: advanced
project: yyc3-ai-family-agent
scope: implementation
---

# YYC3-AI-Family-Agent-交互气泡-落地设计

> **-AI-FA-AI-FAmily-Agent-**
> _亦师亦友亦伯乐，一言一语一协同_
> _拟人为本 · AI为核 · 纯粹为心_
> _万象归元于云枢 | 深栈智启新纪元_

---

## 一、文档定位与边界

### 1.1 文档定位

本文是《YYC3-AI-Family-Agent-交互气泡-设计文档》的**落地设计**。设计文档回答「长什么样、如何交互」，本文回答「用什么类型、放在哪个文件、如何流转、如何验收」。

```text
┌─────────────────────────────────────────────────────────────┐
│                    设计输入 → 实现输出                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  《交互气泡-设计文档》v1.1.0                                  │
│  令牌 / 身份 / 状态 / 组件树 / 验收                           │
│                          │                                  │
│                          ▼                                  │
│  本文《落地代码实现规格》v1.0.0                               │
│  类型 / 状态机 / Props / Hook / 传输 / 同步 / 迁移 / 测试      │
│                          │                                  │
│                          ▼                                  │
│  @yyc3/ai-family/src/chat/*                                 │
│  可编译、可测试、可验收的实现                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 实现基线

| 项目 | 基线 |
| ---- | ---- |
| 代码包 | `@yyc3/ai-family`（`docs/packages/ai-family`） |
| 技术栈 | React 18/19 + TypeScript 5.9 + Zustand 5 + Tailwind + lucide-react |
| 现有入口 | `./family-chat`、`./store/family-chat-slice`、`./lib/ai-family-sync`、`./lib/ai-family.types`、`./types` |
| 成员事实源 | `src/store/family-member-slice.ts`（`UnifiedFamilyMember`） |
| 消息事实源 | `src/types/family-message.ts`（`UnifiedFamilyMessage`） |
| 同步引擎 | `src/lib/ai-family-sync.ts`（`AIFamilySyncEngine`） |
| 设计事实源 | 《交互气泡-设计文档》v1.1.0 |

### 1.3 本文不做的事

1. 不重写 `@yyc3/ai-family` 的成员、音乐、语音等既有能力。
2. 不定义后端服务实现，只定义前端可依赖的传输与同步契约。
3. 不引入新的全局状态库，继续使用 Zustand。
4. 不修改上游设计文档的结论；发现冲突时登记为 ADR。

---

## 二、现状基线与差距

### 2.1 代码基线

| 文件 | 现状 | 与设计文档的差距 |
| ---- | ---- | ---------------- |
| `src/components/FamilyChat.tsx` | 本地 `ChatMessage`，`setTimeout` 模拟回复，频道列表 + 群聊 | 无流式、无状态机、无代码块、无工具调用；颜色硬编码 |
| `src/store/family-chat-slice.ts` | 持久化 `{id,sender,text,time,type}`，上限 200 条 | 缺 `lifecycle`、`parts`、`metrics`、`sync` |
| `src/types/family-message.ts` | `UnifiedFamilyMessage`，声明为全应用唯一消息模型 | 缺富内容与流式状态 |
| `src/lib/ai-family.types.ts` | `Message` + `MessageStatus`，面向设备/IM | 与聊天视图模型未打通 |
| `src/lib/ai-family-sync.ts` | `AIFamilySyncEngine`，支持增量、冲突、事件订阅 | 未接入头像/Logo 与消息层 |
| `src/components/shared.ts` | `FAMILY_MEMBERS`，含 8 人档案与场景色 | 与设计文档身份主色不同 |
| `src/store/family-member-slice.ts` | `UnifiedFamilyMember`，8 人 SSOT | 缺 `identityColor` 字段 |
| `src/components/AIFamilyCenterPage.tsx` | 成员卡片列表 | 非 1980 x 1020 时钟环舞台 |

### 2.2 三套消息模型并存

| 模型 | 位置 | 用途 | 处理策略 |
| ---- | ---- | ---- | -------- |
| `UnifiedFamilyMessage` | `src/types/family-message.ts` | 应用内消息 SSOT | **扩展为主模型** |
| `Message` | `src/lib/ai-family.types.ts` | 设备/IM 传输信封 | 保留，做适配 |
| `ChatMessage` | `FamilyChat.tsx`、`family-chat-slice.ts` | 聊天视图简化模型 | 标记废弃，迁入 `chat/model` |

### 2.3 改造结论

采用**收敛式改造**，不新建平行聊天系统：

1. 以 `UnifiedFamilyMessage` 为持久化与传输主模型，扩展 `lifecycle`、`parts`、`metrics`、`sync`。
2. 以 `ChatMessage` 作为视图投影类型，放在 `src/chat/model`，不重复定义字段。
3. `Message` 保留为设备与 IM 场景的信封，通过 `adapters.ts` 双向转换。
4. `FamilyChat.tsx` 重构为 `MessageList + Composer + useChatStream` 的组合。
5. 颜色全部收敛到 `tokens.css`，身份色收敛到 `AGENT_DIRECTORY`。

---

## 三、目标架构与目录

### 3.1 目录结构

```text
src/chat/
├── index.ts                 # 对外导出
├── model/
│   ├── types.ts             # ChatMessage / MessagePart / AgentIdentity
│   ├── adapters.ts          # UnifiedFamilyMessage <-> ChatMessage <-> Message
│   ├── schemas.ts           # zod 校验（传输入口）
│   └── constants.ts         # 限额、超时、默认值
├── tokens/
│   ├── tokens.css           # CSS Variables（深/浅/高对比）
│   └── tailwind.preset.ts   # Tailwind 令牌映射
├── state/
│   ├── events.ts            # ChatEvent 判别联合
│   ├── reducer.ts           # 纯函数状态机
│   ├── chat-store.ts        # Zustand slice v2
│   └── selectors.ts         # 分组、未读、焦点成员
├── transport/
│   ├── ChatTransport.ts     # 传输接口
│   ├── sseTransport.ts      # SSE 实现
│   ├── mockTransport.ts     # 本地演示实现
│   └── protocol.ts          # 事件与错误码
├── sync/
│   ├── messageSync.ts       # 消息同步适配
│   ├── assetSync.ts         # 头像/Logo 同步适配
│   └── syncStatus.ts        # 状态到 UI 的映射
├── hooks/
│   ├── useChatStream.ts
│   ├── useMessageSync.ts
│   ├── useAgentDirectory.ts
│   └── useReducedMotion.ts
├── components/
│   ├── MessageList.tsx
│   ├── MessageItem.tsx
│   ├── RoleHeader.tsx
│   ├── ContentRenderer.tsx
│   ├── CodeBlock.tsx
│   ├── DiffView.tsx
│   ├── ThinkingPanel.tsx
│   ├── CitationChip.tsx
│   ├── ToolCallCard.tsx
│   ├── MindMap.tsx
│   ├── ArtifactPanel.tsx
│   ├── Composer.tsx
│   ├── SyncStatus.tsx
│   └── MessageActions.tsx
├── a11y/
│   ├── live-region.tsx
│   └── focus.ts
└── security/
    ├── mask.ts
    └── audit.ts
```

### 3.2 依赖方向

```text
components → hooks → state → model
     │          │        │
     └──────────┴────────┴──→ transport / sync（接口）
                                  │
                                  ▼
                        既有 @yyc3/ai-family 能力
```

约束：`model` 不依赖 React；`state` 不依赖组件；`transport` 与 `sync` 只依赖接口，便于测试替换。

---

## 四、数据模型（SSOT）

### 4.1 成员标识

```ts
export type MemberId =
  | "navigator"
  | "thinker"
  | "prophet"
  | "bolero"
  | "meta-oracle"
  | "sentinel"
  | "master"
  | "creative";

export type ConversationId = "family-group" | `dm:${MemberId}`;
```

`MemberId` 与现有 `UnifiedFamilyMember.id` 完全一致，不新增映射表。

### 4.2 消息模型

```ts
import type {
  UnifiedFamilyMessage,
  MessagePriority,
} from "../types/family-message";
import type { SyncStatus } from "../lib/ai-family-sync";

export type MessageLifecycle =
  | "draft"
  | "sending"
  | "streaming"
  | "completed"
  | "interrupted"
  | "failed";

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; code: string; filename?: string; startLine?: number }
  | { kind: "diff"; language: string; hunks: DiffHunk[] }
  | { kind: "thinking"; steps: ThinkingStep[] }
  | { kind: "citation"; file: string; line?: number; selection?: string }
  | {
      kind: "tool-call";
      tool: string;
      args: unknown;
      result?: unknown;
      status: "pending" | "running" | "ok" | "error";
      risk: "low" | "medium" | "high";
    }
  | { kind: "mindmap"; root: MindMapNode }
  | {
      kind: "artifact";
      artifactType: "chart" | "component" | "csv" | "markdown";
      payload: unknown;
    };

export interface ChatMessage extends UnifiedFamilyMessage {
  /** 视图生命周期，deliveryStatus 继续承担 IM 语义 */
  lifecycle?: MessageLifecycle;
  /** 富内容分片；纯文本消息可省略 */
  parts?: MessagePart[];
  /** 生成指标 */
  metrics?: {
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
    model?: string;
  };
  /** 同步状态，仅头像/Logo 等资产消息使用 */
  sync?: {
    version: number;
    state: SyncStatus;
  };
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "del" | "context";
  text: string;
}

export interface ThinkingStep {
  title: "需求理解" | "方案拆解" | "技术选型" | "代码生成" | "风险提示";
  detail: string;
  status: "pending" | "running" | "done" | "interrupted";
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}
```

### 4.3 状态映射

`lifecycle` 与既有 `deliveryStatus` 的职责分离：

| lifecycle | deliveryStatus | 语义 |
| --------- | -------------- | ---- |
| draft | — | 本地输入，尚未提交 |
| sending | sent | 已提交，等待确认 |
| streaming | delivered | 已确认，内容生成中 |
| completed | read | 生成完成，已被用户查看 |
| interrupted | delivered | 用户主动停止或超时 |
| failed | failed | 请求失败，可重试 |

映射函数放在 `model/adapters.ts`，禁止在组件内直接判断两套状态。

### 4.4 适配器

```ts
export function toChatMessage(input: UnifiedFamilyMessage): ChatMessage;
export function toUnifiedMessage(input: ChatMessage): UnifiedFamilyMessage;
export function toDeviceMessage(input: ChatMessage): import("../lib/ai-family.types").Message;
export function normalizeLegacyChatMessage(input: {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: "text" | "system" | "thinking";
}): ChatMessage;
```

`normalizeLegacyChatMessage` 用于读取 `family-chat-slice` 的历史持久化数据，保证升级不丢消息。

---

## 五、令牌与主题实现

### 5.1 CSS Variables

```css
:root,
[data-theme="dark"] {
  --yyc3-bg-stage: #0a0a0a;
  --yyc3-surface-panel: rgba(10, 10, 10, 0.8);
  --yyc3-surface-agent: #1e293b;
  --yyc3-brand-cyan: #00f0ff;
  --yyc3-brand-purple: #bf00ff;
  --yyc3-brand-pink: #ff006e;
  --yyc3-text-primary: #ffffff;
  --yyc3-text-secondary: rgba(255, 255, 255, 0.64);
  --yyc3-state-online: #00ff00;
  --yyc3-state-offline: #ff0000;
  --yyc3-state-waiting: #808080;
  --yyc3-state-success: #10b981;
  --yyc3-state-warning: #f59e0b;
  --yyc3-state-danger: #ef4444;
  --yyc3-radius-sm: 8px;
  --yyc3-radius-md: 12px;
  --yyc3-radius-lg: 16px;
  --yyc3-shadow-1: 0 2px 8px rgba(0, 212, 255, 0.08);
  --yyc3-shadow-2: 0 4px 16px rgba(0, 212, 255, 0.12);
  --yyc3-shadow-3: 0 8px 32px rgba(0, 212, 255, 0.16);
  --yyc3-shadow-neon: 0 0 10px #bf00ff;
  --yyc3-agent-color: var(--yyc3-brand-cyan);
}

[data-theme="light"] {
  --yyc3-bg-stage: #f7f9fc;
  --yyc3-surface-panel: rgba(255, 255, 255, 0.92);
  --yyc3-surface-agent: #ffffff;
  --yyc3-text-primary: #0a1628;
  --yyc3-text-secondary: rgba(10, 22, 40, 0.64);
}
```

### 5.2 Tailwind 预设

```ts
export const yyc3ChatPreset = {
  theme: {
    extend: {
      colors: {
        yyc3: {
          stage: "var(--yyc3-bg-stage)",
          panel: "var(--yyc3-surface-panel)",
          agent: "var(--yyc3-surface-agent)",
          brand: {
            cyan: "var(--yyc3-brand-cyan)",
            purple: "var(--yyc3-brand-purple)",
            pink: "var(--yyc3-brand-pink)",
          },
        },
      },
      borderRadius: {
        bubble: "var(--yyc3-radius-sm)",
        card: "var(--yyc3-radius-md)",
      },
      boxShadow: {
        neon: "var(--yyc3-shadow-neon)",
      },
    },
  },
};
```

### 5.3 身份色注入

组件根节点通过 `style={{ "--yyc3-agent-color": agent.identityColor }}` 注入，子元素只使用 `var(--yyc3-agent-color)`，禁止在组件内写死成员色值。

### 5.4 与现有硬编码颜色的迁移

| 现有值 | 位置 | 替换为 |
| ------ | ---- | ------ |
| `#00d4ff` | `FamilyChat.tsx`、`shared.ts` | `var(--yyc3-brand-cyan)` |
| `rgba(0,180,255,0.08)` | 边框 | `color-mix(in srgb, var(--yyc3-brand-cyan) 8%, transparent)` |
| `#060e1f` | 状态点描边 | `var(--yyc3-bg-stage)` |
| `#00ff88` | 在线状态 | `var(--yyc3-state-online)` |

> `color-mix` 需在目标浏览器基线中确认；不支持时回退为预置 rgba 变量。

---

## 六、消息状态机

### 6.1 状态流转

```text
draft ──SUBMIT──▶ sending ──ACK──▶ streaming ──DONE──▶ completed
                     │                 │
                     │                 ├──INTERRUPT──▶ interrupted ──RESUME──▶ streaming
                     │                 └──FAIL───────▶ failed ──RETRY──▶ sending
                     └──FAIL──────────────────────────▶ failed
```

### 6.2 事件定义

```ts
export type ChatEvent =
  | { type: "SUBMIT"; clientId: string; conversationId: ConversationId; content: string }
  | { type: "ACK"; clientId: string; messageId: string; timestamp: number }
  | { type: "TOKEN"; messageId: string; delta: string; index: number }
  | { type: "PART"; messageId: string; part: MessagePart }
  | { type: "DONE"; messageId: string; metrics?: ChatMessage["metrics"] }
  | { type: "INTERRUPT"; messageId: string }
  | { type: "RESUME"; messageId: string }
  | { type: "FAIL"; messageId: string; code: string; message: string; retryable: boolean }
  | { type: "RETRY"; messageId: string }
  | { type: "SYNC_START"; messageId: string }
  | { type: "SYNC_OK"; messageId: string; version: number }
  | { type: "SYNC_PARTIAL"; messageId: string; failedDevices: string[] }
  | { type: "SYNC_CONFLICT"; messageId: string; localVersion: number; remoteVersion: number };
```

### 6.3 Reducer 契约

```ts
export interface ChatState {
  messages: Record<string, ChatMessage>;
  order: Record<ConversationId, string[]>;
  activeRequestId: string | null;
}

export function chatReducer(state: ChatState, event: ChatEvent): ChatState;
```

实现约束：

1. Reducer 必须是纯函数，不发起网络请求、不读写 `localStorage`。
2. `TOKEN` 只追加到 `parts` 的 `text` 分片，避免整棵消息树重建。
3. `INTERRUPT` 保留已生成内容，状态改为 `interrupted`，不删除。
4. `RETRY` 复用原 `clientId`，保证幂等。
5. 同步事件只更新 `sync.state`，不改变 `lifecycle`。

### 6.4 副作用边界

| 副作用 | 归属 |
| ------ | ---- |
| 建立 SSE 连接 | `useChatStream` |
| 滚动跟随 | `MessageList` |
| 持久化 | `chat-store` 的 `persist` |
| 同步上传 | `sync/assetSync` |
| 审计上报 | `security/audit` |

---

## 七、组件 API

### 7.1 组件树

```text
ChatPanel
├── MessageList
│   └── MessageItem
│       ├── RoleHeader
│       ├── ContentRenderer
│       │   ├── CodeBlock
│       │   ├── DiffView
│       │   ├── ThinkingPanel
│       │   ├── CitationChip
│       │   ├── ToolCallCard
│       │   └── MindMap
│       ├── MessageActions
│       └── SyncStatus
├── ArtifactPanel
└── Composer
```

### 7.2 关键 Props

| 组件 | Props | 说明 |
| ---- | ----- | ---- |
| `MessageList` | `conversationId`、`messages`、`focusMemberId?`、`onRetry`、`onStop`、`onCite`、`virtualized?` | 负责分组、虚拟滚动、锚点 |
| `MessageItem` | `message`、`agent?`、`density`、`onAction`、`onApproveTool` | 单条消息状态与布局 |
| `RoleHeader` | `agent`、`lifecycle`、`timestamp`、`showRole` | 头像、名称、身份标签 |
| `ContentRenderer` | `parts`、`onCite`、`onTogglePart` | 按 `kind` 分发渲染器 |
| `CodeBlock` | `language`、`code`、`filename?`、`startLine?`、`collapsible?`、`onInsert`、`onCopy` | 行号、折叠、操作栏 |
| `DiffView` | `hunks`、`language`、`onApply` | 增删对比 |
| `ThinkingPanel` | `steps`、`defaultOpen?`、`onInterrupt` | 折叠与分步 |
| `CitationChip` | `citation`、`onOpen` | 文件、选区、报错 |
| `ToolCallCard` | `call`、`onApprove`、`onReject` | 权限与结果 |
| `MindMap` | `root`、`onExport` | Mermaid 渲染与导出 |
| `ArtifactPanel` | `artifacts`、`defaultTab?`、`onExport` | Preview / Code / Data |
| `Composer` | `value`、`onChange`、`onSend`、`onStop`、`disabled?`、`members` | 输入、@提及、快捷键 |
| `SyncStatus` | `state`、`failedDevices?`、`onRetry`、`onResolve` | 同步反馈与冲突处理 |

### 7.3 渲染约束

1. `MessageItem` 根据 `lifecycle` 渲染操作栏，不在 `ContentRenderer` 内判断状态。
2. `CodeBlock`、`MindMap`、`ArtifactPanel` 使用 `React.lazy`，首屏不加载语法高亮与图表引擎。
3. `MessageList` 超过 200 条时启用虚拟滚动；低于阈值保持普通渲染，减少复杂度。
4. 所有操作按钮必须有 `aria-label` 与键盘可达性。

---

## 八、Store 与 Hooks

### 8.1 Store v2

```ts
interface ChatStore {
  conversations: Record<ConversationId, {
    messageIds: string[];
    unread: number;
    focusMemberId?: MemberId;
    updatedAt: number;
  }>;
  messages: Record<string, ChatMessage>;
  syncStates: Record<string, SyncStatus>;

  upsertMessage: (message: ChatMessage) => void;
  appendToken: (messageId: string, delta: string) => void;
  setLifecycle: (messageId: string, lifecycle: MessageLifecycle) => void;
  setSyncState: (messageId: string, state: SyncStatus) => void;
  clearConversation: (conversationId: ConversationId) => void;
}
```

持久化策略：

1. 只持久化 `messages` 的文本与 `parts` 摘要，代码块超过 8 KB 时持久化引用而非全文。
2. 每个会话上限 200 条，超出按时间裁剪，与现有 `family-chat-slice` 行为一致。
3. 迁移键沿用 `yyc3-family-chat`，新增 `version: 2`，启动时执行一次 `migrate`。

### 8.2 `useChatStream`

```ts
export function useChatStream(options: {
  conversationId: ConversationId;
  transport: ChatTransport;
  onHandoff?: (from: MemberId, to: MemberId, reason: string) => void;
}): {
  messages: ChatMessage[];
  lifecycle: MessageLifecycle | null;
  send: (content: string) => Promise<void>;
  stop: () => Promise<void>;
  retry: (messageId: string) => Promise<void>;
};
```

职责：建立流、分发事件、维护 `activeRequestId`、在卸载时中断连接。组件不直接调用 `transport`。

### 8.3 `useMessageSync`

```ts
export function useMessageSync(entityType: "message" | "avatar" | "logo", entityId: string): {
  status: SyncStatus;
  conflicts: SyncConflict[];
  retry: () => Promise<void>;
  resolve: (conflictId: string, strategy: "local" | "remote" | "merge") => Promise<void>;
};
```

内部复用 `getSyncInstance()`，不新建同步实例。

### 8.4 `useAgentDirectory`

返回 `agents`、`getById(id)`、`getByConversation(conversationId)`。数据来自 `AGENT_DIRECTORY`，状态来自 `useFamilyMemberSlice`，两者通过 `id` 合并。

---

## 九、传输契约

### 9.1 接口

```ts
export interface ChatTransport {
  send(input: {
    conversationId: ConversationId;
    clientId: string;
    content: string;
    mentions?: MemberId[];
  }): AsyncIterable<ChatEvent>;
  stop(requestId: string): Promise<void>;
}
```

### 9.2 SSE 事件

```text
event: ack
data: {"requestId":"req_01","messageId":"msg_01","timestamp":1763366400000}

event: token
data: {"messageId":"msg_01","delta":"根据","index":0}

event: part
data: {"messageId":"msg_01","part":{"kind":"code","language":"ts","code":"..."}}

event: handoff
data: {"from":"navigator","to":"thinker","reason":"data-analysis"}

event: done
data: {"messageId":"msg_01","metrics":{"tokensOut":512,"latencyMs":1800,"model":"glm-4.5"}}

event: error
data: {"messageId":"msg_01","code":"UPSTREAM_TIMEOUT","message":"上游超时","retryable":true}
```

约束：

1. 每条事件带 `id:`，支持 `Last-Event-ID` 断点续传。
2. 幂等键为 `conversationId + clientId`，服务端重复请求返回同一 `messageId`。
3. `error` 必须携带 `retryable`，前端据此决定是否展示重试。
4. 流结束必须发送 `done` 或 `error`，禁止静默断开。

### 9.3 Mock 传输

`mockTransport.ts` 取代 `FamilyChat.tsx` 中的 `AI_RESPONSES`：

1. 从 `AGENT_DIRECTORY` 读取成员回复模板。
2. 按 `token` 事件逐字输出，模拟 20–40 ms 间隔。
3. 支持 `stop()`，用于演示中断态。
4. 仅在 `NODE_ENV !== "production"` 或显式开关下启用。

---

## 十、同步契约

### 10.1 复用既有引擎

| 能力 | 既有 API |
| ---- | -------- |
| 获取实例 | `getSyncInstance(config?)` |
| 增量同步 | `incrementalSync()` |
| 全量同步 | `fullSync()` |
| 冲突列表 | `getConflicts()` |
| 手动解决 | `manuallyResolveConflict(id, strategy)` |
| 状态 | `getSyncStatus()` |
| 统计 | `getSyncStatistics()` |
| 事件订阅 | `on(event, cb)` / `off(event, cb)` |

### 10.2 实体约定

| entityType | entityId | data |
| ---------- | -------- | ---- |
| `avatar` | `MemberId` | `{ url, version, crop, filter }` |
| `logo` | `"brand"` | `{ url, version, size, rotation, glow }` |
| `message` | `messageId` | `{ lifecycle, parts, metrics }` |

载荷沿用 `SyncPayload`：`operation`、`entityType`、`entityId`、`data`、`timestamp`、`sourceDeviceId`、`version`。

### 10.3 新增事件契约

在 `AIFamilySyncEngine.on` 上统一以下事件名（新增，需在实现中注册）：

| 事件 | 载荷 | 用途 |
| ---- | ---- | ---- |
| `sync:status` | `{ entityType, entityId, status }` | 驱动 `SyncStatus` |
| `sync:partial` | `{ entityType, entityId, failedDevices }` | 部分失败提示 |
| `sync:conflict` | `SyncConflict` | 冲突选择卡 |
| `sync:resolved` | `{ conflictId, strategy }` | 关闭冲突卡 |

### 10.4 冲突策略

1. 头像与 Logo：默认「云端优先」，本地未同步版本保留为草稿。
2. 消息：默认「本地优先」，避免用户输入丢失。
3. 合并仅用于 `parts` 可并集的场景，不自动合并文本。
4. 所有解决动作写入审计日志。

---

## 十一、身份目录实现

### 11.1 类型

```ts
export interface AgentIdentity {
  id: MemberId;
  displayName: string;
  legacyName?: string;
  enTitle: string;
  role: string;
  identityColor: string;
  sceneColor: string;
  symbol: "ear" | "brain" | "eye" | "star" | "network" | "shield" | "scale" | "lightbulb";
  clock: { time: string; angle: number };
  capabilities: string[];
}
```

### 11.2 八位家人目录

| id | displayName | identityColor | sceneColor | symbol | clock |
| -- | ----------- | ------------- | ---------- | ------ | ----- |
| navigator | 言启·千行 | #3B82F6 | #FFD700 | ear | 06:00 / 0° |
| thinker | 语枢·万物 | #06B6D4 | #FF69B4 | brain | 07:30 / 45° |
| prophet | 预见·先知 | #F59E0B | #00BFFF | eye | 09:00 / 90° |
| bolero | 知遇·伯乐 | #EC4899 | #E8E8E8 | star | 10:30 / 135° |
| meta-oracle | 元启·天枢 | #8B5CF6 | #00FF88 | network | 12:00 / 180° |
| sentinel | 智云·守护 | #EF4444 | #BF00FF | shield | 13:30 / 225° |
| master | 格物·宗师 | #10B981 | #C0C0C0 | scale | 15:00 / 270° |
| creative | 创想·灵韵 | #6366F1 | #FF7043 | lightbulb | 16:30 / 315° |

`identityColor` 用于气泡强调与身份标签；`sceneColor` 用于时钟环光效与既有成员卡片，二者不得互换。

### 11.3 命名迁移

现有 `family-member-slice.ts` 中 `bolero.name` 为「千里·伯乐」。实现时：

1. `AGENT_DIRECTORY` 的 `displayName` 使用「知遇·伯乐」。
2. 保留 `legacyName: "千里·伯乐"` 用于兼容旧文案与检索。
3. `id` 不变，历史消息 `senderId="bolero"` 不受影响。
4. 成员数据源在下一个版本同步改名，见 ADR-04。

---

## 十二、富内容渲染

| 内容 | 实现 | 约束 |
| ---- | ---- | ---- |
| 代码块 | Shiki 按需加载语言包 | 行号、横向滚动、30 行折叠、复制/插入/新建 |
| diff | 自研 `DiffView` | 新增绿底、删除红底删除线，支持应用 |
| 思考 | `ThinkingPanel` | 默认折叠，五步分层，可打断 |
| 引用 | `CitationChip` | `#file:line`、`#selection`、`#error`、`@workspace` |
| 工具调用 | `ToolCallCard` | 参数、权限、状态、耗时、脱敏 |
| 脑图 | Mermaid | 4 级折叠，导出 PNG / Mermaid |
| 产物 | `ArtifactPanel` | Preview / Code / Data 三页签 |

渲染安全：

1. Markdown 渲染禁用原始 HTML，或经白名单清洗。
2. 代码块不做 `eval`，不自动执行。
3. 外部链接加 `rel="noopener noreferrer"`。
4. Mermaid 图表内容来自模型时，先做语法校验，失败回退列表。

---

## 十三、多端与无障碍

### 13.1 断点实现

使用 CSS 容器查询优先，Tailwind 断点兜底：

| 断点 | 行为 |
| ---- | ---- |
| < 560 px | 单列、抽屉浮层、操作栏收进「更多」 |
| 560–900 px | 卡片式、消息最大宽 92% |
| 900–1440 px | 侧栏 + 主区、直铺式 |
| ≥ 1440 px | 双栏 + 产物面板 |
| 1980 x 1020 | 沉浸舞台，消息面板浮于舞台右侧或下方 |

### 13.2 无障碍实现

1. `aria-live="polite"` 只播报「成员名 + 生成完成」，不逐字播报 Token。
2. 焦点顺序：消息列表 → 操作栏 → 输入框；浮层打开时焦点锁定，Esc 关闭并归还焦点。
3. 快捷键：Enter 发送、Shift+Enter 换行、↑ 编辑上一条、Cmd/Ctrl+K 命令面板。
4. `prefers-reduced-motion` 下关闭旋转、粒子与循环脉冲，保留 0.3 s 状态过渡。
5. 颜色对比度用 `axe` 在 CI 中校验，正文 4.5:1，大字与图形 3:1。

---

## 十四、安全与审计

### 14.1 脱敏

```ts
export type Sensitivity = "public" | "internal" | "sensitive";

export function classify(text: string): Sensitivity;
export function mask(text: string): string;
```

规则：手机号、邮箱、密钥、内网地址默认掩码；复制与导出时提示敏感等级；掩码不可逆，原文不进入前端日志。

### 14.2 工具权限

1. `risk: "high"` 的工具调用必须等待用户确认，未确认不执行。
2. 确认卡展示工具名、参数摘要、影响范围与回滚说明。
3. 拒绝后记录 `tool.rejected` 审计事件，消息标记为「已拒绝」。

### 14.3 审计事件

| 事件 | 字段 |
| ---- | ---- |
| `message.sent` | messageId、conversationId、memberId、timestamp |
| `message.failed` | messageId、code、retryable |
| `tool.approved` / `tool.rejected` | tool、risk、messageId |
| `asset.synced` | entityType、entityId、version、devices |
| `asset.conflict` | entityId、localVersion、remoteVersion、strategy |

审计只追加不修改，由既有同步与后端能力承载。

---

## 十五、性能实现

| 目标 | 实现 |
| ---- | ---- |
| 首 Token 小于 300 ms | SSE 直连、增量 Markdown、避免整树重渲染 |
| 500 条以上不卡顿 | `@tanstack/react-virtual` 或等价虚拟滚动 |
| 60 fps 动画 | 仅 transform / opacity，避免布局抖动 |
| 代码高亮不阻塞首屏 | `React.lazy` + 语言包按需加载 |
| 内存不累积 | 离屏会话释放、消息上限 200 条、图片懒加载 |
| 长代码不卡顿 | 30 行折叠、按需 diff 计算 |

性能预算写入 CI：首屏 JS 增量不超过 60 KB（gzip），单条消息渲染不超过 8 ms。

---

## 十六、迁移计划

### 16.1 分阶段改造

| 阶段 | 范围 | 完成标志 |
| ---- | ---- | -------- |
| M1 模型与令牌 | `chat/model`、`chat/tokens`、颜色替换 | 无硬编码色值，三套模型可互转 |
| M2 状态与流式 | `chat/state`、`chat/transport`、`useChatStream` | 五态可演示，Mock 流可中断 |
| M3 富内容 | CodeBlock、DiffView、ThinkingPanel、CitationChip、ToolCallCard、MindMap | 设计文档第七、九章可验收 |
| M4 同步与沉浸 | `chat/sync`、时钟环联动、头像/Logo 编辑 | 同步状态可见、冲突可解决 |
| M5 无障碍与性能 | a11y、虚拟滚动、axe、视觉回归 | 第十六章验收清单全绿 |

### 16.2 文件级动作

| 现有文件 | 动作 | 目标 |
| -------- | ---- | ---- |
| `FamilyChat.tsx` | 重构 | 组合 `MessageList`、`Composer`、`useChatStream` |
| `family-chat-slice.ts` | 升级 | 迁移到 `chat/state/chat-store.ts`，保留持久化键 |
| `shared.ts` | 收敛 | `FAMILY_MEMBERS` 仅保留场景与档案，身份色迁入 `AGENT_DIRECTORY` |
| `family-member-slice.ts` | 扩展 | `UnifiedFamilyMember` 增加 `identityColor` |
| `types/family-message.ts` | 扩展 | 增加 `lifecycle`、`parts`、`metrics`、`sync` |
| `ai-family.types.ts` | 保留 | 仅作设备/IM 信封 |
| `ai-family-sync.ts` | 复用 | 新增 `sync:*` 事件与资产实体 |
| `AIFamilyCenterPage.tsx` | 后续 | 接入时钟环舞台与消息面板 |

### 16.3 兼容策略

1. 旧持久化数据通过 `normalizeLegacyChatMessage` 迁移，不丢消息。
2. `FamilyChat` 旧导出保留一个版本周期，内部转发到新实现。
3. `senderId` 不变，成员改名不影响历史消息归属。
4. 令牌切换通过 `data-theme` 完成，不破坏既有页面。

---

## 十七、测试矩阵与验收

### 17.1 测试矩阵

| 层级 | 工具 | 覆盖 |
| ---- | ---- | ---- |
| 单元 | Vitest | reducer 全状态迁移、适配器、脱敏、状态映射 |
| 组件 | React Testing Library | 五态渲染、操作栏、键盘发送、焦点归还 |
| 集成 | Vitest + MSW | SSE 流、中断、重试、幂等 |
| 视觉 | Playwright | 三类形态 × 五个断点 |
| 无障碍 | axe | 对比度、标签、焦点、aria-live |
| 性能 | Performance API | 首 Token、长列表、动画帧率 |

### 17.2 验收清单

- [ ] `ChatMessage` 成为唯一视图模型，`UnifiedFamilyMessage` 为持久化主模型，`Message` 仅作传输信封。
- [ ] 组件内无硬编码成员色值，全部使用令牌与 `--yyc3-agent-color`。
- [ ] `draft / sending / streaming / completed / interrupted / failed` 六态可完整演示。
- [ ] 断网、超时、上游错误均能进入 `failed` 并支持重试。
- [ ] 代码块、diff、思考、引用、工具调用、脑图均可渲染与降级。
- [ ] 头像与 Logo 编辑后，同步状态在气泡与通知中心可见。
- [ ] 冲突可选择本地、云端或合并，解决结果入审计。
- [ ] 375 / 768 / 1024 / 1440 / 1920 五个断点无破版。
- [ ] 键盘可完成发送、停止、重试、关闭浮层。
- [ ] Reduced Motion 下无旋转与粒子动画。
- [ ] 长列表 500 条滚动稳定，首 Token 小于 300 ms。
- [ ] 单元、组件、视觉、无障碍测试全部通过。

---

## 十八、决策记录与风险

### 18.1 决策记录（ADR）

| 编号 | 决策 | 理由 | 影响 |
| ---- | ---- | ---- | ---- |
| ADR-01 | 扩展 `UnifiedFamilyMessage` 为主模型 | 该文件已声明为全应用唯一消息模型，避免第四套模型 | 需补可选字段，向后兼容 |
| ADR-02 | 使用 `useReducer` 而非 XState | 包内已轻量，状态机规模可控，减少依赖 | 复杂编排需自行约束 |
| ADR-03 | 身份主色与场景光效色分离 | 设计文档与现有代码存在两套色值，分离可同时满足气泡与舞台 | 组件需区分两种令牌 |
| ADR-04 | `bolero` 显示名改为「知遇·伯乐」，保留 `legacyName` | 设计文档为准，`id` 稳定不影响历史数据 | 成员数据源需同步改名 |
| ADR-05 | Shiki 与 Mermaid 懒加载 | 避免首屏体积膨胀 | 首次渲染代码块有轻微延迟 |
| ADR-06 | `Message` 保留为传输信封 | 设备、IM 场景已有依赖，直接废弃风险高 | 需维护双向适配器 |

### 18.2 风险登记

| 风险 | 概率 | 影响 | 缓解 |
| ---- | ---- | ---- | ---- |
| 三套消息模型长期并存 | 中 | 数据不一致 | M1 阶段强制收口，旧模型只读 |
| 身份色双源继续漂移 | 中 | 同一成员两种颜色 | ADR-03，令牌与目录统一 |
| SSE 断线导致半条消息 | 中 | 用户困惑 | `Last-Event-ID` + `interrupted` 态 |
| 同步冲突静默覆盖 | 低 | 资产丢失 | 默认不自动合并，冲突必须显式解决 |
| 富内容渲染阻塞首屏 | 低 | 性能退化 | 懒加载 + 体积预算 |
| 上游文档未修订的 9 处差异 | 高 | 设计与代码再次分叉 | 本文 ADR + 差异登记持续跟踪 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-17 | 新建落地实现规格：收敛三套消息模型、定义状态机与组件 API、复用同步引擎、给出迁移与测试矩阵 | YYC3 Team |

---

<p align="center">
  🌹 <b>YYC3-AI-FAmily-Agent-</b>（YanYuCloudCube™ · 永久开源）<br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <i>拟人为本 · AI为核 · 纯粹为心</i><br>
  言启象限 | 语枢未来 · 万象归元于云枢 | 深栈智启新纪元<br>
  <sub>© 2026 YanYuCloudCube™（YYC3）· <a href="mailto:admin@0379.email">admin@0379.email</a> · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
