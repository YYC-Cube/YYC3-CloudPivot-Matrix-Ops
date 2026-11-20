/**
 * @file: full-backup-redaction.test.ts
 * @description: 全量备份脱敏与恢复白名单单测（落档 59）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [test],[backup],[security]
 */

import { describe, it, expect, beforeEach } from "vitest";
import { exportFullBackup, importFullBackup } from "../lib/full-backup";
import { REDACTED } from "../lib/storage-registry";

beforeEach(() => {
  localStorage.clear();
});

describe("全量备份脱敏", () => {
  it("导出时敏感字段替换为 [REDACTED]，非项目键不进入备份", async () => {
    localStorage.setItem("yyc3-provider-slice", JSON.stringify({
      state: { configuredModels: [{ id: "m1", apiKey: "sk-real-key", model: "x" }] },
      version: 0,
    }));
    localStorage.setItem("other-app", "secret");
    const backup = JSON.parse(await exportFullBackup());
    expect(backup._version).toBe(2);
    expect(backup._redacted).toBe(true);
    const provider = JSON.parse(backup.localStorage["yyc3-provider-slice"]);
    expect(provider.state.configuredModels[0].apiKey).toBe(REDACTED);
    expect(provider.state.configuredModels[0].model).toBe("x");
    expect(backup.localStorage["other-app"]).toBeUndefined();
  });

  it("恢复时跳过认证键、非项目键与脱敏占位", async () => {
    const backup = {
      _version: 2,
      _redacted: true,
      _exportedAt: new Date().toISOString(),
      _tool: "yyc3-full-backup",
      localStorage: {
        "yyc3-provider-slice": JSON.stringify({ state: { configuredModels: [{ apiKey: REDACTED, model: "x" }] } }),
        "yyc3_session": JSON.stringify({ user: "ghost" }),
        "other-app": "should-not-restore",
        "yyc3_locale": "zh-CN",
      },
      indexedDB: {},
      globalStore: "",
    };
    const result = await importFullBackup(JSON.stringify(backup));
    expect(result.success).toBe(true);
    // 认证键不恢复
    expect(localStorage.getItem("yyc3_session")).toBeNull();
    // 非项目键不恢复
    expect(localStorage.getItem("other-app")).toBeNull();
    // 脱敏占位被移除，真实字段保留
    const restored = JSON.parse(localStorage.getItem("yyc3-provider-slice")!);
    expect(restored.state.configuredModels[0].apiKey).toBeUndefined();
    expect(restored.state.configuredModels[0].model).toBe("x");
    expect(localStorage.getItem("yyc3_locale")).toBe("zh-CN");
  });

  it("拒绝未知版本备份", async () => {
    const result = await importFullBackup(JSON.stringify({
      _version: 99, _tool: "yyc3-full-backup", localStorage: {}, indexedDB: {}, globalStore: "",
    }));
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Unsupported backup version");
  });
});
