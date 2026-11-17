---
file: YYC3-CloudPivot-Matrix-Ops-项目命名规范.md
title: YYC³ 言语云枢·智能矩阵 项目命名规范 — 唯一名称 · 双轨标识 · 品牌落地
description: YYC³ CloudPivot Matrix Ops（言语云枢·智能矩阵）项目命名规范 v2.0.0，统一唯一项目标识 YYC3-CloudPivot-Matrix-Ops，定义品牌展示轨与技术标识轨、多场景映射、品牌标语体系、前端落地片段与禁用清单
author: YYC³ Team <admin@0379.email>
version: v2.1.0
created: 2026-11-10
updated: 2026-11-17
status: stable
tags: [standard, naming, brand, cloudpivotmatrix, opspanel]
category: policy
language: zh-CN
audience: developers,managers,designers
complexity: basic
---

# YYC³ 言语云枢·智能矩阵 项目命名规范 — 唯一名称 · 双轨标识 · 品牌落地

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

## 一、原始标识与语义拆解

原始标识：`YYC3 CloudPivot-IDeviceMatrix-OpsPanel`

| 词根 | 原义 | 收敛后承载 | 说明 |
| ---- | ---- | ---------- | ---- |
| `YanYuCloudCube` | 品牌商标 | `YYC³` | 与 YYC³ Dynasty 看板家族同宗，品牌资产复用 |
| `CloudPivot` | 云枢 / 云枢纽 | `言语云枢` / `CloudPivot` | 保留“枢”的核心语义，同时承载“言启象限”的语言资产 |
| `IDeviceMatrix` | 异构设备矩阵 | `智能矩阵` / `Matrix` | 设备资产矩阵、算力节点矩阵的智能化表达 |
| `OpsPanel` | 运维管控面板 | `Ops` | 指向运维、巡检、告警、审计 |

**定型名称**

- 中文主名：`言语云枢·智能矩阵`
- 品牌英文名：`YYC³ CloudPivot Matrix Ops`
- 唯一技术标识：`YYC3-CloudPivot-Matrix-Ops`

> 收敛逻辑：四段式长串 → 中文四段品牌名（言语云枢 · 智能矩阵）+ 英文品牌名（YYC³ CloudPivot Matrix Ops）+ 唯一 ASCII 标识（YYC3-CloudPivot-Matrix-Ops），彻底消除 `PivotMatrix` 与 `CloudPivot` 两套写法并行的历史问题。

---

## 二、唯一名称与双轨取值（强制）

> 单项目只允许一个名称，分两条轨道落地，不得交叉混写。

| 轨道 | 用途 | 取值 | 约束 |
| ---- | ---- | ---- | ---- |
| **品牌展示轨** | 界面、商店、宣传物料、文档正文 | `言语云枢·智能矩阵` / `YYC³ CloudPivot Matrix Ops` | 允许 `³`、间隔号与空格，仅限展示层 |
| **技术标识轨** | 仓库、包名、容器、日志、指标、文件路径 | `YYC3-CloudPivot-Matrix-Ops` / `yyc3-cloudpivot-matrix-ops` | 纯 ASCII，禁止 `³`、空格、中文 |

| 名称层级 | 取值 | 使用位置 |
| -------- | ---- | -------- |
| 中文主名 | `言语云枢·智能矩阵` | Web 标签、APP 中文名、侧边栏简称 |
| 品牌英文名 | `YYC³ CloudPivot Matrix Ops` | 对外展示、OG 长标题、商店英文名 |
| 唯一技术标识 | `YYC3-CloudPivot-Matrix-Ops` | 仓库名、文档文件名、Docker 项目、镜像名 |
| 代码标识（slug） | `yyc3-cloudpivot-matrix-ops` | npm 包名、日志 Tag、常量、日志文件名 |
| 产品对外正式全称 | `言语云枢 · YYC³ CloudPivot Matrix Ops 异构算力矩阵运维面板` | 登录页、版权页、文档封面 |

> 命名选用原则：**单项目只允许一个主名，且只有上述一套双轨取值**。A2/A3/B1/B2/C1/D1 等备选命名矩阵已作废，不得再作为并列产品、子品牌或交付形态对外出现。

---

## 三、多场景命名映射（统一落地值）

| 场景 | 取值 | 备注 |
| ---- | ---- | ---- |
| Web 浏览器 Title（强制） | `言语云枢·智能矩阵` | `index.html` 与 `useYYC3Head` 统一，页签不追加英文 |
| Web 浏览器 Title（长版 / OG） | `言语云枢·智能矩阵 \| YYC³ CloudPivot Matrix Ops` | 仅用于 `og:title`、分享卡片、文档封面 |
| APP / PWA 中文名 | `言语云枢·智能矩阵` | 桌面图标名、应用商店名 |
| APP 英文名 | `CloudPivot Matrix Ops` | 应用商店英文回退名 |
| 产品对外正式全称 | `言语云枢 · YYC³ CloudPivot Matrix Ops 异构算力矩阵运维面板` | 登录页、版权页、文档封面 |
| 简称（侧边栏 / 导航） | `言语云枢·智能矩阵` | 大屏标题可用 `CloudPivot Matrix` |
| 项目唯一标识 / 文档文件名 | `YYC3-CloudPivot-Matrix-Ops` | 与仓库名一一对应 |
| 代码内部标识（常量 / 日志 Tag） | `yyc3-cloudpivot-matrix-ops` | 全小写连字符，禁止上标字符 |
| npm 包名 / 仓库根包 | `yyc3-cloudpivot-matrix-ops` | 与仓库名对齐，ASCII 形式 |
| npm 作用域包名（子包） | `@yyc3/cloudpivot-matrix-ops` | 与品牌 ASCII 规则一致 |
| Git 仓库名 | `YYC3-CloudPivot-Matrix-Ops` | 与项目唯一标识一致 |
| Electron `appId` | `com.yyc3.cloudpivot.matrix` | 与包名同源 |
| 安装包 artifactName | `YYC3-CloudPivotMatrix-${version}-${os}-${arch}.${ext}` | 品牌驼峰 + 版本 + 平台 |
| Docker Compose 项目名 | `yyc3-cloudpivot-matrix` | 服务名加后缀如 `yyc3-cloudpivot-matrix-api` |
| K8s Namespace | `yyc3-cloudpivot-matrix` | |
| 生产域名 | `ops.yyc3.vip` | `public/CNAME` 为唯一真源，CI 门禁校验 |
| 推荐品牌域名 | `cloudpivot.yanyucloudcube.com` | 品牌宣传 / 301 跳转 |
| 内网域名 | `cloudpivot.yyc3.local` | Tailscale / 内网解析 |
| 环境变量前缀 | `PMO_` | 已全仓落地，作为冻结资产保留（见注） |
| 日志文件名 | `yyc3-cloudpivot-matrix-ops.log` | 轮转后缀 `.{date}` |
| 指标 / Prometheus Job | `cloudpivot_matrix_ops` | 采集 Job 与 Grafana Dashboard 前缀 |

> **`PMO_` 前缀说明**：`PMO_` 为 `Pivot Matrix Ops` 历史缩写，已在 `.env.example`、`vite.config.ts`、`deploy/` 全量落地，本轮作为**冻结标识**保留，不再视为名称变体；若后续迁移为统一前缀，须全仓一次性同步并保留兼容读取。

---

## 四、品牌标语与 Slogan 体系

### 4.1 家族级标语（沿用，不得改写）

| 序号 | 中文 | 英文 |
| ---- | ---- | ---- |
| 1 | 言启象限 \| 语枢未来 | Words Initiate Quadrants, Language Serves as Core for Future |
| 2 | 万象归元于云枢 \| 深栈智启新纪元 | All things converge in cloud pivot; Deep stacks ignite a new era of intelligence |

### 4.2 产品级 Slogan（本产品专属）

**对外品牌版**

- 中文：**万源汇枢，阵驭算力**
- 英文：**Converge at Pivot, Govern the Matrix**

**运维对内版（告警页、巡检大屏、值班看板）**

- 中文：**矩阵统一管控，算力可视可管**
- 英文：**Unified Matrix Control for Heterogeneous Compute**

> 使用约束：产品级 Slogan 仅出现在登录页副标、大屏顶部、宣传物料；代码注释与文档标头标尾**只允许**使用家族级标语（§4.1）。

---

## 五、前端落地片段

### 5.1 HTML `<head>` 元信息

```html
<title>言语云枢·智能矩阵</title>
<meta name="description" content="言语云枢·智能矩阵（YYC³ CloudPivot Matrix Ops）异构算力矩阵运维面板，统一纳管 Apple M 系列、DGX GPU、NAS 与 BMC 节点，覆盖实时监控、巡检、告警、权限审计与工单运维">
<meta name="keywords" content="言语云枢,智能矩阵,YYC³,CloudPivot,Matrix,Ops,算力矩阵,异构运维,DGX,M4 Max,NAS,设备矩阵,运维面板,监控告警,巡检">
<meta name="application-name" content="言语云枢·智能矩阵">
<meta name="apple-mobile-web-app-title" content="言语云枢·智能矩阵">
<meta property="og:site_name" content="言语云枢·智能矩阵">
<meta property="og:title" content="言语云枢·智能矩阵 | YYC³ CloudPivot Matrix Ops">
```

### 5.2 Web App Manifest

```json
{
  "name": "言语云枢·智能矩阵 | YYC³ CloudPivot Matrix Ops",
  "short_name": "言语云枢·智能矩阵",
  "description": "异构算力矩阵统一运维面板 — 监控、巡检、告警、审计、工单闭环",
  "lang": "zh-CN",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#060e1f",
  "background_color": "#060e1f",
  "icons": [
    { "src": "/yyc3-icons/Web App/android-chrome-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/yyc3-icons/Web App/android-chrome-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 5.3 i18n 基础词条

```json
{
  "appName": { "zh": "言语云枢·智能矩阵", "en": "CloudPivot Matrix Ops" },
  "appFullName": {
    "zh": "言语云枢 · YYC³ CloudPivot Matrix Ops 异构算力矩阵运维面板",
    "en": "YYC³ CloudPivot Matrix Ops — Heterogeneous Compute Matrix Operations Panel"
  },
  "appSlogan": {
    "zh": "万源汇枢，阵驭算力",
    "en": "Converge at Pivot, Govern the Matrix"
  },
  "appSloganOps": {
    "zh": "矩阵统一管控，算力可视可管",
    "en": "Unified Matrix Control for Heterogeneous Compute"
  }
}
```

### 5.4 前端常量（TypeScript）

```typescript
// ============================================================
// YYC³（YanYuCloudCube™ · 注册商标）
// 言启象限 | 语枢未来 · Words Initiate Quadrants, Language Serves as Core for Future
// 万象归元于云枢 | 深栈智启新纪元
// All things converge in cloud pivot; Deep stacks ignite a new era of intelligence
// ============================================================
// Copyright (c) 2026 YanYuCloudCube™（YYC³）| admin@0379.email
// ============================================================

export const APP_BRAND = {
  nameZh: '言语云枢·智能矩阵',
  nameEn: 'CloudPivot Matrix Ops',
  fullNameZh: '言语云枢 · YYC³ CloudPivot Matrix Ops 异构算力矩阵运维面板',
  fullNameEn: 'YYC³ CloudPivot Matrix Ops — Heterogeneous Compute Matrix Operations Panel',
  slug: 'yyc3-cloudpivot-matrix-ops',
  projectId: 'YYC3-CloudPivot-Matrix-Ops',
  envPrefix: 'PMO_',
  domain: 'ops.yyc3.vip',
  author: 'YYC³ Team',
  email: 'admin@0379.email',
} as const;
```

---

## 六、视觉与图标命名

| 资产 | 命名 | 尺寸 |
| ---- | ---- | ---- |
| README 顶图 | `public/yyc3-matrix.png` | 原始尺寸，不缩放 |
| 应用图标 | `cloudpivot-matrix-192.png` / `cloudpivot-matrix-512.png` | 192 / 512 |
| 品牌 Logo（横版） | `yyc3-cloudpivot-matrix-logo-h.svg` | 矢量 |
| 登录页主视觉 | `cloudpivot-matrix-login-hero.webp` | 2560×1440 |
| 大屏驾驶舱背景 | `cloudpivot-matrix-dashboard-bg.webp` | 3840×2160 |
| 告警卡片标识 | `cloudpivot-matrix-alert-badge.svg` | 矢量 |

- 图标文字统一使用 **言语云枢·智能矩阵**，禁止压入英文长串
- 深色底 + 金属灰主色，与 YYC³ Dynasty 家族视觉一致

---

## 七、命名禁用清单（强制）

1. 禁止使用带序号或后缀的品牌变体：`YanYuCloudCube 02`、`YYC3 v2 面板` 等
2. 禁止在文件、目录、容器、镜像名中使用上标字符 `³`：一律写 `yyc3-` 前缀 ASCII 形式
3. 禁止继续使用 `PivotMatrix` 系列写法：`YYC³ PivotMatrix Ops`、`PivotMatrix Ops`、`iMatrixOps`、`PivotPanel`、`UniMatrix`、`ArrayGuard`、`YYC3-Pivotmatrix-Ops-Panel`、`yyc3-pivotmatrix-ops-panel` 一律视为历史名
4. 禁止并列使用两套英文名（`PivotMatrix` 与 `CloudPivot`）作为同一系统的正式名，对外只暴露主名
5. 禁止把 `OpsPanel` 直接留作面向用户的名词：需中文化为“运维面板 / 运维中心 / 管控台”
6. 禁止浏览器页签 Title 追加英文或副标题：页签固定为 `言语云枢·智能矩阵`（7 个汉字 + 间隔号），英文信息只能进入 `og:title`
7. 禁止在代码标头写产品级 Slogan，代码标头只允许家族级标语（§4.1）
8. 禁止把域名、邮箱、商标主体改写成其它近似写法：固定为 `ops.yyc3.vip`（生产入口）、`yanyucloudcube.com`（品牌域名）、`admin@0379.email`、`YanYuCloudCube™（YYC³）`
9. 禁止继续使用历史名 `Cloud Intelli-Matrix` / `CloudPivot-IDeviceMatrix-OpsPanel` 作为对外展示名（仅允许出现在历史归档与变更记录中）
10. 禁止双轨交叉：技术标识轨中不得出现中文、`³`、空格；品牌展示轨不得用于路径、包名、容器名、Namespace

---

## 八、落地检查清单

- [x] `index.html` 的 `<title>` 命中 `言语云枢·智能矩阵`
- [x] `public/CNAME` 为 `ops.yyc3.vip`，CI 门禁与 `APP_BRAND.domain` 双向一致
- [x] 环境变量前缀 `PMO_` 已落库并保留兼容读取
- [x] `package.json` 的 `name` 统一为 `yyc3-cloudpivot-matrix-ops`
- [x] `package.json` 的 `description` / `build.productName` / `artifactName` / `appId` 统一为 CloudPivot 轨道
- [x] `public/manifest.json` 的 `name` 去掉 `YYC³ PivotMatrix Ops`
- [x] `index.html` 的 `description` / `keywords` / `og:title` 同步 CloudPivot 写法
- [x] `src/app/config/app-brand.ts` 的 `nameEn` / `fullName*` / `slug` 同步，并新增 `projectId`
- [x] `src/app/i18n/zh-CN.ts`、`en-US.ts` 词条同步（`appName` / `appFullName`）
- [x] `.env.example` 的 `PMO_SYSTEM_NAME`、`src/app/hooks/useSettingsStore.ts` 的 `systemName` 同步
- [x] `README.md` 首行与文档封面使用产品正式全称
- [x] Git 仓库名统一为 `YYC3-CloudPivot-Matrix-Ops`
- [x] 全仓库无 `PivotMatrix` / `Pivotmatrix` / `pivotmatrix` 残留（历史归档与变更记录除外）

---

## 九、校验命令

```bash
# 1. 检查 Web Title 合规（应为空）
grep -n "<title>" index.html | grep -v "言语云枢·智能矩阵"

# 2. 检查历史名残留（应为空，docs 归档除外）
grep -rn "PivotMatrix\|Pivotmatrix\|pivotmatrix\|Cloud Intelli-Matrix\|IDeviceMatrix" \
  --include="*.ts" --include="*.tsx" --include="*.html" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=docs .

# 3. 检查上标字符进入路径（应为空）
find . -name "*³*" -not -path "./node_modules/*"

# 4. 检查品牌常量是否被硬编码绕过（应为空）
grep -rn "言语云枢" --include="*.tsx" src/ | grep -v "APP_BRAND"

# 5. 检查双轨混写（应为空）
grep -rn "YYC3 CloudPivot\|YYC³-CloudPivot\|yyc3_pivotmatrix" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" .

# 6. 检查域名真源一致性（应输出 OK）
domain="$(tr -d '[:space:]' < public/CNAME)"
grep -q "domain: \"$domain\"" src/app/config/app-brand.ts && echo "OK: $domain"
```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-10 | 由 `YYC3 CloudPivot-IDeviceMatrix-OpsPanel` 收敛定名 `YYC³ PivotMatrix Ops`，新增多场景命名矩阵、品牌标语分层、前端落地片段、禁用清单与校验命令 | YYC³ Team |
| v1.1.0 | 2026-11-10 | Web 标签与 APP 中文名统一为「言语云枢·智能矩阵」，同步 `index.html` / `manifest.json` / Electron 窗口 / `package.json` / i18n；生产域名收敛为 `ops.yyc3.top`；新增历史名禁用条款与 README 顶图命名 | YYC³ Team |
| v2.0.0 | 2026-11-17 | 全文档名称统一为 `YYC3-CloudPivot-Matrix-Ops`；确立「品牌展示轨 + 技术标识轨」双轨制；删除 A2/A3/B1/B2/C1/D1 备选命名矩阵，`PivotMatrix` 全系列降为历史名；生产域名校正为 `matrix.yyc3.vip`（`public/CNAME` 真源）；更新落地片段、禁用清单、检查清单与校验命令 | YYC³ Team |
| v2.1.0 | 2026-11-17 | 生产域名迁移为 `ops.yyc3.vip`（`public/CNAME` 真源），同步 `APP_BRAND.domain`、README、CI 注释与 Pages 部署门禁；CI 新增「品牌与域名守卫」与 CNAME 双向一致性校验；补全 `package.json` 关键词与 README 项目概述/标签 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
