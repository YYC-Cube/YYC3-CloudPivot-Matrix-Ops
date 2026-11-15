---
file: 006-CP-IM-开发实施阶段-项目文档日志体系总纲.md
title: CP-IM 开发实施阶段 — 项目文档日志体系总纲
description: 项目文档日志体系总纲 — 三轨日志架构、会话四件套、追溯注册表与质量门禁
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-16
updated: 2026-11-16
status: stable
tags: [policy, logging, documentation, traceability]
category: policy
language: zh-CN
audience: developers,managers
complexity: intermediate
project: yyc3-cloud-matrix
phase: development
---

# CP-IM 开发实施阶段 — 项目文档日志体系总纲

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

## 📋 目录

- [一、定位与依据](#一定位与依据)
- [二、三轨日志架构](#二三轨日志架构)
- [三、目录与命名规范](#三目录与命名规范)
- [四、文档标头标尾规范](#四文档标头标尾规范)
- [五、执行日志条目格式](#五执行日志条目格式)
- [六、会话收尾检查清单](#六会话收尾检查清单)
- [七、追溯注册表与校验机制](#七追溯注册表与校验机制)
- [八、质量门禁与校验命令](#八质量门禁与校验命令)
- [九、迭代流程与红线条款](#九迭代流程与红线条款)

---

## 一、定位与依据

本文件是 **YYC3-Cloud-Matrix（YYC³ PivotMatrix Ops）项目文档日志体系**的总纲与唯一权威定义，依据以下团队标规建立：

| 依据标规 | 采纳条款 |
| ---- | ---- |
| 《YYC³ 团队通用-标头标尾》v1.1.0 | §二 Markdown 标头唯一标准、§4.3 完整标尾 |
| 《YYC³ 团队通用-开发标准》v2.1.0 | §1.3~§1.9 元数据字段、SemVer、变更历史 |
| 《YYC³ 团队通用-文档闭环》v2.1.0 | 追溯机制、trace_id / checksum、文档注册中心 |
| 《YYC³ 团队通用-开发文档》v2.1.0 | §2 会话四件套、§3.2 执行日志格式、§4 收尾清单 |

标规与本总纲冲突时，以团队标规为准；本总纲仅做项目级落地细化。

## 二、三轨日志架构

```
┌─────────────────────────────────────────────────────────────────┐
│                YYC3 项目文档日志体系（三轨制）                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  会话轨（高频 · 每次 AI 协同会话必产）                             │
│  └── logs/{ISO周}/{项目名}-{导师标识}-{YYYYMMDD}/                │
│      ├── 00-项目现状审核报告.md    ← Phase 1 输出                 │
│      ├── 01-任务规划与节点目标.md  ← Phase 2 输出                 │
│      ├── 02-执行日志与进度跟踪.md  ← Phase 3 输出（实时更新）      │
│      └── 03-总结文档与状态同步.md  ← Phase 4 输出（收尾必产）      │
│                                                                 │
│  落档轨（中频 · 阶段性成果编号归档）                               │
│  └── docs/20-YYC3-CP-IM-团队通用-标准规范/YYC3-项目推进-总结报告/ │
│      └── {序号}-{主题}-{YYYYMMDD}.md（现有 00~21 序列）           │
│                                                                 │
│  版本轨（低频 · 面向发布的版本化记录）                             │
│  ├── CHANGELOG.md（根目录，Keep a Changelog + SemVer）           │
│  └── docs/00-.../005-CP-IM-项目总览索引-版本更新日志.md           │
│                                                                 │
│  支撑层                                                          │
│  ├── templates/   ← 四件套标准模板（本目录）                      │
│  ├── registry/    ← doc-log-registry.json 追溯注册表             │
│  └── scripts/check-doc-headers.js ← 标头自动校验（pnpm docs:check）│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**三轨写入时机**：

| 轨道 | 触发条件 | 必产动作 |
| ---- | ---- | ---- |
| 会话轨 | 每次多步骤 AI 协同会话 | 创建/续用会话目录；短会话可只更新 02-执行日志并在 03 一句话带过 |
| 落档轨 | 完成一个可交付阶段（真实化批次、架构定稿等） | 在总结报告目录新增编号文档，回填 commit 号 |
| 版本轨 | 版本发布 / 合入 main 的功能性变更 | 更新 CHANGELOG.md（`## [版本] - 日期`） |

## 三、目录与命名规范

### 3.1 会话目录命名（强制）

格式：`{项目名}-{导师标识}-{YYYYMMDD}`，如 `YYC3-Cloud-Matrix-glm-20261116`。

- 项目名：ASCII，`YYC3-Cloud-Matrix`
- 导师标识：AI 模型/导师短名（ASCII 小写），如 `glm`、`kimi`
- 日期：会话起始日 `YYYYMMDD`
- 同一导师多会话同日：追加 `-02` 序号后缀
- 多导师协作：各自独立会话目录，经 03-总结文档衔接；冲突以代码仓库实际状态为准

### 3.2 周容器命名

`logs/{ISO周}/`，如 `logs/2026-W47/`。跨周长会话以起始周归档。

### 3.3 文件命名（强制）

| 文件 | 固定名 | 说明 |
| ---- | ---- | ---- |
| 审核报告 | `00-项目现状审核报告.md` | 会话开工前置分析 |
| 任务规划 | `01-任务规划与节点目标.md` | 节点目标与验收标准 |
| 执行日志 | `02-执行日志与进度跟踪.md` | 实时更新 |
| 总结同步 | `03-总结文档与状态同步.md` | 会话收尾必产 |
| 专项分析 | `{序号}-{主题}分析.md` | 如 `05-性能瓶颈分析.md` |
| 附件 | `attachments/` | 截图、数据等 |

### 3.4 模板文件命名

`{两位序号}-{主题}_template.md`（参照《文档闭环》`{类型}_template.md`），置于 `templates/`。

## 四、文档标头标尾规范

本体系全部文档**一律**使用《YYC³ 团队通用-标头标尾》§二 标头与 §4.3 标尾（本总纲即范例）。要点：

1. frontmatter 字段顺序固定：`file, title, description, author, version, created, updated, status, tags, category, language, audience, complexity`；项目扩展字段（`project, phase, design_type, review_status` 等）追加在 `complexity` 之后
2. `file` 必须与磁盘文件名完全一致；`title` 必须与正文 H1 一致
3. `description` ≤ 50 字；`created/updated` 为 `YYYY-MM-DD`；`tags` 必须为合法 YAML 流式序列 `[a, b, c]`
4. 每次更新必联动：`updated` 置为当日、`version` 按 SemVer 递增、追加变更历史行
5. H1 之后紧跟品牌标语引用块；正文开头含「核心理念」块；标尾前有且仅有一条 `---`

## 五、执行日志条目格式

`02-执行日志与进度跟踪.md` 每个操作条目按以下格式实时追加（新条目在文件顶部或按时间序均可，但同一文件内风格一致）：

```markdown
### {YYYY-MM-DD HH:MM} - {操作摘要}
**操作类型**: 新增功能 / Bug修复 / 重构 / 配置变更 / 其他
**涉及文件**: - [`file.ts`](relative/path/file.ts#L10-L50)
**操作详情**: {具体做了什么，为什么这么做}
**验证结果**: - [x] 测试通过 / - [x] Lint通过 / - [ ] 性能验证
**当前状态**: ✅ 成功 / ⚠️ 有警告 / ❌ 失败 / 🔒 阻塞
**下一步**: {接下来要做什么}
```

文件头部维护「进度总览」表：`| 任务 | 计划状态 | 实际状态 | 偏差 | 原因 |`。

## 六、会话收尾检查清单

**文档类（必须全部完成）**：

- [ ] 00-项目现状审核报告.md 已创建并填写完整
- [ ] 01-任务规划与节点目标.md 已更新至最新状态
- [ ] 02-执行日志与进度跟踪.md 已记录所有操作
- [ ] 03-总结文档与状态同步.md 已生成

**衔接类（关键）**：

- [ ] 写明「下次打开时从哪里继续」（精确到文件、函数、行号）
- [ ] 标注「当前最紧急的 3 个事项」
- [ ] 附「快速恢复命令列表」

**质量门禁（03-总结文档内自查）**：YAML front matter 完整准确、代码链接指向正确行号、所有任务有明确状态、敏感信息使用 `${ENV_VAR}` 或 `[REDACTED]` 占位（绝不记录真实密钥/密码/Token）。

## 七、追溯注册表与校验机制

`registry/doc-log-registry.json` 是本体系文档注册中心，每条记录结构（依《文档闭环》）：

```json
{
  "trace_id": "TRC-YYYYMMDDNNN",
  "document": "相对 docs/ 的文档路径",
  "action": "create | update | review | publish",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "version": "vX.Y.Z",
  "checksum": "内容 SHA256 前 16 位",
  "author": "YYC³ Team",
  "changes": [{ "field": "content", "summary": "变更摘要" }],
  "related_docs": ["关联文档路径"]
}
```

- `trace_id`：`TRC-` + YYYYMMDD + 3 位当日序号（同日递增）
- `checksum` 生成：读取正文 → 移除 frontmatter → SHA256 → 取前 16 位
- 新建或实质更新文档后，须在注册表登记一条记录（`scripts/check-doc-headers.js --registry` 可辅助生成）

## 八、质量门禁与校验命令

```bash
# 标头完整性 + file/title 一致性 + tags 格式校验（本体系目录）
pnpm docs:check

# 注册表登记辅助（生成待登记条目 JSON）
node scripts/check-doc-headers.js --registry docs/03-YYC3-CP-IM-项目开发-实施阶段/0307-CP-IM-开发进度

# 提交前组合门禁（与既有 precommit 链互补）
pnpm docs:check && pnpm type-check && pnpm test:ci
```

门禁判定：`docs:check` 存在任意 **error** 即失败；**warning** 允许通过但须在执行日志中说明。

## 九、迭代流程与红线条款

迭代流程（依 PDCA+ Archive 增强）：识别更新需求 → 变更规划 → 内容更新（基于模板）→ 版本递增 → checksum 生成 → 注册表登记 → 关联文档同步。

红线条款（违反视为会话未完成）：

- ❌ 不保存文档就结束会话（上下文断裂，无法衔接）
- ❌ 跳过现状分析（00-审核报告）直接开发
- ❌ 在日志中记录真实密钥、密码、Token
- ❌ 会话文档缺失 frontmatter 或 `file` 字段与磁盘文件名不一致

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-16 | 初始版本 — 依据四份团队标规建立三轨日志体系并落地会话四件套与注册表 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
