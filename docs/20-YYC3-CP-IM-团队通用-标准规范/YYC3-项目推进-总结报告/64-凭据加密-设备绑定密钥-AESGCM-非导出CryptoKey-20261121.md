---
file: 64-凭据加密-设备绑定密钥-AESGCM-非导出CryptoKey-20261121.md
title: 落档 64 · 凭据加密 — 设备绑定密钥（AES-GCM 非导出 CryptoKey）
description: 主控批复「设备绑定密钥」落地：credentialVault store 存非导出 AES-GCM-256 CryptoKey；provider/SSOT/旧设置 store 的 apiKey/wsToken/dbPassword 磁盘态恒为密文（yyc3enc1 信封），内存态明文供调用；历史明文自动升级、双重信封自愈剥层；清空/恢复清密钥（与备份脱敏策略闭环）
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-21
updated: 2026-11-21
status: stable
tags: [report, security, crypto, storage, credentials]
category: report
language: zh-CN
audience: developers,managers
complexity: advanced
project: yyc3-cloudpivot-matrix-ops
phase: production
commit: 本档同步提交
gates:
  tsc: 0 错误
  lint: 改动文件 0 error
  vitest: 279 文件 / 4732 用例全绿（新增 8 例）
  build: ✓
  e2e: 磁盘 provider apiKey / SSOT wsToken 均为 yyc3enc1: 信封；vault 存非导出 CryptoKey（extractable:false）；明文→写→reload→解密回读闭环通过
---

# 落档 64 · 凭据加密 — 设备绑定密钥（AES-GCM 非导出 CryptoKey）

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、方案（主控批复：设备绑定密钥）

| 项 | 实现 |
| ---- | ---- |
| 密钥 | `crypto.subtle.generateKey(AES-GCM-256, extractable: **false**)`——密钥材料不可导出 |
| 存储 | IndexedDB `yyc3_matrix/credentialVault`（DB v6 新增 store），结构化克隆存 `CryptoKey` 对象 |
| 生命周期 | 「清空数据 / 全量恢复」经 `clearAllStorage` 一并清掉 vault → 旧密文不可解 → 凭据字段回空、需重录——与「备份不含密钥」脱敏策略闭环一致 |
| 密文格式 | `yyc3enc1:<base64(iv‖ciphertext)>` |
| 内存态 | 明文（模型调用需要）；**磁盘态恒为密文** |
| 降级 | 非 HTTPS/无 subtle 或 IDB 不可用 → 内存密钥或明文直通（功能不中断，安全性回落，已在落档登记） |

## 二、接入点

| Store | 字段 | 方式 |
| ---- | ---- | ---- |
| `yyc3-provider-slice` | `configuredModels[].apiKey`、`providers[].apiKey` | persist 异步 storage（`createCredentialAwareStorage`） |
| `yyc3-settings-ssot` | `values.aiApiKey`、`values.wsToken`、`values.dbPassword` | 同上 |
| `yyc3_system_settings`（旧 store） | 同上三字段 | `saveState` 异步加密写、挂载后解密回填 |

**未接入（登记）**：`yyc3_env_config` 的 env 键值、Family `providerKeys`（已不落盘）、网络 WiFi 密码（已不落盘）。

## 三、关键实现细节（三处踩坑实录）

1. **persist JSON 外层**：zustand persist 落盘为 `{state, version}`——字段路径必须相对内层 `state`（首版漏层导致加密空转，测试捕获）。
2. **vault 连接生命周期**：`credentialVault` 的 IDB 连接若长持，会 **block** `yyc3-storage` 的版本升级（测试超时实证）——用完即 `close()` + `onversionchange` 让路。
3. **双重信封自愈**：迁移回写若基于原始密文再加密会产生双重信封——改为基于解密后副本回写；解密侧 `unwrapCredential` 最多剥 3 层，存量自愈。

## 四、存量影响（必须知晓）

bug 修复期间产生的**密钥丢失窗口**导致以下磁盘密文不可解，自愈后已回空——**需重新录入**：

| 条目 | 现状 | 动作 |
| ---- | ---- | ---- |
| NAS vk（`model-nas-5d2df810`，key_id `5d2df810`） | apiKey 已空 | **主控在模型管理重填明文 vk**（仅主控持有） |
| Ollama 占位 key（`model-ollama-14b`） | 已空 | 重填 `ollama`（占位值） |
| DGX（`model-dgx-nemotron`） | 无 key，不受影响 | 无 |

此后密钥持久化稳定（vault 非 exportable key 已验证存取），不再出现重录。

## 五、测试与验证

- **单测 8 例**（`credential-crypto.test.ts`）：信封格式不含明文、往返、空串、历史明文直通、篡改→空串、storage 包装落盘密文/读回明文、历史明文升级、双重信封自愈。
- 全量 **279 文件 / 4732 用例全绿**；tsc 0E；build ✓。
- 浏览器 E2E：磁盘 provider apiKey 与 SSOT wsToken 均为 `yyc3enc1:` 信封；vault 存 `extractable:false` CryptoKey；明文→写→reload→解密回读闭环通过；测试条目已清理。
- 测试基建：jsdom 补 Node webcrypto（`setup.ts`）；6 处测试 mock 补 `onAPIConfigChange`/`onEnvConfigChange` 订阅桩（异步水合回调需要）。

## 六、纪律重申

- 明文 vk 只进面板**内存态**与重录动作；代码/文档/日志零凭据字面量（Mimosa 约束遵守）。
- 备份导出对 `apiKey/password/token/secret` 字段脱敏（落档 59）——密文也不出本地。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-21 | 初始版本 — 设备绑定凭据加密全链路；TRC-20261121009 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
