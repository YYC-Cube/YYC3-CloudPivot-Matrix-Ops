/**
 * @file: credential-crypto.test.ts
 * @description: 设备绑定凭据加密单测 — 加解密往返/信封格式/历史明文直通/storage 包装（落档 64）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [test],[crypto],[storage]
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createCredentialAwareStorage, decryptCredential, encryptCredential,
  isEncryptedCredential,
} from "../lib/credential-crypto";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("credential-crypto 设备绑定加密", () => {
  it("加密产生 yyc3enc1 信封且不包含明文", async () => {
    const cipher = await encryptCredential("vk-test-plaintext-value");
    expect(isEncryptedCredential(cipher)).toBe(true);
    expect(cipher).not.toContain("vk-test-plaintext-value");
  });

  it("解密切换回原值（同设备密钥）", async () => {
    const plain = "sk-test-abc123";
    const cipher = await encryptCredential(plain);
    expect(await decryptCredential(cipher)).toBe(plain);
  });

  it("空串原样返回（不加密）", async () => {
    expect(await encryptCredential("")).toBe("");
    expect(await decryptCredential("")).toBe("");
  });

  it("历史明文解密直通（迁移语义）", async () => {
    expect(await decryptCredential("legacy-plain-token")).toBe("legacy-plain-token");
  });

  it("密文被篡改时解密失败返回空串（不泄漏）", async () => {
    const cipher = await encryptCredential("secret-value");
    const tampered = cipher.slice(0, -4) + "AAAA";
    expect(await decryptCredential(tampered)).toBe("");
  });

  it("storage 包装：setItem 落盘为密文，getItem 读回明文", async () => {
    const storage = createCredentialAwareStorage({
      arrays: [{ list: "configuredModels", field: "apiKey" }],
      fields: [{ obj: "values", keys: ["wsToken"] }],
    });
    const state = {
      state: {
        configuredModels: [{ id: "m1", apiKey: "plain-model-key" }],
        values: { wsToken: "plain-ws-token", systemName: "YYC3" },
      },
      version: 0,
    };
    await storage.setItem("yyc3-provider-slice", JSON.stringify(state));

    const raw = localStorage.getItem("yyc3-provider-slice")!;
    expect(raw).not.toContain("plain-model-key");
    expect(raw).not.toContain("plain-ws-token");
    expect(raw).toContain("systemName"); // 非敏感字段不受影响

    const restored = JSON.parse((await storage.getItem("yyc3-provider-slice")) ?? "{}");
    expect(restored.state.configuredModels[0].apiKey).toBe("plain-model-key");
    expect(restored.state.values.wsToken).toBe("plain-ws-token");
    expect(restored.state.values.systemName).toBe("YYC3");
  });

  it("双重加密存量自愈：解密后仍是信封则继续剥层", async () => {
    // 模拟旧 bug：明文被加密两次落盘
    const once = await encryptCredential("double-wrap-value");
    const twice = await encryptCredential(once);
    expect(isEncryptedCredential(twice)).toBe(true);
    localStorage.setItem("yyc3-provider-slice", JSON.stringify({
      state: { configuredModels: [{ id: "m1", apiKey: twice }] },
      version: 0,
    }));
    const storage = createCredentialAwareStorage({
      arrays: [{ list: "configuredModels", field: "apiKey" }],
    });
    const out = JSON.parse((await storage.getItem("yyc3-provider-slice")) ?? "{}");
    expect(out.state.configuredModels[0].apiKey).toBe("double-wrap-value");
    await new Promise((r) => setTimeout(r, 20));
    // 回写后磁盘为单层密文；再次读取仍还原为明文（不再剥坏）
    const raw = localStorage.getItem("yyc3-provider-slice")!;
    expect(raw).not.toContain("double-wrap-value");
    const out2 = JSON.parse((await storage.getItem("yyc3-provider-slice")) ?? "{}");
    expect(out2.state.configuredModels[0].apiKey).toBe("double-wrap-value");
  });

  it("storage 包装：历史明文在 getItem 后一次性升级为密文", async () => {
    localStorage.setItem("yyc3-settings-ssot", JSON.stringify({
      state: { values: { wsToken: "legacy-plain" } },
      version: 3,
    }));
    const storage = createCredentialAwareStorage({
      fields: [{ obj: "values", keys: ["wsToken"] }],
    });
    const out = JSON.parse((await storage.getItem("yyc3-settings-ssot")) ?? "{}");
    expect(out.state.values.wsToken).toBe("legacy-plain"); // 内存态明文
    await new Promise((r) => setTimeout(r, 20)); // 等 fire-and-forget 回写
    const raw = localStorage.getItem("yyc3-settings-ssot")!;
    expect(raw).not.toContain("legacy-plain"); // 磁盘已升级为密文

    // 关键回归：二次 reload 不得双重加密——解密后仍是原值
    const out2 = JSON.parse((await storage.getItem("yyc3-settings-ssot")) ?? "{}");
    await new Promise((r) => setTimeout(r, 20));
    const out3 = JSON.parse((await storage.getItem("yyc3-settings-ssot")) ?? "{}");
    expect(out3.state.values.wsToken).toBe("legacy-plain");
    expect(isEncryptedCredential(out3.state.values.wsToken)).toBe(false);
  });
});
