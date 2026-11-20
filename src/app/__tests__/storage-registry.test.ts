/**
 * @file: storage-registry.test.ts
 * @description: 存储注册表单测 — 键边界 / 清理白名单 / 备份脱敏（落档 59）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [test],[storage],[backup]
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTH_STORAGE_KEYS, REDACTED, clearProjectStorage, isFullyRedacted, isProjectStorageKey,
  listProjectStorageKeys, redactJson, redactStorageValue, stripRedactedJson,
} from "../lib/storage-registry";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("storage-registry 键边界", () => {
  it("识别本项目键，拒绝同源其他应用键", () => {
    expect(isProjectStorageKey("yyc3-provider-slice")).toBe(true);
    expect(isProjectStorageKey("yyc3_session")).toBe(true);
    expect(isProjectStorageKey("network_config")).toBe(true);
    expect(isProjectStorageKey("__yyc3OpsPanelDbg")).toBe(true);
    expect(isProjectStorageKey("pwa_install_dismissed")).toBe(true);
    expect(isProjectStorageKey("other-app-token")).toBe(false);
    expect(isProjectStorageKey("vite-plugin-inspect")).toBe(false);
  });

  it("认证键被标记为不可备份", () => {
    expect(AUTH_STORAGE_KEYS.has("yyc3_session")).toBe(true);
    expect(AUTH_STORAGE_KEYS.has("yyc3_ghost")).toBe(true);
  });

  it("listProjectStorageKeys 只返回项目键", () => {
    localStorage.setItem("yyc3-a", "1");
    localStorage.setItem("network_config", "2");
    localStorage.setItem("other-app", "3");
    expect(listProjectStorageKeys().sort()).toEqual(["network_config", "yyc3-a"]);
  });

  it("clearProjectStorage 只清项目键，不碰同源其他应用", () => {
    localStorage.setItem("yyc3-a", "1");
    localStorage.setItem("other-app", "3");
    sessionStorage.setItem("yyc3-node-ts-v1", "x");
    sessionStorage.setItem("other-session", "y");
    const result = clearProjectStorage();
    expect(result.localRemoved).toEqual(["yyc3-a"]);
    expect(result.sessionRemoved).toEqual(["yyc3-node-ts-v1"]);
    expect(localStorage.getItem("other-app")).toBe("3");
    expect(sessionStorage.getItem("other-session")).toBe("y");
  });
});

describe("storage-registry 备份脱敏", () => {
  it("JSON 敏感字段替换为 [REDACTED]，结构保留", () => {
    const raw = JSON.stringify({
      providers: [{ id: "zhipu", apiKey: "sk-real", baseUrl: "https://x" }],
      values: { dbPassword: "p@ss", wsToken: "tok", systemName: "YYC3" },
      nested: { credentials: { user: "a", password: "b" } },
    });
    const redacted = JSON.parse(redactStorageValue("yyc3-settings-ssot", raw));
    expect(redacted.providers[0].apiKey).toBe(REDACTED);
    expect(redacted.providers[0].baseUrl).toBe("https://x");
    expect(redacted.values.dbPassword).toBe(REDACTED);
    expect(redacted.values.wsToken).toBe(REDACTED);
    expect(redacted.values.systemName).toBe("YYC3");
    // 字段名为 credentials 的对象整体脱敏（更安全，避免嵌套凭据漏出）
    expect(redacted.nested.credentials).toBe(REDACTED);
  });

  it("非 JSON 且键名敏感 → 整体脱敏；否则原样", () => {
    expect(redactStorageValue("yyc3_ai_api_key", "sk-plain")).toBe(REDACTED);
    expect(redactStorageValue("yyc3_locale", "zh-CN")).toBe("zh-CN");
  });

  it("导入时移除占位值，不覆盖真实凭据", () => {
    const cleaned = stripRedactedJson({
      apiKey: REDACTED,
      baseUrl: "http://127.0.0.1:11434",
      list: [REDACTED, { token: REDACTED, name: "keep" }],
    }) as Record<string, unknown>;
    expect(cleaned.apiKey).toBeUndefined();
    expect(cleaned.baseUrl).toBe("http://127.0.0.1:11434");
    expect(cleaned.list).toEqual([{ name: "keep" }]);
  });

  it("整体脱敏占位可识别", () => {
    expect(isFullyRedacted(REDACTED)).toBe(true);
    expect(isFullyRedacted(" {\"a\":1} ")).toBe(false);
  });

  it("redactJson 不脱敏空值（保持结构）", () => {
    const out = redactJson({ apiKey: "", password: null, token: undefined }) as Record<string, unknown>;
    expect(out.apiKey).toBe("");
    expect(out.password).toBeNull();
  });
});
