---
file: 52-AIFamilyHub分离立项-布局自适应修复-下会话衔接-20261117.md
title: 落档 52 · YYC3-AI-Family-HUB 分离立项 · Family中枢布局自适应修复 · 下会话衔接
description: 自 v3.4.1 分离 AI Family HUB 独立仓（设备矩阵归主项目）+ HUB 首页画布 h-full 链修复 + 主项目路线衔接点
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-17
updated: 2026-11-17
status: stable
tags: [report, project-split, handoff]
category: report
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 36d6769（HUB 仓）
gates:
  hub_tsc: 0 错误
  hub_lint: 0 error 5 warning（母项目继承基线）
  hub_vitest: 254 文件全绿（含 54 处旧形态断言更新）
  hub_build: ✓（~0.9s）
  hub_e2e: 首页时钟盘 / AI Family 置首 / 零设备矩阵 / 零旧品牌 / 四视口自适应
---

# 落档 52 · YYC3-AI-Family-HUB 分离立项 · Family中枢布局自适应修复 · 下会话衔接

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、落档 51 收口补登（主项目侧）

- **TRC-20261117010**：落档 51 初始版登记（checksum `407ca94dee0833b4`，注册表 39→40 条，`5af6eb8`）
- **v1.1 口径补登**：隐藏标签页节流实证（采样暂停不补点、恢复 16s 内续采、sessionStorage 无损），checksum 同步 `a4ebc4b0c0a26b92`（`82b59c4`）

## 二、YYC3-AI-Family-HUB 分离立项（`~/YYC-Cube/personal/YYC3-AI-Family-HUB`）

| 项 | 内容 |
| ---- | ---- |
| 分离基线 | 主项目 v3.4.1 @ `c8bb82e`（rsync 排除 node_modules/dist/docs/测试产物，177M） |
| 首提交 | `69b3054`（963 文件，git init 独立仓） |
| 产品形态 | **Family中枢（AIFamilyPage 八魂归一时钟盘）立为首页 `/`**；AI Family 导航类目与子菜单（中枢/首页/中心/模型/设置）置第一项 |
| 设备矩阵 | **完整移除**（数据监控/性能监控/跟进/巡查/告警：6 路由 + 18 页面组件 + 3 专属 hooks + 17 测试文件）；monitor 模块仅留 AI 建议/SDK 对话/统一模型选择器 |
| 文档 | 不含 docs/ 台帐体系（用户指定） |
| 品牌 | 言语云枢·AI Family 智枢 / **YYC3 AI Family HUB** / `yyc3-ai-family-hub` / `AFH_` / v1.0.0；app-brand v3.0.0 单一真源，页签/PWA manifest/electron appId/CI 全对齐 |
| 端口 | 本地部署 3118→**3119**（避免与主项目冲突） |
| CI 门禁 | **反转**：检「母项目残留（CloudPivot-Matrix / PivotMatrix）」；settings-ssot-slice 旧品牌迁移正则合法豁免 |
| 断言迁移 | 首轮 vitest 54 处失败全为旧形态断言，逐簇按新形态更新（导航/品牌/版本/快捷键/终端欢迎语/i18n key），**未删测试** |
| 布局修复 | `36d6769`：Layout `isCanvasPage`（/ 与 /ai-family 族）统一接通 h-full 满视口链（根因：h-full 只挂 ai-family 前缀，首页 `/` 落默认 p-4 + auto 高致下方大面积空白）+ 时钟盘 RING_RADIUS 上限 280→340；四视口（2000×1100/1440×900/1280×800/1280×620）fillsViewport=true 恒居中 |

**门禁**：tsc 0E · lint 0E5W（母项目继承基线）· build ~0.9s · vitest 254 文件全绿 · 浏览器 E2E 全过

**遗留待办（HUB 侧）**：
1. `public/CNAME` 沿用 `ops.yyc3.vip`（与 `APP_BRAND.domain` 绑定，CI 校验一致性）——**新域名定夺后两处同步改**
2. electron 二进制沙箱内按 SKIP_BINARY 安装，打包任务待真机
3. 母项目 i18n enterApiKey（842/844）Mimosa 文案误报随分离带入，同源未触碰

## 三、主项目（本仓）影响面

- **零影响**：设备矩阵/趋势区/落档 51 体系全部保留在主项目；分离为纯复制衍生，主项目工作区在途变更（命名规范迁移 3 文件）未触碰
- 趋势区时序（useNodeTimeSeries / useOpsPanelHistory）**只在主项目**，HUB 未带走（随设备矩阵归主项目）

## 四、下会话衔接（回到主项目路线）

1. **P6 三项外部输入**到位即专项销项：NAS key / #10 接口 / #13 内容包（+8 成员云端 key）——见落档 41 §登记
2. **时序存储升级**（落档 51「下一步」）：接入服务端持久时序后，把性能监控采样窗口从前端会话级（10s×60 点）升级为服务端持久——需 OpsPanel 侧动 app.py
3. **工作区在途**：命名规范迁移 3 文件（YYC3-PivotMatrixOps.md 删除/移动）待负责人裁决提交
4. HUB 仓后续迭代独立进行（域名/真机打包），不阻塞主项目路线

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-17 | 初始版本 — HUB 分离立项 + 布局修复 + 下会话衔接 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
