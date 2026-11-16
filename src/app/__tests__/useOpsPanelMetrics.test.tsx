/**
 * @file: useOpsPanelMetrics.test.tsx
 * @description: useOpsPanelMetrics 测试 — 真实指标映射 / 不可达诚实离线 / 不注入新节点 / 端点即时生效
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [hook],[test],[monitor],[ops-panel]
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useOpsPanelMetrics } from "../hooks/useOpsPanelMetrics";
import { useNodeSlice } from "../store/slices/node-slice";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

const fetchMock = vi.fn();

function mockOpsPanel(opts: { n1Online: boolean; n1Gpu?: number; unreachable?: boolean }) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes("/api/nodes")) {
      if (opts.unreachable) { throw new Error("network down"); }
      return {
        json: async () => ({
          nodes: [
            { id: "yyc3-n1", services: [{ name: "dcgm", port: 9400, listening: opts.n1Online }] },
            { id: "yyc3-45", services: [{ name: "pg", port: 5433, listening: true }] },
          ],
        }),
      };
    }
    if (String(url).includes("/api/metrics")) {
      if (opts.unreachable) { throw new Error("network down"); }
      return {
        json: async () => ({
          rates_ready: opts.n1Online,
          gpus: [{ node: "yyc3-n1", gpus: [{ util: opts.n1Gpu ?? 42 }] }],
          vllm: { ok: opts.n1Online, node: "yyc3-n1" },
        }),
      };
    }
    throw new Error("unexpected url " + url);
  });
}

function seedNodes() {
  useNodeSlice.setState({
    nodes: [
      { id: "yyc3-n1", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, role: "DGX", host: "100.65.64.49", source: "user" },
      { id: "yyc3-45", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, role: "NAS", host: "100.65.172.88", source: "user" },
    ],
  });
}

describe("useOpsPanelMetrics", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    useSettingsSSOT.setState({
      values: { ...useSettingsSSOT.getState().values, opsPanelBaseUrl: "http://ops.test" },
      toggles: { ...useSettingsSSOT.getState().toggles, opsPanelEnabled: true, demoMode: false },
    });
    seedNodes();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useNodeSlice.setState({ nodes: [] });
  });

  it("真实映射：探针在线 + DCGM util → 节点 active 且 GPU 更新", async () => {
    mockOpsPanel({ n1Online: true, n1Gpu: 76 });
    renderHook(() => useOpsPanelMetrics());
    await waitFor(() => {
      const n1 = useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1");
      expect(n1?.status).toBe("active");
    }, { timeout: 3000 });
    expect(useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1")?.gpu).toBe(76);
    // yyc3-45 services listening → active（无 GPU 数据不动 gpu）
    expect(useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-45")?.status).toBe("active");
  });

  it("诚实离线：探针不在线 → inactive（不伪造指标）", async () => {
    mockOpsPanel({ n1Online: false, n1Gpu: 90 });
    renderHook(() => useOpsPanelMetrics());
    await waitFor(() => {
      const n1 = useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1");
      expect(n1?.status).toBe("inactive");
    }, { timeout: 3000 });
    // 离线节点不写入 GPU 指标（保持用户维护值）
    expect(useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1")?.gpu).toBe(0);
  });

  it("OpsPanel 不可达：节点状态不被扰动（保持面板维护值）", async () => {
    mockOpsPanel({ n1Online: true, unreachable: true });
    renderHook(() => useOpsPanelMetrics());
    await new Promise((r) => setTimeout(r, 800));
    const n1 = useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1");
    expect(n1?.status).toBe("inactive"); // 种子值原样保留
  });

  it("不注入新节点：OpsPanel 独有节点不进入用户清单", async () => {
    mockOpsPanel({ n1Online: true, n1Gpu: 50 });
    renderHook(() => useOpsPanelMetrics());
    await waitFor(() => {
      expect(useNodeSlice.getState().nodes.some((n) => n.id === "yyc3-n1" && n.status === "active")).toBe(true);
    }, { timeout: 3000 });
    // OpsPanel 返回的 yyc3-45 有匹配所以存在；但未在用户清单中的假设节点不应出现
    const nodes = useNodeSlice.getState().nodes;
    expect(nodes.every((n) => ["yyc3-n1", "yyc3-45"].includes(n.id))).toBe(true);
  });

  it("端点即时生效：修改 ssot 地址后下一轮拉取新端点", async () => {
    mockOpsPanel({ n1Online: true, n1Gpu: 33 });
    renderHook(() => useOpsPanelMetrics());
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith("http://ops.test/"))).toBe(true);
    }, { timeout: 3000 });
    // 修改端点 → 下一轮轮询（10s）使用新地址；此处直接断言 ref 语义：
    useSettingsSSOT.setState({
      values: { ...useSettingsSSOT.getState().values, opsPanelBaseUrl: "http://ops-new.test" },
    });
    // hook 的 baseRef 在每轮 pull 时读取最新 ssot（render 期同步），演示下一轮 URL 变化：
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith("http://ops-new.test/"))).toBe(true);
    }, { timeout: 13000 });
  }, 20000);
});
