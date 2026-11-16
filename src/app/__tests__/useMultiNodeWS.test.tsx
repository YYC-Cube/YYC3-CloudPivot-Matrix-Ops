/**
 * @file: useMultiNodeWS.test.tsx
 * @description: useMultiNodeWS 测试 — M4 方案 A 连接池行为（建连/跳过主端点/非权威归并/清理）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [hook],[test],[m4]
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useMultiNodeWS } from "../hooks/useMultiNodeWS";
import { useNodeSlice } from "../store/slices/node-slice";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

/** 轻量 WS 假件：记录 URL，支持服务端主动推帧 */
class FakeWS {
  static instances: FakeWS[] = [];
  url: string;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  constructor(url: string) { this.url = url; FakeWS.instances.push(this); }
  close() { this.onclose?.(); }
  /** 模拟远端快照帧 */
  pushSnapshot(nodeId: string, gpu: number) {
    this.onmessage?.({ data: JSON.stringify({ type: "node_status", payload: [{ id: nodeId, status: "active", gpu, mem: 40, temp: 50, model: "m4-test", tasks: 1 }] }) });
  }
}

const TOKEN = ["test-token-000000", "0000"].join("");

function seedNodes() {
  useNodeSlice.setState({
    nodes: [
      { id: "yyc3-22", status: "active", gpu: 10, mem: 30, temp: 45, model: "", tasks: 0, source: "ws" },
      { id: "yyc3-45", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, role: "NAS", host: "100.65.172.88", source: "user" },
      { id: "yyc3-n1", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, role: "DGX", host: "100.65.64.49", wsPort: 3113, source: "user" },
      { id: "yyc3-77", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, role: "iMac", host: "127.0.0.1", source: "user" }, // 与主端点同 host（默认 3113）→ 应跳过
    ],
  });
}

describe("useMultiNodeWS（M4 方案 A）", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
    FakeWS.instances = [];
    useSettingsSSOT.setState({
      values: { ...useSettingsSSOT.getState().values, wsToken: TOKEN },
      toggles: { ...useSettingsSSOT.getState().toggles, demoMode: false },
    });
    seedNodes();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useNodeSlice.setState({ nodes: [] });
  });

  it("按清单建连远端节点，跳过主端点（默认 ws://localhost:3113）", async () => {
    renderHook(() => useMultiNodeWS());
    await waitFor(() => expect(FakeWS.instances.length).toBeGreaterThanOrEqual(2));
    const urls = FakeWS.instances.map((w) => w.url);
    expect(urls.some((u) => u.includes("100.65.172.88:3113"))).toBe(true);   // 默认端口
    expect(urls.some((u) => u.includes("100.65.64.49:3113"))).toBe(true);    // 显式端口
    expect(urls.some((u) => u.includes("token="))).toBe(true);               // 令牌拼接
    // 主端点（localhost:3113 / 同 host 127.0.0.1:3113）不应出现在首批建连里
    expect(urls.some((u) => u.includes("localhost:3113"))).toBe(false);
    expect(urls.some((u) => u.includes("127.0.0.1:3113"))).toBe(false);
  });

  it("远端快照非权威归并：更新目标节点且不清除他节点", async () => {
    renderHook(() => useMultiNodeWS());
    await waitFor(() => expect(FakeWS.instances.length).toBeGreaterThanOrEqual(2));
    const remote = FakeWS.instances.find((w) => w.url.includes("100.65.64.49"));
    expect(remote).toBeTruthy();
    remote!.pushSnapshot("yyc3-n1", 77);
    await waitFor(() => {
      expect(useNodeSlice.getState().nodes.find((n) => n.id === "yyc3-n1")?.gpu).toBe(77);
    });
    const ids = useNodeSlice.getState().nodes.map((n) => n.id);
    expect(ids).toContain("yyc3-45");  // 非权威：他节点未被清除
    expect(ids).toContain("yyc3-22");
  });

  it("未配置令牌时不建连（诚实停用）", () => {
    useSettingsSSOT.setState({ values: { ...useSettingsSSOT.getState().values, wsToken: "" } });
    renderHook(() => useMultiNodeWS());
    expect(FakeWS.instances.length).toBe(0);
  });
});
