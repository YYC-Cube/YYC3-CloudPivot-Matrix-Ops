---
file: 33-supabase全局退役-P4深度接入-每卡DCGM与vLLM直达节点详情-20261116.md
title: 落档 33 · supabase 全局退役清理与 P4 深度接入 — 每卡 DCGM 与 vLLM 直达节点详情
description: supabase 代码/依赖/文档全量清零 1f2b68d + P4 OpsPanel metrics 深度接入 97a37ae + 实证
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-16
updated: 2026-11-16
status: stable
tags: [report, purge, p4, metrics]
category: report
language: zh-CN
audience: developers,managers
complexity: advanced
project: yyc3-cloud-matrix
phase: production
commit: 1f2b68d / 97a37ae
gates:
  purge: tsc 0E / lint 0E4W / vitest 289×4941 / build 通过（依赖已卸载、node_modules @supabase 移除）
  p4: tsc 0E / lint 0E4W / vitest 289×4942 全绿 / build 通过
  p4-browser: 3118 实证 yyc3-n1 详情=每卡 DCGM + vLLM 八格真实面板（截图存档）
  security-scan: Mimosa 本批缓冲区不足未出完整结论（不宣称通过）
---

# 落档 33 · supabase 全局退役清理与 P4 深度接入 — 每卡 DCGM 与 vLLM 直达节点详情

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

> 依据：负责人指令「supabase 全局不再使用，审核评估清理所有相关文档与代码；衔接上文推进 + 文档同步」+ 落档 31 总纲 P4。

## 一、supabase 全局退役清理（`1f2b68d`）

**盘点 → 分类 → 清理**（全仓 grep 后三类处置）：

| 类别 | 处置 | 明细 |
| ---- | ---- | ---- |
| **代码/配置/依赖** | 全部移除 | ① `@supabase/supabase-js ^2.98.0` 依赖删除（lockfile 同步、node_modules 卸载）② vite.config `supabase-vendor` 分包块 ③ electron CSP DEV/PROD 两处 `https://*.supabase.co` ④ `.env.example` 与 `vite-env.d.ts` 的 VITE_SUPABASE_URL/ANON_KEY |
| **活文档** | 清理/标注 | README 19 处（徽章×2/架构图/文档树/索引/技术栈表/env 表/FAQ×3）；`src/app/docs/` 五文件（HANDOFF/STORAGE-AUDIT/API-REFERENCE/HA-TEST/TESTING-GUIDE）指向 mock-auth 现状；RefactoringReport RF-012「迁移风险」标 RESOLVED；`docs/supabase/family-schema.sql` 加 DEPRECATED 头（设计历史资产保留） |
| **历史落档（15-32）** | 保留不回写 | 其 supabase 记述系当时事实，按「存量不回写」原则存档 |
| **溯源注释** | 保留 | App.tsx / mock-auth.ts 的 P2 来龙去脉说明 |

**清理后全仓残留**：生产代码 0 引用、依赖 0、CSP 0、活文档仅「已退役」标注性提及。

## 二、P4 OpsPanel 深度接入（`97a37ae`）

**目标**：节点详情从「诚实空态」升级为「真实实测呈现」（数据源未覆盖节点仍诚实空态）。

| 层 | 实现 |
| ---- | ---- |
| 类型 | `NodeData.metrics?: NodeLiveMetrics`（`NodeGpuMetric` 每卡：idx/model/util/temp/powerW/clockMhz/xid；`NodeVllmMetric`：model/qps/gen·prompt tokens/s/avgLatencyS/ttftS/prefixHit/kvCache/running/waiting） |
| 数据 | `useOpsPanelMetrics` 解析 `/api/metrics` 扁平逐卡行（字段对齐 metrics.py 实测：util_perc/temp_c/power_w/sm_clock_mhz/xid_errors）→ `metrics.gpus` + 卡片主指标聚合均值；`inference` → `metrics.vllm`（挂宿主节点）；**未覆盖节点不写 metrics** |
| 展示 | NodeDetailModal 新增「每卡实测（DCGM）」卡（利用率条 + 温度/功耗/频率/XID 告警 + 数据时间戳）与「vLLM 推理实测」八格面板；无覆盖时保留诚实空态 |
| 测试 | +P4 用例（扁平行→gpus×2/聚合 50/vllm 挂载/updatedAt/未覆盖节点不写）；旧 mock 统一扁平形态；空态文案断言同步 |

**浏览器实证（3118）**：yyc3-n1 节点详情 = GPU0 NVIDIA GB10 · 52°C · 12.1W · 2405MHz + vLLM `nemotron-3.5-super-vl` · QPS · 生成 tokens/s · **TTFT 3.52s · 前缀缓存命中 93.8%** · 运行/排队 · KV Cache——全部 OpsPanel 实时实测，截图存档。

## 三、门禁与推进状态

| 项 | 结果 |
| ---- | ---- |
| supabase purge | tsc 0E / lint 0E4W / vitest 289×4941 / build ✓（`1f2b68d`） |
| P4 | tsc 0E / lint 0E4W / vitest 289×**4942** / build ✓ + 实证（`97a37ae`） |
| 落档 31 总纲 | **P1~P4 全部 ✅**；P5（x64/blockmap/公证，部分外部依赖）→ P6（等输入 + M4 设计 11-24 承诺）→ P7（文档全局统一）待续 |

## 四、下一步（P5 起）

1. P5：x64 dmg 镜像重试 + blockmap 修复 + 签名公证（需 Developer ID——负责人提供）
2. P6：#12 NAS 实测（等 key）/ #10 八动作（等接口）/ #13 内容包 / **M4 方案设计（2026-11-24 承诺）**
3. P7：docs/README 索引重建 + docs:check 入 CI + 双域名裁决

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-16 | 初始版本 — supabase 全局退役 + P4 深度接入报告 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
