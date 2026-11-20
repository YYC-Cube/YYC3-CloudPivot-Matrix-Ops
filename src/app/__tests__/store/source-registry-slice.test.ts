/**
 * @file: source-registry-slice.test.ts
 * @description: 数据源注册表单测 — 增删改测、绑定源走 SSOT、必需源不可删（落档 58）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [test],[store],[data-source]
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSourceUrl, setSourceUrl, useSourceRegistry,
} from "../../store/slices/source-registry-slice";
import { useSettingsSSOT } from "../../store/slices/settings-ssot-slice";

const initialSources = useSourceRegistry.getState().sources.map((s) => ({ ...s }));

beforeEach(() => {
  useSourceRegistry.setState({ sources: initialSources.map((s) => ({ ...s })) });
});

describe("useSourceRegistry", () => {
  it("默认登记 agent / OpsPanel 两个绑定源与本地基础源", () => {
    const { sources } = useSourceRegistry.getState();
    const agent = sources.find((s) => s.id === "src-agent");
    const ops = sources.find((s) => s.id === "src-opspanel");
    expect(agent?.binding).toBe("ssot.wsEndpoint");
    expect(ops?.binding).toBe("ssot.opsPanelBaseUrl");
    expect(sources.some((s) => s.kind === "ollama")).toBe(true);
    expect(sources.some((s) => s.kind === "nas-gateway")).toBe(true);
  });

  it("可新增自定义源（非绑定）并可删除", () => {
    const before = useSourceRegistry.getState().sources.length;
    const created = useSourceRegistry.getState().addSource({
      kind: "ollama", label: "备实例", url: "http://127.0.0.1:11435",
    });
    expect(created.binding).toBeNull();
    expect(useSourceRegistry.getState().sources.length).toBe(before + 1);
    useSourceRegistry.getState().removeSource(created.id);
    expect(useSourceRegistry.getState().sources.some((s) => s.id === created.id)).toBe(false);
  });

  it("绑定源不可删除（运行必需）", () => {
    useSourceRegistry.getState().removeSource("src-agent");
    expect(useSourceRegistry.getState().sources.some((s) => s.id === "src-agent")).toBe(true);
  });

  it("测试结果写入 lastTest", () => {
    useSourceRegistry.getState().recordTest("src-ollama", {
      at: 1, ok: true, detail: "HTTP 200", latencyMs: 3,
    });
    const entry = useSourceRegistry.getState().sources.find((s) => s.id === "src-ollama");
    expect(entry?.lastTest?.ok).toBe(true);
    expect(entry?.lastTest?.detail).toBe("HTTP 200");
  });

  it("绑定源改地址写回 Settings SSOT（单一事实源）", () => {
    const agent = useSourceRegistry.getState().sources.find((s) => s.id === "src-agent")!;
    const original = useSettingsSSOT.getState().values.wsEndpoint;
    try {
      setSourceUrl(agent, "ws://127.0.0.1:3114/ws");
      expect(useSettingsSSOT.getState().values.wsEndpoint).toBe("ws://127.0.0.1:3114/ws");
      expect(resolveSourceUrl(agent)).toBe("ws://127.0.0.1:3114/ws");
      // 注册表镜像不被改写，避免出现第二套地址
      expect(agent.url).toBe("ws://localhost:3113/ws");
    } finally {
      useSettingsSSOT.getState().updateValue("wsEndpoint", original);
    }
  });
});
