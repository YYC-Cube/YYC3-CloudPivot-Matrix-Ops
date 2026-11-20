示例包，待内容本体覆盖

# YYC³ AI Family 内容包 · 起步示例（example）

> 本目录是**示例包**，不是生产注册表条目，也不随应用启动加载。
> 所有条目均为**合成占位数据**（示例文案 / 示例成员映射 / 示例时间），**不含任何真实家人信息**。
> 正式使用前请复制本目录、改名并整体替换内容本体；`packId` 必须换成新的全局唯一值。

## 目录结构

```
ai-family-content-pack.example/
├── README.md                                  ← 本文件（首行固定声明）
├── ai-family-content-pack.example.json        ← 包本体（envelope 与 ConfigExportCenter 兼容）
└── artworks/
    └── example-placeholder.svg                ← 示例作品资产（相对包根路径引用）
```

## 字段口径（与 `public/templates/ai-family-content-pack.template.json` 一致）

| 域 | 说明 |
| ---- | ---- |
| `pack` | 包元信息；`packId` 全局唯一，示例值 `pack-example-starter-20261120` **不可复用** |
| `domains.posts` | 家人动态；`memberId` ∈ navigator/thinker/prophet/bolero/meta-oracle/sentinel/master/creative |
| `domains.activities` | 成长活动（驱动热力图与周统计；无活动即全 0，不造数） |
| `domains.memories` | 长期记忆条目（`importance` 1–5） |
| `domains.skills` | 技能条目（`proficiency` 0–100） |
| `domains.settings` | **仅展示类字段**（称号 / 主题）；模型绑定与密钥类字段一律拒收 |
| `domains.artworks` | 资产列表；`path` 相对包根目录；单文件 ≤2MB、整包 ≤50MB |

## 导入纪律

1. 所有 `example-*` 为占位 id——正式包请全部重编号（避免 `skipExisting` 误跳过真实条目）。
2. 本包 `import.dryRun = true`：只做校验与预览，不落库；正式投放前再置 `false`。
3. 本包**不进生产注册表**：不写入任何运行时索引，也不在应用内预置。
4. 合成数据示例：成员动态「示例文案：今天完成了一次虚拟里程碑」——请勿当作真实记录引用。

## 替换清单（把示例变成内容本体）

- [ ] `pack.packId` / `pack.name` / `pack.author` / `pack.version`
- [ ] `domains.*` 全部条目正文与时间
- [ ] `domains.artworks` 资产文件与其 `path`
- [ ] `import.dryRun` 视投放阶段调整
- [ ] 删除本 README 首行的示例声明（改为真实包说明）
