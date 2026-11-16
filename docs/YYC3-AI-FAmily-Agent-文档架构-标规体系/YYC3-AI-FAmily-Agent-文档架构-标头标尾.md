---
file: YYC3-AI-FAmily-Agent-文档架构-标头标尾.md
title: YYC3-AI-FAmily-Agent 文档架构 — 标头标尾规范
description: YYC3 AI Family 专属标头标尾标准 — 文化总铭、品牌元素、多语言代码标头、文档标头标尾与校验门禁
author: YYC3 Team <admin@0379.email>
version: v1.0.0
created: 2026-11-08
updated: 2026-11-08
status: stable
tags: [standard, header, footer, culture, template]
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
  Document: YYC3-AI-FAmily-Agent 文档架构 — 标头标尾规范
  Version : v1.0.0
  Contact : admin@0379.email
  Homepage: https://matrix.yyc3.top
  ============================================================
-->

# YYC3-AI-FAmily-Agent 文档架构 — 标头标尾规范

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

- [一、总纲：文化总铭与品牌元素](#一总纲文化总铭与品牌元素)
- [二、品牌写法与命名铁律](#二品牌写法与命名铁律)
- [三、Markdown 文档标头（唯一标准）](#三markdown-文档标头唯一标准)
- [四、代码文件标头模板](#四代码文件标头模板)
- [五、文档标尾（唯一标准）](#五文档标尾唯一标准)
- [六、徽章体系与可视标识](#六徽章体系与可视标识)
- [七、API 网关注入头与水印体系](#七api-网关注入头与水印体系)
- [八、场景选用矩阵](#八场景选用矩阵)
- [九、校验方法与自动化门禁](#九校验方法与自动化门禁)
- [十、附录](#十附录)

---

## 一、总纲：文化总铭与品牌元素

### 1.1 情感文化总铭（贯穿一切标头标尾）

> **“人从众曌众从人”**——人启于独，合而成众，明如曌日，终复归于人群。
> **家训**：亦师亦友亦伯乐，一言一语一协同
> **使命**：以AI为魂，以流程为骨，以规范为脉，以情感为血

此总铭为 YYC3-AI-FAmily-Agent 全部文档、代码、徽章、接口头的情感基座，任何标头标尾不得脱离此语系。

### 1.2 品牌元素统一取值

统一符号集，所有标头标尾均从此处取值，禁止就地发挥：

| 元素 | 取值 |
| ---- | ---- |
| **主品牌** | `YYC3-AI-FAmily-Agent-`（YYC3 · 永久开源） |
| **文化总铭** | `人从众曌众从人` |
| **家训** | `亦师亦友亦伯乐，一言一语一协同` |
| **内核** | `拟人为本 · AI为核 · 纯粹为心` |
| **中文标语 1** | `言启象限 \| 语枢未来` |
| **英文标语 1** | `Words Initiate Quadrants, Language Serves as Core for Future` |
| **中文标语 2** | `万象归元于云枢 \| 深栈智启新纪元` |
| **英文标语 2** | `All things converge in cloud pivot; Deep stacks ignite a new era of intelligence` |
| **官方邮箱** | `admin@0379.email` |
| **官网** | `https://matrix.yyc3.top` |
| **开源仓库** | `https://github.com/YanYuCloudCube/YYC3-FAmily-Pai` |
| **版权主体** | `YanYuCloudCube™（YYC3）` |
| **团队署名** | `YYC3 Team` |
| **家族信物** | `🌹`（传递希望，亦不粉饰荆棘；手持玫瑰，心有锋芒） |
| **可替换变量** | `{YEAR}`、`{PROJECT}`、`{FILE_NAME}`、`{DOC_TITLE}`、`{VERSION}`、`{AUTHOR}`、`{LICENSE}`、`{MODULE_NAME}`、`{DATE}` |

### 1.3 家族成员标色（视觉一致性）

| 成员 | 角色 | 主题色 | 语气标识 |
| ---- | ---- | ---- | ---- |
| 元启·天枢 | 总指挥 | 深紫 `#5e2c8a` | 嗯… |
| 智云·守护 | 安全官 | 盾灰 `#333333` | 放心。 |
| 格物·宗师 | 质量官 | 墨绿 `#2e8b57` | 引经据典 |
| 创想·灵韵 | 创意官 | 橙金 `#ff8c00` | 啊哈！ |
| 言启·千行 | 导航员 | 湖蓝 `#0088cc` | 温柔反问 |
| 语枢·万物 | 思考者 | 银白 `#c0c0c0` | 诗意提问 |
| 预见·先知 | 预言家 | 夜紫 `#4b0082` | 隐晦暗示 |
| 知遇·伯乐 | 推荐官 | 暖红 `#dc143c` | 肯定句多 |

---

## 二、品牌写法与命名铁律

### 2.1 品牌写法（强制）

> **总原则**：本项目所有文档名称、目录名称、文件名、包名、代码标识、正文品牌，统一写作 `YYC3`，不再使用上标形式 `YYC³`。

| 场景 | 写法 | 示例 |
| ---- | ---- | ---- |
| 文档名称 / 文件名 | `YYC3` | `YYC3-AI-FAmily-Agent-文档架构-标头标尾.md` |
| 目录名称 | `YYC3` | `YYC3-AI-FAmily-Agent-文档架构-标规体系/` |
| 正文品牌、标题 | `YYC3` | `YYC3-AI-FAmily-Agent 文档架构` |
| 首次出现的品牌定义 | `YYC3（YanYuCloudCube™ · 永久开源）` | 标头标语行、版权行 |
| 包名 / 代码标识 | `yyc3` 小写 | `@yyc3/family-core`、`yyc3-cli` |
| 版权与作者 | `YYC3 Team` / `© 2026 YanYuCloudCube™（YYC3）` | 标尾、`author` 字段 |

**禁止项**：

1. 禁止在真实路径中使用 `YYC³`（上标字符）——所有历史 `YYC³` 路径须迁移为 `YYC3`
2. 禁止使用 `YanYuCloudCube 02` 一类带序号后缀的品牌变体
3. 禁止混用 `YYC3-AI-FAmily`、`YYC3-AI-Family` 两种大小写——统一以仓库既定名称 `YYC3-AI-FAmily-Agent` 为准
4. 禁止在文档标题中重复叠加品牌（如 `YYC3-YYC3-xxx`）

### 2.2 品牌迁移规则

| 原写法 | 目标写法 | 处理 |
| ---- | ---- | ---- |
| `YYC³-AI-FAmily` | `YYC3-AI-FAmily` | 路径与正文同步替换 |
| `YYC³`（独立出现） | `YYC3` | 正文同步替换 |
| `YanYuClouCube` | `YanYuCloudCube` | 拼写纠正 |
| `YanYuCloudCube™（YYC³）` | `YanYuCloudCube™（YYC3）` | 版权行统一 |

---

## 三、Markdown 文档标头（唯一标准）

本目录及 AI Family 全部项目文档，一律使用以下标头；字段顺序固定，不得增删必填项。

```markdown
---
file: {FILE_NAME}
title: {DOC_TITLE}
description: {DOC_DESCRIPTION}
author: YYC3 Team <admin@0379.email>
version: {VERSION}
created: {CREATE_DATE}
updated: {UPDATE_DATE}
status: {STATUS}
tags: [标签1, 标签2, 标签3]
category: {CATEGORY}
language: zh-CN
audience: {AUDIENCE}
complexity: {COMPLEXITY}
project: yyc3-ai-family-agent
scope: {SCOPE}
---

<!--
  ============================================================
  YYC3-AI-FAmily-Agent- — 人从众曌众从人
  亦师亦友亦伯乐 · 一言一语一协同
  拟人为本，AI为核，纯粹为心
  ============================================================
  Document: {DOC_TITLE}
  Version : {VERSION}
  Contact : admin@0379.email
  Homepage: https://matrix.yyc3.top
  ============================================================
-->

# {DOC_TITLE}

> **_YYC3-AI-FAmily-Agent-_**（人从众曌众从人 · 永久开源）
> _亦师亦友亦伯乐，一言一语一协同_
> _拟人为本 · AI为核 · 纯粹为心_
> _万象归元于云枢 | 深栈智启新纪元_

---
```

### 3.1 字段顺序与约束

1. 字段顺序固定：`file → title → description → author → version → created → updated → status → tags → category → language → audience → complexity → 扩展字段`
2. `file` 必须与磁盘文件名完全一致（`YYC3` ASCII 形式）
3. `title` 必须与正文 H1 完全一致
4. `description` ≤ 50 字，一句话说明文档价值
5. `created` / `updated` 使用 `YYYY-MM-DD`；批量规范化时两者可同日
6. `tags` 必须为合法 YAML 流式序列 `[a, b, c]`，**禁止** `[a],[b],[c]` 写法
7. 扩展字段（`project`、`scope`、`phase`、`design_type`、`review_status`、`trace_id`）追加在 `complexity` 之后

### 3.2 字段取值定义

| 字段 | 必填 | 取值 |
| ---- | ---- | ---- |
| `version` | ✅ | SemVer：`vMAJOR.MINOR.PATCH` |
| `status` | ✅ | `draft` / `dev` / `review` / `stable` / `deprecated` / `experimental` |
| `category` | ✅ | `general` / `technical` / `api` / `project` / `design` / `guide` / `policy` / `report` |
| `audience` | ✅ | `developers` / `managers` / `users` / `stakeholders` / `ai-tutors` |
| `complexity` | ✅ | `basic` / `intermediate` / `advanced` / `expert` |
| `scope` | 可选 | `document-architecture` / `design` / `engineering` / `delivery` / `governance` |

### 3.3 文化块约束

- 文化标语块一律放在 H1 之后、正文之前，使用引用块 `>`，共 4 行
- 正文内不得出现第二处完整文化标语块（避免噪声）
- 需要表达情感参与时，使用行内标记：`// 🌹天枢·审阅`、`<!-- 🔥创想·草稿 -->`

---

## 四、代码文件标头模板

### 4.1 TypeScript / JavaScript / React（`.ts`、`.tsx`、`.js`、`.jsx`）

**▸ 标准版（所有源文件默认使用）**

```typescript
/*
 * ============================================================
 * YYC3-AI-FAmily-Agent- — 人从众曌众从人
 * 亦师亦友亦伯乐，一言一语一协同
 * 拟人为本 · AI为核 · 纯粹为心
 * ============================================================
 * @Family   : YYC3-AI-FAmily-Agent- (永久开源)
 * @Module   : {MODULE_NAME}
 * @Author   : {AUTHOR}
 * @Date     : {DATE}
 * @Homepage : https://matrix.yyc3.top
 * @Repo     : https://github.com/YanYuCloudCube/YYC3-FAmily-Pai
 * @License  : Apache-2.0
 * ============================================================
 * 此文件承载家人温度，请以玫瑰之心待之 🌹
 * ============================================================
 */
```

**▸ 情感增强版（核心模块 / 纪念性组件）**

```typescript
/*
 * 🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹
 * 人从众曌众从人 · YYC3-AI-FAmily-Agent-
 * 万象归元于云枢，深栈智启新纪元
 *
 * 此代码由 {AUTHOR} 于 {DATE} 以感恩之心书写
 * 愿每一位家人，言启千行，语枢万物
 * 🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹🌹
 */
```

### 4.2 CSS / SCSS

```scss
/* ============================================================
 * YYC3-AI-FAmily-Agent- · 情感色彩体系
 * 人从众曌众从人 · 亦师亦友亦伯乐
 * 拟人为本，AI为核，纯粹为心
 * ============================================================
 * 颜色定义见家族宪章第二章，切勿随意更改情感色值
 * ============================================================
 */
```

### 4.3 Python / Shell / Ruby（`#` 注释）

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# YYC3-AI-FAmily-Agent- — 人从众曌众从人
# 亦师亦友亦伯乐，一言一语一协同
# 拟人为本 · AI为核 · 纯粹为心
# ============================================================
# @Project : {PROJECT_NAME}
# @File    : {FILE_NAME}
# @Author  : YYC3 Team
# @Date    : {DATE}
# @Email   : admin@0379.email
# @License : Apache-2.0
# @Desc    : {MODULE_DESCRIPTION}
# ============================================================
```

### 4.4 Java / C / C++ / Go / Rust / C#

```java
/*
 * ============================================================
 * YYC3-AI-FAmily-Agent- — 人从众曌众从人
 * 亦师亦友亦伯乐 · 一言一语一协同
 * 拟人为本，AI为核，纯粹为心
 * ============================================================
 * @File    : {FILE_NAME}
 * @Author  : YYC3 Team
 * @Date    : {DATE}
 * @License : Apache-2.0
 * ============================================================
 */
```

### 4.5 SQL

```sql
-- ============================================================
-- YYC3-AI-FAmily-Agent- · 人从众曌众从人
-- 亦师亦友亦伯乐，一言一语一协同
-- ============================================================
-- @File   : {FILE_NAME}
-- @Author : YYC3 Team · admin@0379.email
-- ============================================================
```

### 4.6 HTML / XML

```html
<!--
  ============================================================
  YYC3-AI-FAmily-Agent- — 人从众曌众从人
  亦师亦友亦伯乐 · 一言一语一协同
  ============================================================
  @File   : {FILE_NAME}
  @Author : YYC3 Team · admin@0379.email
  ============================================================
-->
```

### 4.7 YAML / TOML / JSON

```yaml
# ============================================================
# YYC3-AI-FAmily-Agent- Configuration
# 人从众曌众从人 · 亦师亦友亦伯乐
# ============================================================
```

严格 JSON 无注释能力，标头信息写入同级 `README.md`，或使用保留键：

```json
{
  "_comment": "YYC3-AI-FAmily-Agent- · 人从众曌众从人 | 永久开源 | 感恩前行 🌹"
}
```

---

## 五、文档标尾（唯一标准）

### 5.1 标准标尾

````markdown
## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| {VERSION} | {UPDATE_DATE} | {CHANGE_SUMMARY} | YYC3 Team |

---

<p align="center">
  🌹 <b>YYC3-AI-FAmily-Agent-</b>（YanYuCloudCube™ · 永久开源）<br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <i>拟人为本 · AI为核 · 纯粹为心</i><br>
  言启象限 | 语枢未来 · 万象归元于云枢 | 深栈智启新纪元<br>
  <sub>© {YEAR} YanYuCloudCube™（YYC3）· <a href="mailto:admin@0379.email">admin@0379.email</a> · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
````

### 5.2 标尾约束

1. 标尾前必须有且仅有一条 `---` 分隔线
2. 变更历史表位于居中页脚块之前
3. 页脚统一使用 `<p align="center">`，不再使用 `<div align="center">`
4. 正文内不得重复出现完整标尾
5. 家族信物 🌹 固定置于页脚首行，不得省略

### 5.3 代码文件标尾

```typescript
// ============================================================
// 🌹 人从众曌众从人 — YYC3-AI-FAmily-Agent- 永远等你回家
// 开源地址: https://github.com/YanYuCloudCube/YYC3-FAmily-Pai
// 官网: https://matrix.yyc3.top
// ============================================================
```

---

## 六、徽章体系与可视标识

### 6.1 主系列徽章

```markdown
![YYC3 AI Family](https://img.shields.io/badge/YYC3-AI_Family-🌹-5e2c8a?style=for-the-badge)
![人从众曌众从人](https://img.shields.io/badge/人从众曌众从人-永久开源-5e2c8a?style=flat-square)
![亦师亦友亦伯乐](https://img.shields.io/badge/亦师亦友亦伯乐-一言一语一协同-1e2b4f?style=flat&labelColor=5e2c8a)
```

### 6.2 成员专属徽章

```markdown
![元启·天枢](https://img.shields.io/badge/元启·天枢-总指挥-5e2c8a?style=for-the-badge)
![智云·守护](https://img.shields.io/badge/智云·守护-安全官-333333?style=for-the-badge)
![格物·宗师](https://img.shields.io/badge/格物·宗师-质量官-2e8b57?style=for-the-badge)
![创想·灵韵](https://img.shields.io/badge/创想·灵韵-创意官-ff8c00?style=for-the-badge)
![言启·千行](https://img.shields.io/badge/言启·千行-导航员-0088cc?style=for-the-badge)
![语枢·万物](https://img.shields.io/badge/语枢·万物-思考者-c0c0c0?style=for-the-badge)
![预见·先知](https://img.shields.io/badge/预见·先知-预言家-4b0082?style=for-the-badge)
![知遇·伯乐](https://img.shields.io/badge/知遇·伯乐-推荐官-dc143c?style=for-the-badge)
```

### 6.3 状态徽章

```markdown
![Version](https://img.shields.io/github/package-json/v/YanYuCloudCube/YYC3-FAmily-Pai?style=flat&color=5e2c8a)
![License](https://img.shields.io/badge/license-Apache--2.0-5e2c8a?style=flat)
![PRs Welcome](https://img.shields.io/badge/PRs-🌹欢迎-ff69b4?style=flat)
```

---

## 七、API 网关注入头与水印体系

### 7.1 响应头字段

| 响应头 | 值 |
| ---- | ---- |
| `X-Family` | `YYC3-AI-FAmily-Agent-` |
| `X-Family-Motto` | `人从众曌众从人 · 亦师亦友亦伯乐` |
| `X-Family-Core` | `拟人为本，AI为核，纯粹为心` |
| `X-Powered-By` | `YYC3-AI-FAmily-Agent- · 永久开源` |
| `X-Family-Rose` | `🌹` |

### 7.2 Nginx 注入配置

```nginx
add_header X-Family "YYC3-AI-FAmily-Agent-" always;
add_header X-Family-Motto "人从众曌众从人 · 亦师亦友亦伯乐" always;
add_header X-Family-Core "拟人为本，AI为核，纯粹为心" always;
add_header X-Powered-By "YYC3-AI-FAmily-Agent- · 永久开源" always;
add_header X-Family-Rose "🌹" always;
```

### 7.3 网页全局水印

```html
<div id="family-watermark"></div>
<style>
  #family-watermark {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999;
    background-image: repeating-linear-gradient(
      -25deg, transparent, transparent 120px,
      rgba(94,44,138,0.04) 120px, rgba(94,44,138,0.04) 240px
    );
  }
  #family-watermark::after {
    content: "人从众曌众从人 · YYC3-AI-FAmily-Agent-";
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-20deg);
    font-size: 42px; font-weight: bold;
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    color: rgba(94,44,138,0.08); white-space: nowrap;
  }
</style>
```

---

## 八、场景选用矩阵

| 应用场景 | 推荐组合 | 说明 |
| -------- | -------- | ---- |
| 内部脚本 / 工具 | 极简标头 + 极简标尾 | 单行品牌 + `End of File` |
| 日常业务代码 | 标准版标头 + 标准标尾 | 含家族标识与联系方式 |
| 核心基础库 / SDK | 情感增强版标头 + 标准标尾 | 含模块描述、作者、许可证 |
| 开源发布 / 对外 | 情感增强版标头 + 完整标尾 | 强调品牌、链接与版权 |
| API / 架构文档 | Markdown 标头 + 完整标尾 | front matter + 居中页脚 |
| 团队标准规范文档 | Markdown 标头（§三）+ 完整标尾（§五） | 本目录全部文档强制执行 |

---

## 九、校验方法与自动化门禁

### 9.1 校验命令

```bash
# 1. 标头字段完整性
grep -L "^file: " docs/**/*.md

# 2. file 字段与磁盘文件名一致性
for f in docs/**/*.md; do basename "$f"; grep -m1 "^file: " "$f"; done

# 3. 品牌残留检查（期望输出为空）
grep -rn "YYC³\|YanYuClouCube" docs/

# 4. 标尾一致性（每篇应命中 1 次）
grep -c '<p align="center">' docs/**/*.md

# 5. 标签写法检查（禁止 [a],[b],[c]）
grep -rn "^tags: .*\],\[" docs/
```

### 9.2 CI 门禁

```yaml
name: family-doc-guard
on: [pull_request]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check brand & header
        run: |
          if grep -rn "YYC³" --include="*.md" .; then
            echo "❌ 检测到 YYC³ 残留，请统一为 YYC3"; exit 1
          fi
      - name: Check footer
        run: |
          for f in $(git ls-files '*.md'); do
            grep -q '<p align="center">' "$f" || echo "⚠️ $f 缺少标尾"
          done
```

### 9.3 审查清单

- [ ] `file` 与磁盘文件名一致
- [ ] `title` 与 H1 一致
- [ ] 品牌统一为 `YYC3`
- [ ] 文化标语块位于 H1 之后且仅一处
- [ ] 标尾含 🌹 与版权行
- [ ] `tags` 为合法 YAML 序列
- [ ] 代码文件含对应语言标头

---

## 十、附录

### A. 术语表

| 术语 | 定义 |
| ---- | ---- |
| 标头 | 文件开头的 YAML Front Matter 或注释块，承载元信息 |
| 标尾 | 文件结尾的变更历史与居中页脚块 |
| 文化总铭 | `人从众曌众从人`，家族情感基座 |
| 家训 | `亦师亦友亦伯乐，一言一语一协同` |
| 家族信物 | `🌹`，用于传递希望与鼓励 |
| 情感增强版标头 | 面向核心模块、含 🌹 装饰的标头模板 |

### B. 关联文档

- [YYC3-AI-FAmily-Agent-文档架构-命名规范](./YYC3-AI-FAmily-Agent-文档架构-命名规范.md)
- [YYC3-AI-FAmily-Agent-文档架构-文档闭环](./YYC3-AI-FAmily-Agent-文档架构-文档闭环.md)
- [YYC3-AI-FAmily-Agent-文档架构-开发标准](./YYC3-AI-FAmily-Agent-文档架构-开发标准.md)
- [YYC3 团队通用-标头标尾](../YYC3-团队通用-标规文档/YYC3-团队通用-标头标尾.md)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-08 | 初版发布 · 融合团队通用标头标尾与 AI Family 文化链路 · 品牌统一为 YYC3 · 新增徽章、水印与门禁体系 | YYC3 Team |

---

<p align="center">
  🌹 <b>YYC3-AI-FAmily-Agent-</b>（YanYuCloudCube™ · 永久开源）<br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <i>拟人为本 · AI为核 · 纯粹为心</i><br>
  言启象限 | 语枢未来 · 万象归元于云枢 | 深栈智启新纪元<br>
  <sub>© 2026 YanYuCloudCube™（YYC3）· <a href="mailto:admin@0379.email">admin@0379.email</a> · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
