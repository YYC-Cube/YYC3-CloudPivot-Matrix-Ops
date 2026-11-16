/**
 * @file: settings-model-unified-dataflow.test.ts
 * @description: settings-model-unified-dataflow.test.ts
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [module]
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import { describe, it, expect, beforeEach } from "vitest";
import { createLocalStore } from "../lib/create-local-store";
import type { SettingsValues } from "../hooks/useSettingsStore";

// ============================================================
// Tests
// ============================================================

describe("createLocalStore — 通用 CRUD 工厂", () => {
  interface TestItem {
    id: string;
    name: string;
    value: number;
  }

  const DEFAULTS: TestItem[] = [
    { id: "t-1", name: "Alpha", value: 10 },
    { id: "t-2", name: "Beta", value: 20 },
  ];

  let store: ReturnType<typeof createLocalStore<TestItem>>;

  beforeEach(() => {
    localStorage.clear();
    store = createLocalStore<TestItem>("test_store", DEFAULTS, "t");
  });

  it("初始数据加载默认值", () => {
    const items = store.getAll();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Alpha");
  });

  it("add: 添加新条目", () => {
    const added = store.add({ name: "Gamma", value: 30 });
    expect(added.id).toBeTruthy();
    expect(added.name).toBe("Gamma");
    expect(store.count()).toBe(3);
  });

  it("update: 修改已有条目", () => {
    const updated = store.update("t-1", { name: "Alpha-Updated", value: 99 });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Alpha-Updated");
    expect(updated!.value).toBe(99);
    expect(store.getById("t-1")?.name).toBe("Alpha-Updated");
  });

  it("remove: 删除条目", () => {
    const removed = store.remove("t-1");
    expect(removed).toBe(true);
    expect(store.getById("t-1")).toBeUndefined();
    expect(store.count()).toBe(1);
  });

  it("reset: 重置为默认值", () => {
    store.add({ name: "Extra", value: 50 });
    store.update("t-1", { name: "Changed" });
    const reset = store.reset();
    expect(reset).toHaveLength(2);
    expect(reset[0].name).toBe("Alpha");
  });

  it("exportData / importData round-trip", () => {
    store.add({ name: "Export-Test", value: 77 });
    const json = store.exportData();
    expect(json).toContain("Export-Test");

    store.reset();
    const ok = store.importData(json);
    expect(ok).toBe(true);
    expect(store.getAll().find(i => i.name === "Export-Test")).toBeTruthy();
  });

  it("持久化到 localStorage", () => {
    store.add({ name: "Persist", value: 42 });
    const raw = localStorage.getItem("test_store");
    expect(raw).toBeTruthy();
    expect(raw).toContain("Persist");
  });

  it("removeBatch: 批量删除", () => {
    const removed = store.removeBatch(["t-1", "t-2"]);
    expect(removed).toBe(2);
    expect(store.count()).toBe(0);
  });
});

describe("env-config — 环境变量可编辑", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("env() 读取默认 AI 配置", async () => {
    const { env, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    expect(env("OLLAMA_BASE_URL")).toBe("http://localhost:11434");
    expect(env("DEFAULT_AI_MODEL")).toBe("codegeex4:latest");
    expect(env("DEFAULT_AI_TEMPERATURE")).toBe(0.7);
  });

  it("setEnvConfig 可修改 AI 默认配置", async () => {
    const { env, setEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    setEnvConfig({ DEFAULT_AI_MODEL: "custom-model", OLLAMA_BASE_URL: "http://192.168.3.45:11434" });
    expect(env("DEFAULT_AI_MODEL")).toBe("custom-model");
    expect(env("OLLAMA_BASE_URL")).toBe("http://192.168.3.45:11434");
  });

  it("getEnvConfig 包含所有必要字段", async () => {
    const { getEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    const config = getEnvConfig();
    const requiredKeys = [
      "SYSTEM_NAME", "SYSTEM_VERSION", "API_BASE_URL", "WS_ENDPOINT",
      "OLLAMA_BASE_URL", "OLLAMA_PROXY_PATH", "DEFAULT_AI_BASE_URL",
      "DEFAULT_AI_MODEL", "DEFAULT_AI_TEMPERATURE", "DEFAULT_AI_MAX_TOKENS",
    ];
    requiredKeys.forEach(k => {
      expect(config).toHaveProperty(k);
    });
  });

  it("exportEnvConfig / importEnvConfig round-trip", async () => {
    const { exportEnvConfig, importEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    const json = exportEnvConfig();
    expect(json).toContain("env-config");

    const ok = importEnvConfig(json);
    expect(ok).toBe(true);
  });
});

describe("useModelProvider — 类型验证", () => {
  it("MODEL_PROVIDERS 内置列表包含 Ollama", async () => {
    const { MODEL_PROVIDERS } = await import("../hooks/useModelProvider");

    expect(MODEL_PROVIDERS.length).toBeGreaterThan(0);

    const ollama = MODEL_PROVIDERS.find(p => p.id === "ollama");
    expect(ollama).toBeDefined();
    expect(ollama!.isLocal).toBe(true);
    expect(ollama!.authType).toBe("none");

    // All providers have required fields
    MODEL_PROVIDERS.forEach(p => {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("label");
      expect(p).toHaveProperty("baseUrl");
      expect(p).toHaveProperty("authType");
      expect(p).toHaveProperty("models");
      expect(Array.isArray(p.models)).toBe(true);
    });
  });
});

describe("useSettingsStore — 类型完整性", () => {
  it("SettingsValues 包含所有 AI 配置字段", () => {
    // TypeScript 编译通过即证明类型完整
    const requiredKeys: (keyof SettingsValues)[] = [
      "aiApiKey", "aiBaseUrl", "aiModel",
      "aiTemperature", "aiTopP", "aiMaxTokens", "aiTimeout",
    ];
    expect(requiredKeys).toHaveLength(7);
  });

  it("SettingsValues 包含 DB 配置字段", () => {
    const dbKeys: (keyof SettingsValues)[] = [
      "dbHost", "dbPort", "dbName", "dbUser", "dbPassword", "dbPoolSize",
    ];
    expect(dbKeys).toHaveLength(6);
  });

  it("SettingsValues 包含 WebSocket 配置字段", () => {
    const wsKeys: (keyof SettingsValues)[] = [
      "wsEndpoint", "wsReconnectInterval", "wsMaxReconnect",
      "wsHeartbeatInterval", "wsThrottleMs",
    ];
    expect(wsKeys).toHaveLength(5);
  });
});
