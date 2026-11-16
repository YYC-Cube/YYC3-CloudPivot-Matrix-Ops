---
file: YYC3-AI-FAmily-Agent-文档架构-命名规范.md
title: YYC3-AI-FAmily-Agent 文档架构 — 命名规范
description: YYC3 AI Family 命名规范 — 目录、文件、代码标识、家族成员、徽章与版本命名的统一标准
author: YYC3 Team <admin@0379.email>
version: v1.0.0
created: 2026-11-08
updated: 2026-11-08
status: stable
tags: [standard, naming, directory, culture]
category: policy
language: zh-CN
audience: developers,managers,stakeholders
complexity: basic
project: yyc3-ai-family-agent
scope: document-architecture
---
<!--
  ============================================================
  YYC3-AI-FAmily-Agent- — 人从众曌众从人
  亦师亦友亦伯乐 · 一言一语一协同
  拟人为本，AI为核，纯粹为心
  ============================================================
  Document: YYC3-AI-FAmily-Agent 文档架构 — 命名规范
  Version : v1.0.0
  Contact : admin@0379.email
  Homepage: https://matrix.yyc3.top
  ============================================================
-->

# YYC3-AI-FAmily-Agent 文档架构 — 命名规范

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

## 📋 目录

- [一、命名总则](#一命名总则)
- [二、品牌命名](#二品牌命名)
- [三、目录命名](#三目录命名)
- [四、文件命名](#四文件命名)
- [五、代码标识命名](#五代码标识命名)
- [六、家族成员与徽章命名](#六家族成员与徽章命名)
- [七、版本与分支命名](#七版本与分支命名)
- [八、命名反例与纠正](#八命名反例与纠正)
- [九、校验方法](#九校验方法)

---

## 一、命名总则

### 1.1 五条铁律

| 铁律 | 要求 | 反例 |
| ---- | ---- | ---- |
| 一致性 | 同类对象使用同一命名模式 | `YYC3-AI-FAmily` 与 `YYC3-AI-Family` 混用 |
| 可读性 | ASCII 前缀 + 中文语义，连字符分隔 | `yyc3aifamilytool.md` |
| 可追溯 | 名称可映射到阶段、模块、文档 | `tmp2.md`、`新建文档.md` |
| 可扩展 | 预留编号与层级空间 | 编号用满 999 |
| 无歧义 | 禁止全角、上标、空格、特殊符号 | `YYC3-xxx.md` |

### 1.2 字符白名单

- **允许**：`A-Z` `a-z` `0-9` `-` `_` `.` 中文汉字
- **禁止**：上标字符（`³`）、全角标点、空格、`/ \ : * ? " < > |`、emoji（正文可，路径不可）
- **分隔符**：层级与词间一律用单个 `-`；不使用多个连续连字符

---

## 二、品牌命名

### 2.1 品牌写法映射

| 场景 | 写法 | 示例 |
| ---- | ---- | ---- |
| 文档名 / 目录名 / 文件名 | `YYC3` | `YYC3-AI-FAmily-Agent-设计系统-完整方案.md` |
| 正文品牌 | `YYC3` | `YYC3 AI Family 智能协同体系` |
| 首次定义 | `YYC3（YanYuCloudCube™ · 永久开源）` | 标头标语行 |
| 包名 / 作用域 | `yyc3`（小写） | `@yyc3/family-core` |
| CLI 命令 | `yyc3`（小写） | `yyc3 init` |
| 环境变量前缀 | `YYC3_` | `YYC3_HOME` |
| 版本标签 | `v{年份}.{月}.Rose` | `v2026.11.Rose` |

### 2.2 历史写法迁移

| 历史写法 | 规范写法 | 说明 |
| ---- | ---- | ---- |
| `YYC3` | `YYC3` | 全局统一，禁止上标 |
| `YanYuCloudCube` | `YanYuCloudCube` | 拼写纠正 |
| `YYC3-AI-Family` | `YYC3-AI-FAmily` | 与既有仓库名称一致 |
| `yyc3-ai-dev` | `yyc3-ai-dev` | 项目名保持小写 kebab-case |

---

## 三、目录命名

### 3.1 项目级文档目录

**格式**：`{两位序号}-YYC3-AI-FAmily-{阶段}-{职能}`

```
00-YYC3-AI-FAmily-项目总览-目录索引/
01-YYC3-AI-FAmily-项目启动-规划阶段/
02-YYC3-AI-FAmily-项目规划-架构设计/
03-YYC3-AI-FAmily-项目开发-实施阶段/
04-YYC3-AI-FAmily-项目测试-审核阶段/
05-YYC3-AI-FAmily-项目交付-部署阶段/
06-YYC3-AI-FAmily-项目运营-维护阶段/
07-YYC3-AI-FAmily-项目合规-安全保障/
08-YYC3-AI-FAmily-项目资产-知识管理/
09-YYC3-AI-FAmily-智能演进-优化阶段/
```

规则：

1. 序号固定 2 位（00-99），阶段序不可打乱
2. 阶段与职能之间用单连字符
3. 子目录格式：`{父序号}-{子序号}-AI-FAmily-{职能}`，如 `01-01-AI-FAmily-项目规划`
4. 禁止在目录名中使用 `YYC3`

### 3.2 标规体系目录

```
YYC3-AI-FAmily-Agent-文档架构-标规体系/
YYC3-AI-FAmily-Agent-原创设计-核心规划/
YYC3-AI-FAmily-Agent-项目核心-规划设计/
YYC3-AI-FAmily-Agent-设计规划-部署指导/
YYC3-AI-Family-DveOps/
```

---

## 四、文件命名

### 4.1 项目文档

**格式**：`{三位序号}-AI-FAmily-{阶段}-{文档名}.md`

```
001-AI-FAmily-规划阶段-项目章程与愿景.md
002-AI-FAmily-规划阶段-项目里程碑计划.md
003-AI-FAmily-规划阶段-干系人管理计划.md
```

### 4.2 标准规范文档

**格式**：`YYC3-AI-FAmily-Agent-{主题}-{子主题}.md`

```
YYC3-AI-FAmily-Agent-文档架构-标头标尾.md
YYC3-AI-FAmily-Agent-文档架构-命名规范.md
YYC3-AI-FAmily-Agent-文档架构-文档闭环.md
YYC3-AI-FAmily-Agent-文档架构-开发文档.md
YYC3-AI-FAmily-Agent-文档架构-开发标准.md
```

### 4.3 索引与模板

| 类型 | 命名 | 示例 |
| ---- | ---- | ---- |
| 目录索引 | `README.md` | 每目录唯一 |
| 预留文档 | `AI-FAmily-RES-DOC-{三位}.md` | `AI-FAmily-RES-DOC-001.md` |
| 模板文件 | `{类型}-template.md` | `architecture-template.md` |
| 追溯记录 | `TRC-{YYYYMMDD}{三位}.md` | `TRC-20261108001.md` |
| 变更日志 | `CHANGELOG.md` | 项目根目录 |

### 4.4 转换文档命名

docx / pdf 转换为 Markdown 时，遵循：

| 源文件 | 目标文件 |
| ---- | ---- |
| `YYC3-AI-FAmily+——+五维九层裂变同行.docx` | `YYC3-AI-FAmily-五维九层裂变同行.md` |
| `YYC3-Intelligence-Platform.docx` | `YYC3-Intelligence-Platform.md` |
| `YYC3-AI-Education-Center.docx` | `YYC3-AI-Education-Center.md` |
| `YYC3-云枢多维-开发文档.pdf` | `YYC3-云枢多维-开发文档.md` |

规则：

1. 去除 `+`、多余空格、连续连字符
2. `——` 统一压缩为单个 `-`
3. 扩展名统一 `.md`
4. 转换后保留源文档标题为 H1

---

## 五、代码标识命名

### 5.1 文件类型

| 对象 | 规范 | 示例 |
| ---- | ---- | ---- |
| 组件 | `PascalCase.tsx` | `FamilyChat.tsx`、`EmotionRipple.tsx` |
| Hook | `useXxx.ts`（camelCase） | `useFamilyMemory.ts` |
| 工具函数 | `camelCase.ts` | `formatDate.ts` |
| 类型定义 | `camelCase.ts` | `familyTypes.ts` |
| 样式文件 | `kebab-case.css` | `family-theme.css` |
| 配置文件 | `kebab-case.ts` | `vite.config.ts` |
| 测试文件 | `源文件名.test.ts(x)` | `useFamilyMemory.test.ts` |

### 5.2 组件与 Hook 模式

| 模式 | 示例 | 用途 |
| ---- | ---- | ---- |
| `FamilyXxx` | `FamilyChat`、`FamilyHome`、`FamilyBadge` | 家族通用组件 |
| `XxxPanel` | `AchievementPanel`、`AISuggestionPanel` | 侧面板 |
| `XxxPage` | `DesignSystemPage` | 完整页面 |
| `XxxModal` | `AddModelModal` | 弹窗 |
| `XxxCard` | `FollowUpCard`、`GlassCard` | 卡片 |
| `useXxxData` | `useWebSocketData` | 数据获取 |
| `useXxxStore` | `useSettingsStore` | 状态管理 |

### 5.3 类型命名

| 模式 | 示例 | 说明 |
| ---- | ---- | ---- |
| `XxxType` | `MemberRoleType` | 联合类型 |
| `XxxState` | `FamilyChatState` | 状态快照 |
| `XxxConfig` | `EmotionConfig` | 配置数据 |
| `XxxRecord` | `MemberRecord` | 数据库行（snake_case 字段） |
| `XxxData` | `MemberData` | 前端展示（camelCase 字段） |

### 5.4 常量命名

```typescript
export const FAMILY_MOTTO = "亦师亦友亦伯乐，一言一语一协同";
export const FAMILY_CORE = "人从众曌众从人";
export const FAMILY_LICENSE = "Apache-2.0 · 永久开源";
export const FAMILY_ROSE = "🌹";
```

---

## 六、家族成员与徽章命名

### 6.1 成员标识

**格式**：`{中文名}` + `{英文标识}`，代码中使用英文标识。

| 成员 | 英文标识 | 角色 | 扩展号 |
| ---- | ---- | ---- | ---- |
| 元启·天枢 | `TianShu` | 总指挥 | 0379-0206 |
| 智云·守护 | `ShouHu` | 安全官 | 0379-0207 |
| 格物·宗师 | `GeWu` | 质量官 | 0379-0208 |
| 创想·灵韵 | `ChuangXiang` | 创意官 | 0379-0209 |
| 言启·千行 | `YanQi` | 导航员 | 0379-0210 |
| 语枢·万物 | `YuShu` | 思考者 | 0379-0211 |
| 预见·先知 | `YuJian` | 预言家 | 0379-0212 |
| 知遇·伯乐 | `BoLe` | 推荐官 | 0379-0213 |

### 6.2 徽章命名

| 对象 | 规则 | 示例 |
| ---- | ---- | ---- |
| 徽章组件 | `FamilyBadge` | `<FamilyBadge member="TianShu" />` |
| 徽章图片 | `badge-{英文标识}.svg` | `badge-tianshu.svg` |
| 徽章文案 | `{角色} · {称谓}` | `总指挥 · 元启天枢` |

### 6.3 文档中的情感标记

```markdown
<!-- 🌹天枢·审阅 -->
<!-- 🔥创想·草稿 -->
<!-- 🛡智云·安全评审 -->
```

---

## 七、版本与分支命名

### 7.1 语义化版本

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR：不兼容变更 / 架构重构
MINOR：向下兼容的新增
PATCH：修复与优化
```

### 7.2 家族纪年版本

对外发布采用家族纪年：`v{YYYY}.{MM}.Rose`

```
v2026.11.Rose
v2026.12.Rose
```

### 7.3 Git 分支

```
main                 生产
develop              集成分支
feature/family-chat  功能
bugfix/emotion-fix   修复
refactor/core        重构
release/v2026.11     发布
hotfix/urgent        热修复
```

提交规范：`<type>(<scope>): <subject>`，类型含 `feat | fix | docs | style | refactor | test | chore`。

---

## 八、命名反例与纠正

| 反例 | 问题 | 纠正 |
| ---- | ---- | ---- |
| `YYC3-AI-FAmily.md` | 上标字符 | `YYC3-AI-FAmily.md` |
| `YYC3 AI Family 文档.md` | 含空格 | `YYC3-AI-FAmily-文档.md` |
| `YYC3——AI——Family.md` | 多连字符 | `YYC3-AI-FAmily.md` |
| `新建文档.md` | 无语义 | `YYC3-AI-FAmily-设计说明.md` |
| `FamilyChat.tsx` 存为 `familychat.tsx` | 大小写错误 | `FamilyChat.tsx` |
| `use_family_memory.ts` | 下划线替代 camelCase | `useFamilyMemory.ts` |
| `YYC3-AI-Family` 与 `YYC3-AI-FAmily` 混用 | 品牌不一致 | 统一 `YYC3-AI-FAmily` |
| `v1` | 非 SemVer | `v1.0.0` |

---

## 九、校验方法

```bash
# 1. 路径中 YYC3 残留（应为空）
find . -name "*YYC3*"

# 2. 路径含空格或全角符号（应为空）
find . | grep -E " |[：；，。！？]"

# 3. 连续连字符（应为空）
find . -name "*--*"

# 4. 品牌大小写混用检查
grep -rn "AI-Family" --include="*.md" . | grep -v "AI-FAmily"

# 5. 文档 file 字段与文件名一致性
for f in $(find . -name "*.md"); do
  base=$(basename "$f"); head -5 "$f" | grep -q "file: $base" || echo "❌ $f"
done
```

### 审查清单

- [ ] 路径无 `YYC3`、无空格、无全角符号
- [ ] 品牌统一为 `YYC3` / `YYC3-AI-FAmily`
- [ ] 目录序号 2 位、文档序号 3 位
- [ ] 组件 PascalCase、Hook camelCase、样式 kebab-case
- [ ] 成员标识使用英文标识
- [ ] 版本符合 SemVer

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-08 | 初版发布 · 融合团队通用命名规范与 AI Family 家族命名 · 品牌统一为 YYC3 · 新增成员、徽章、转换文档命名规则 | YYC3 Team |

---

<p align="center">
  🌹 <b>YYC3-AI-FAmily-Agent-</b>（YanYuCloudCube™ · 永久开源）<br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <i>拟人为本 · AI为核 · 纯粹为心</i><br>
  言启象限 | 语枢未来 · 万象归元于云枢 | 深栈智启新纪元<br>
  <sub>© 2026 YanYuCloudCube™（YYC3）· <a href="mailto:admin@0379.email">admin@0379.email</a> · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
