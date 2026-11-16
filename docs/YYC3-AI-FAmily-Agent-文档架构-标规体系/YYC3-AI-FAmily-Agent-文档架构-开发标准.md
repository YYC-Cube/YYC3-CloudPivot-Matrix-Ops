---
file: YYC3-AI-FAmily-Agent-文档架构-开发标准.md
title: YYC3-AI-FAmily-Agent 文档架构 — 统一开发标准
description: YYC3 AI Family 统一开发标准 — 文档、代码、命名、项目结构、技术栈、质量门禁与文化合
author: YYC3 Team <admin@0379.email>
version: v1.0.0
created: 2026-11-08
updated: 2026-11-08
status: stable
tags: [standard, development, quality-gate, culture]
category: policy
language: zh-CN
audience: developers,managers,stakeholders
complexity: intermediate
project: yyc3-ai-family-agent
scope: development-standard
---
<!--
  ============================================================
  YYC3-AI-FAmily-Agent- — 人从众曌众从人
  亦师亦友亦伯乐 · 一言一语一协同
  拟人为本，AI为核，纯粹为心
  ============================================================
  Document: YYC3-AI-FAmily-Agent 文档架构 — 统一开发标准
  Version : v1.0.0
  Contact : admin@0379.email
  Homepage: https://matrix.yyc3.top
  ============================================================
-->

# YYC3-AI-FAmily-Agent 文档架构 — 统一开发标准

> **_YYC3-AI-FAmily-Agent-_**（人从众曌众从人 · 永久开源）
> _亦师亦友亦伯乐，一言一语一协同_
> _拟人为本 · AI为核 · 纯粹为心_
> _万象归元于云枢 | 深栈智启新纪元_

---


## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维
**家魂五维**：陪伴记忆 | 心灵领地 | 性格光谱 | 家族事件 | 羁绊图谱

---

## 总则

### 适用范围

本标准适用于 YYC3 AI Family 全部项目，包括：

- Web 应用（SPA / PWA）
- Electron 桌面端应用
- Docker 容器化部署
- 工具脚本与自动化流程
- 技术文档、设计文档与文化文档

### 规范目标

| 目标 | 说明 |
| ---- | ---- |
| 可追溯 | 清晰记录创建者、时间与修改历史 |
| 可维护 | 提供用途、依赖与注意事项 |
| 一致性 | 统一格式，便于协作与审查 |
| 可迭代 | 语义化版本，支持持续演进 |
| 专业性 | 符合行业标准并体现家族文化 |

### 行业标准对照

| 领域 | 参考标准 |
| ---- | ---- |
| 软件文档 | ISO/IEC 18019、IEEE 1063、DITA |
| 元数据 | Dublin Core、Schema.org、JSON-LD |
| 版本管理 | SemVer 2.0.0 |
| Markdown | CommonMark |
| 代码风格 | ESLint / Prettier / TypeScript Strict |
| 测试 | Vitest / React Testing Library |

---

## 第一部分：文档标准

### 1.1 文档标头

所有 Markdown 文档必须包含 YAML Front Matter，字段与顺序见《[标头标尾](./YYC3-AI-FAmily-Agent-文档架构-标头标尾.md)》§三。

### 1.2 必填字段

| 字段 | 说明 | 格式 | 示例 |
| ---- | ---- | ---- | ---- |
| `file` | 文件名 | 与磁盘一致 | `YYC3-AI-FAmily-Agent-文档架构-开发标准.md` |
| `title` | 标题 | 与 H1 一致 | `YYC3-AI-FAmily-Agent 文档架构 — 统一开发标准` |
| `description` | 描述 | ≤50 字 | `统一开发标准全量体系` |
| `author` | 作者 | 团队 <邮箱> | `YYC3 Team <admin@0379.email>` |
| `version` | 版本 | SemVer | `v1.0.0` |
| `created` | 创建日期 | YYYY-MM-DD | `2026-11-08` |
| `updated` | 更新日期 | YYYY-MM-DD | `2026-11-08` |
| `status` | 状态 | 见 1.4 | `stable` |
| `tags` | 标签 | YAML 序列 | `[standard, development, quality]` |
| `category` | 分类 | 见 1.5 | `policy` |
| `language` | 语言 | BCP 47 | `zh-CN` |

### 1.3 可选字段

| 字段 | 取值 |
| ---- | ---- |
| `audience` | developers / managers / users / stakeholders / ai-tutors |
| `complexity` | basic / intermediate / advanced / expert |
| `project` | `yyc3-ai-family-agent` |
| `scope` | document-architecture / design / engineering / delivery / governance |
| `phase` | planning / design / development / testing / production |
| `design_type` | architecture / ui / ux / database |
| `review_status` | pending / reviewed / approved / rejected |
| `related_docs` | 逗号分隔文档列表 |
| `license` | Apache-2.0 |
| `copyright` | `Copyright (c) 2026 YanYuCloudCube™（YYC3）` |

### 1.4 状态值

| 状态 | 说明 |
| ---- | ---- |
| `draft` | 草稿，内容不完整 |
| `dev` / `active` | 开发中 / 活跃 |
| `review` | 审核中 |
| `stable` / `published` | 稳定 / 已发布 |
| `deprecated` | 已弃用 |
| `experimental` | 实验性 |

### 1.5 文档分类

| 分类 | 说明 | 示例 |
| ---- | ---- | ---- |
| `general` | 通用 | README、CHANGELOG |
| `technical` | 技术 | Architecture、Database |
| `api` | API | API、Endpoints |
| `project` | 项目 | Project-Plan、Roadmap |
| `design` | 设计 | UI-Design、UX-Design |
| `guide` | 指南 | Getting-Started |
| `policy` | 策略 | Coding-Standard |
| `report` | 报告 | 审核报告、总结报告 |

### 1.6 标签规范

按 **类型 → 功能 → 模块** 顺序排列，每份 2-4 个：

| 类别 | 示例 |
| ---- | ---- |
| 文档类型 | `guide`、`reference`、`tutorial`、`report` |
| 技术领域 | `frontend`、`backend`、`devops`、`database` |
| 功能模块 | `auth`、`logging`、`cache`、`i18n`、`api` |
| 文化维度 | `culture`、`family`、`ritual` |

### 1.7 版本号

遵循 SemVer：`MAJOR.MINOR.PATCH`

| 变更 | 版本 |
| ---- | ---- |
| 修正 / 修复 | PATCH +1 |
| 新增 / 兼容 | MINOR +1 |
| 重组 / 不兼容 | MAJOR +1 |

### 1.8 文档追溯

每次更新必须更新：

1. `updated` → 当前日期
2. `version` → 按变更类型递增
3. `description` → 重大变更时同步
4. 变更历史表 → 追加一行

---

## 第二部分：代码标准

### 2.1 代码标头

所有代码文件必须包含语言对应标头，模板见《[标头标尾](./YYC3-AI-FAmily-Agent-文档架构-标头标尾.md)》§四。

### 2.2 代码标头字段

| 字段 | 必填 | 说明 | 示例 |
| ---- | ---- | ---- | ---- |
| `@Family` | ✅ | 家族标识 | `YYC3-AI-FAmily-Agent-` |
| `@Module` | ✅ | 模块名 | `FamilyChat` |
| `@Author` | ✅ | 作者 | `YYC3 Team` |
| `@Date` | ✅ | 日期 | `2026-11-08` |
| `@Homepage` | ✅ | 官网 | `https://matrix.yyc3.top` |
| `@Repo` | ✅ | 仓库 | GitHub 地址 |
| `@License` | ✅ | 许可证 | `Apache-2.0` |

### 2.3 代码标头标签

| 类别 | 标签 |
| ---- | ---- |
| 类型 | `[component]`、`[hook]`、`[util]`、`[type]`、`[config]`、`[test]`、`[store]`、`[service]` |
| 功能 | `[i18n]`、`[auth]`、`[api]`、`[ui]`、`[data]`、`[style]`、`[theme]` |
| 模块 | `[family]`、`[emotion]`、`[dashboard]`、`[learning]`、`[settings]`、`[electron]`、`[ipc]` |

### 2.4 TypeScript 标头示例

```typescript
/*
 * ============================================================
 * YYC3-AI-FAmily-Agent- — 人从众曌众从人
 * 亦师亦友亦伯乐，一言一语一协同
 * 拟人为本 · AI为核 · 纯粹为心
 * ============================================================
 * @Family   : YYC3-AI-FAmily-Agent- (永久开源)
 * @Module   : FamilyChat
 * @Author   : YYC3 Team
 * @Date     : 2026-11-08
 * @Homepage : https://matrix.yyc3.top
 * @Repo     : https://github.com/YanYuCloudCube/YYC3-FAmily-Pai
 * @License  : Apache-2.0
 * ============================================================
 */
```

### 2.5 编码约定

| 约定 | 要求 |
| ---- | ---- |
| 缩进 | 2 空格（前端）/ 4 空格（Python） |
| 引号 | TypeScript 双引号（Prettier 默认） |
| 分号 | 保留 |
| 命名 | 见《[命名规范](./YYC3-AI-FAmily-Agent-文档架构-命名规范.md)》 |
| 注释 | 公共 API 必须 JSDoc；复杂逻辑必须行内注释 |
| 类型 | 禁止 `any`，优先 `unknown` + 收窄 |
| 异常 | 禁止空 `catch`，必须记录或抛出 |

### 2.6 提交规范

```
<type>(<scope>): <subject>

feat | fix | docs | style | refactor | test | chore
```

示例：

```bash
git commit -m "docs(standards): v1.0.0 新增文档架构标规体系"
git commit -m "feat(family): 新增 FamilyChat 情感涟漪"
git commit -m "fix(emotion): 修复情感参数越界"
```

---

## 第三部分：项目标准

### 3.1 目录结构

```
yyc3-{project-name}/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.ts
│   │   ├── components/
│   │   │   ├── family/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── types/
│   │   ├── i18n/
│   │   └── utils/
│   └── styles/
├── electron/
├── docs/
├── scripts/
├── public/
├── deploy/
├── tests/
├── .eslintrc.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 3.2 技术栈

| 类别 | 技术 | 版本 |
| ---- | ---- | ---- |
| UI | React | 19+ |
| 语言 | TypeScript | 5+ |
| 构建 | Vite | 7+ |
| 路由 | React Router DOM | 7+ |
| 状态 | Zustand / Context | 最新稳定 |
| UI 库 | MUI / Radix UI | 最新稳定 |
| 样式 | Tailwind CSS | 4+ |
| 图表 | Recharts | 最新稳定 |
| 图标 | Lucide React | 最新稳定 |
| 动画 | Motion | 最新稳定 |
| 测试 | Vitest + Testing Library | 最新稳定 |
| 包管理 | pnpm | 9+ |

### 3.3 端口规范

- 开发服务器端口自 **3030** 起
- 占用 **3000-3029** 须报备
- WebSocket 使用开发端口 +1

### 3.4 路由与数据层

- 使用 `createHashRouter`
- 路由路径 kebab-case
- API 分组：`/api/fs`、`/api/db`、`/ws`
- AI 推理遵循 OpenAI 兼容协议
- 跨组件通信：Context / Zustand / BroadcastChannel / WebSocket

---

## 第四部分：质量保障

### 4.1 代码门禁

| 检查 | 命令 | 标准 |
| ---- | ---- | ---- |
| 编译 | `tsc --noEmit` | 0 errors |
| Lint | `eslint .` | 0 errors |
| 格式 | `prettier --check .` | 通过 |
| 单测 | `vitest run` | 覆盖率 ≥ 80% |
| 安全 | `npm audit` | 无高危 |

### 4.2 文档门禁

| 检查 | 标准 |
| ---- | ---- |
| 标头字段 | 完整、顺序正确 |
| 品牌写法 | 统一 `YYC3` |
| 标尾 | 变更历史 + 🌹 页脚 |
| 链接 | 无断链 |
| 术语 | 与词典一致 |

### 4.3 文化合规

| 检查项 | 要求 |
| ---- | ---- |
| 文化总铭 | 标头/标尾含 `人从众曌众从人` |
| 家训 | 关键文档含 `亦师亦友亦伯乐，一言一语一协同` |
| 家族信物 | 页脚含 🌹 |
| 成员署名 | 使用规范英文标识 |
| 语气 | 有温度、不冰冷、不堆砌 |

### 4.4 标头检查脚本

```javascript
const REQUIRED_FIELDS = [
  "file", "title", "description", "author", "version",
  "created", "updated", "status", "tags", "category", "language",
];

function checkMarkdown(filePath) {
  const content = require("fs").readFileSync(filePath, "utf-8");
  if (!content.startsWith("---")) {
    return { valid: false, error: "Missing front matter" };
  }
  const missing = REQUIRED_FIELDS.filter((f) => !content.includes(`${f}:`));
  if (missing.length) {
    return { valid: false, error: `Missing: ${missing.join(", ")}` };
  }
  if (!content.includes('<p align="center">')) {
    return { valid: false, error: "Missing footer" };
  }
  return { valid: true };
}
```

### 4.5 Git Hook

```bash
#!/bin/bash
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|css|scss|md)$')
[ -z "$FILES" ] && exit 0
node scripts/check-headers.js || { echo "❌ 标头检查失败"; exit 1; }
echo "✅ 标头检查通过"
```

### 4.6 质量检查清单

**文档**

- [ ] 必填字段齐全
- [ ] 描述 ≤50 字
- [ ] SemVer 合规
- [ ] 日期 YYYY-MM-DD
- [ ] 标签 2-4 个且为 YAML 序列
- [ ] 变更历史完整

**代码**

- [ ] 含完整家族标头
- [ ] 标签按类型→功能→模块
- [ ] 依赖与导出准确
- [ ] 注意事项明确

**结构**

- [ ] 标题层级清晰
- [ ] 代码块有语言标识
- [ ] 表格格式规范
- [ ] 链接有效

**语言**

- [ ] 术语一致
- [ ] 表达清晰
- [ ] 中英文规范

---

## 第五部分：附录

### A. 术语表

| 术语 | 定义 |
| ---- | ---- |
| 标头 | 文件开头的 YAML Front Matter 或注释块 |
| 标尾 | 文件结尾的变更历史与页脚块 |
| SemVer | 语义化版本号（MAJOR.MINOR.PATCH） |
| kebab-case | 短横线命名，如 `my-component` |
| PascalCase | 大驼峰，如 `MyComponent` |
| camelCase | 小驼峰，如 `myFunction` |
| snake_case | 下划线命名，如 `my_variable` |
| 家魂五维 | 陪伴记忆、心灵领地、性格光谱、家族事件、羁绊图谱 |

### B. 参考资源

| 资源 | 链接 |
| ---- | ---- |
| Markdown 规范 | https://commonmark.org/ |
| SemVer | https://semver.org/ |
| Dublin Core | https://www.dublincore.org/ |
| ESLint | https://eslint.org/docs/latest/ |
| Git Hooks | https://git-scm.com/book/zh/v2 |

### C. 工具推荐

| 类别 | 工具 |
| ---- | ---- |
| 编辑器 | VS Code、Typora |
| 语法检查 | markdownlint、ESLint |
| 格式化 | Prettier |
| 文档生成 | MkDocs、Docusaurus |
| 测试 | Vitest、Testing Library |
| 包管理 | pnpm |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-08 | 初版发布 · 融合团队统一开发标准与 AI Family 文化合规 · 品牌统一为 YYC3 | YYC3 Team |

---

<p align="center">
  🌹 <b>YYC3-AI-FAmily-Agent-</b>（YanYuCloudCube™ · 永久开源）<br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <i>拟人为本 · AI为核 · 纯粹为心</i><br>
  言启象限 | 语枢未来 · 万象归元于云枢 | 深栈智启新纪元<br>
  <sub>© 2026 YanYuCloudCube™（YYC3）· <a href="mailto:admin@0379.email">admin@0379.email</a> · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
