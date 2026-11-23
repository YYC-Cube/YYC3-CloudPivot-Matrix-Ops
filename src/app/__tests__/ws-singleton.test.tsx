/**
 * @file: ws-singleton.test.tsx
 * @description: WS 单实例契约测试 — 多消费者共享一条连接、状态广播、端点变更重连（落档 67）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-23
 * @updated: 2026-11-23
 * @status: active
 * @tags: [test],[websocket],[singleton]
 */

// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useWebSocketData, __resetWebSocketDataControllerForTests,
} from "../hooks/useWebSocketData";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";
import { enableDemoModeForTests } from "./helpers/demo-mode";

enableDemoModeForTests();

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static CONNECTING = 0;
  static created: MockWebSocket[] = [];
  url = "";
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.created.push(this);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) { this.onclose(); }
  }

  send(_data: string) { }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) { this.onopen(); }
  }

  simulateMessage(data: object) {
    if (this.onmessage) { this.onmessage({ data: JSON.stringify(data) }); }
  }
}

vi.mock("../lib/api-config", () => ({
  getAPIConfig: () => ({ wsEndpoint: "ws://localhost:3113/ws" }),
  DEFAULT_WS_ENDPOINT: "ws://localhost:3113/ws",
  onAPIConfigChange: () => () => {},
  setAPIConfig: () => ({}),
  resetAPIConfig: () => ({}),
}));
vi.mock("../lib/env-config", () => ({
  env: () => "",
  onEnvConfigChange: () => () => {},
}));

describe("WS 单实例契约（落档 67 / C-1）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.created = [];
    __resetWebSocketDataControllerForTests();
    (globalThis as any).WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetWebSocketDataControllerForTests();
  });

  it("多消费者只建一条 WebSocket 连接", () => {
    const a = renderHook(() => useWebSocketData());
    const b = renderHook(() => useWebSocketData());
    const c = renderHook(() => useWebSocketData());

    act(() => { vi.advanceTimersByTime(0); });

    expect(MockWebSocket.created).toHaveLength(1);
    // 三个消费者拿到同一份快照对象（同一引用 = 同一状态源）
    expect(a.result.current).toBe(b.result.current);
    expect(b.result.current).toBe(c.result.current);
  });

  it("一条连接的消息广播到全部消费者（node_status 权威快照）", () => {
    const a = renderHook(() => useWebSocketData());
    const b = renderHook(() => useWebSocketData());
    act(() => {
      vi.advanceTimersByTime(0);
      MockWebSocket.created[0]?.simulateOpen();
    });
    const snapshotNodes = [
      { id: "n1", status: "active", gpu: 10, mem: 20, temp: 0, model: "", tasks: 0, gpuAvailable: true },
      { id: "n2", status: "active", gpu: 30, mem: 40, temp: 0, model: "", tasks: 0, gpuAvailable: true },
    ];
    act(() => {
      MockWebSocket.created[0]?.simulateMessage({ type: "node_status", payload: snapshotNodes });
    });
    expect(a.result.current.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(b.result.current.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(a.result.current.connectionState).toBe("connected");
    expect(b.result.current.connectionState).toBe("connected");
  });

  it("端点变更即整代重启：旧连接关闭、按新端点重连", () => {
    renderHook(() => useWebSocketData());
    act(() => { vi.advanceTimersByTime(0); });
    expect(MockWebSocket.created).toHaveLength(1);
    act(() => {
      useSettingsSSOT.getState().updateValue("wsEndpoint", "ws://10.0.0.5:3113/ws");
    });
    expect(MockWebSocket.created).toHaveLength(2); // 新代连接已建
    expect(MockWebSocket.created[0]?.readyState).toBe(MockWebSocket.CLOSED);
    expect(MockWebSocket.created[1]?.url).toContain("10.0.0.5:3113");
  });

  it("新端点按设置拼接 wsToken（鉴权 URL 语义保留）", () => {
    renderHook(() => useWebSocketData());
    act(() => {
      vi.advanceTimersByTime(0);
      useSettingsSSOT.getState().updateValue("wsToken", "test-token-placeholder");
    });
    // wsToken 变更不触发端点重启，但下次连接会带上 token 参数；此处校验当前 URL 未拼接（旧代）
    expect(MockWebSocket.created[0]?.url).not.toContain("token=");
    act(() => {
      useSettingsSSOT.getState().updateValue("wsEndpoint", "ws://10.0.0.9:3113/ws");
    });
    expect(MockWebSocket.created[1]?.url).toContain("token=test-token-placeholder");
  });
});
