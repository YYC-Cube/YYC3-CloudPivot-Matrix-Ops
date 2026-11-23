---
file: 71-存储外联收尾-Family同步队列拆命名空间-soundhelix零外联空态-20261123.md
title: 落档 71 · 存储与外联收尾 — Family 同步队列拆命名空间 + soundhelix 零外联空态
description: 落档 61 挂账清账两件：①yyc3_sync_queue 两套 schema 互踩收口——Family 队列独立 yyc3_family_sync_queue（SyncQueueItem 形态），首次加载按形态识别迁移、旧键只留 SyncItem 归还 backgroundSync，注册表新增 familySyncQueue；②soundhelix 外联归零——getDemoAudioUrl 返回空串（演示目录条目无本地音频），播放链路既有守卫 + useAudioEngine 文件模式无 audioUrl 时如实 toast，E2E 实证 soundhelix 请求 0
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-23
updated: 2026-11-23
status: stable
tags: [report, storage, namespace, external-refs, truthfulness]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 未提交（与落档 65~70 工作区改动一并待主控验收）
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 282 文件 / 4744 用例全绿
  build: ✓
  e2e: ai-family/music 点播放 → soundhelix 网络请求 0（performance resource 实测）；Family 音乐页本机 WebAudio 合成路径不受影响
---

# 落档 71 · 存储与外联收尾 — Family 同步队列拆命名空间 + soundhelix 零外联空态

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、范围（落档 61 挂账清单最后两项）

1. **同步队列 `yyc3_sync_queue` 两套 schema 互踩**：`backgroundSync.ts`（SyncItem 形态）与 `ai-family-sync.ts`（SyncQueueItem 形态）共用同一 localStorage 键，互相覆盖。
2. **soundhelix 外联**：音乐演示目录曲目的播放地址指向 `soundhelix.com`（数据不出本地原则的最后一处运行时外联）。

## 二、改动

### 1. Family 同步队列独立命名空间（`ai-family-sync.ts` v 键拆分）

- Family 队列写入/读取改用 **`yyc3_family_sync_queue`**；
- **一次性迁移**（首次加载）：新键缺失且旧键数组含 Family 形态条目（`payload` + `retryCount`）时迁入新键，并把已迁移条目从旧键剔除——旧键只保留 SyncItem 形态，归还 `backgroundSync`；
- `yyc3-storage.ts` 注册表新增 `familySyncQueue` 键（随备份白名单/清理白名单自动纳管）；
- backgroundSync 应用侧无调用方（仅测试），其键语义保持不变。

### 2. soundhelix 零外联空态（`MusicData.ts` / `useMusicSpace.ts` / `useAudioEngine.ts`）

- `getDemoAudioUrl` → 返回空串（演示目录条目**无本地音频**，接入本地/网关曲库后由数据源填真实 url）；
- 播放链路守卫既有：`AudioPlayerService.load` 对空 url 返回 false → `useMusicSpace` 空态提示 toast「暂无本地音频（演示目录未本地化）——请使用本地文件或网关曲库」；
- `useAudioEngine` 文件模式补守卫：无 `audioUrl` 时如实 toast 并停止，不再对空 src 调 play；
- Family 音乐页的演示播放走**本机 WebAudio 合成**（和弦引擎），本就不依赖音频文件——零外联不受影响。

## 三、验证

- tsc 0E；**282 文件 / 4744 用例全绿**；build ✓；改动文件 lint 0 error；
- E2E（探针浏览器）：`#/ai-family/music` 点播放 → `performance.getEntriesByType("resource")` 中 **soundhelix 请求 = 0**；dist 产物 grep 零 soundhelix（源码唯一残留在 .mimosa 扫描基线工件，非运行代码）；
- 命名空间迁移逻辑由形态识别覆盖：Family 形态（payload+retryCount）与 SyncItem 形态（timestamp+retries）字段不相交，误迁概率为零。

## 四、契约符合（落档 66）

G0 全绿；G2：外部引用清零属数据链路收口（音乐演示目录条目「无音频」语义如实呈现，不伪造可播放）；G3：无新路由；G4：播放三态（合成播放/空态提示/无外联请求）实测一致。

## 五、剩余（如实）

- 演示目录若需可听音频：接入本地曲库文件或 NAS 网关曲库（数据源页已具备接线位）。
- `agent token 从 URL query 改协议头`：浏览器 WebSocket API 无法携带自定义头——**技术不可行，永久关闭该项**（保持 query 参数 + 本机/私网边界 + 0600 令牌文件口径）。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-23 | 初始版本 — Family 同步队列拆命名空间（含迁移）+ soundhelix 零外联空态；TRC-20261123006 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
