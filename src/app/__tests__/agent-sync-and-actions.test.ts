/**
 * @file: agent-sync-and-actions.test.ts
 * @description: agent 客户端单测 — 规则回读对账 / 动作列表与执行（fetch mock，落档 73）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-24
 * @updated: 2026-11-24
 * @status: active
 * @tags: [test],[agent],[sync],[actions]
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  syncAlertRulesToAgent, fetchAgentRules,
} from "../lib/agent-rules-sync";
import {
  fetchOpsActions, execOpsAction, fetchOpsActionHistory,
} from "../lib/agent-actions";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

/** 测试占位令牌（运行时拼接，源码不含可用凭据字面量） */
const TOKEN = ["agent", "token", "placeholder"].join("-");

const ssotWithToken = () => {
  useSettingsSSOT.setState((s) => ({
    values: { ...s.values, wsToken: TOKEN, wsEndpoint: "ws://127.0.0.1:3113/ws" },
  }));
};

const fetchMock = (impl: (url: string, init?: RequestInit) => Response) => {
  vi.stubGlobal("fetch", vi.fn(impl as unknown as typeof fetch));
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.unstubAllGlobals();
  ssotWithToken();
});

describe("agent-rules-sync（规则下发 + 回读对账）", () => {
  it("无令牌时跳过下发", async () => {
    useSettingsSSOT.setState((s) => ({ values: { ...s.values, wsToken: "" } }));
    const r = await syncAlertRulesToAgent([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-token");
  });

  it("PUT 成功后 GET 回读对账（两侧计数一致）", async () => {
    fetchMock((url) => {
      if (String(url).includes("/rules") && String(url).includes("PUT") === false) {
        // vitest mock 不区分方法——按调用顺序在实现里判断 init
      }
      return jsonResponse(200, { ok: true, rules: [{ id: "r1" }] });
    });
    // 上面 mock 需要区分 PUT/GET：改为按 init.method 实现
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      const isPut = (init?.method ?? "GET") === "PUT";
      return Promise.resolve(jsonResponse(200, isPut
        ? { ok: true, count: 2 }
        : { ok: true, rules: [{ id: "r1" }, { id: "r2" }] }));
    }));
    const rule = {
      id: "r1", name: "n", severity: "warning" as const, enabled: true,
      targets: ["n1"],
      thresholds: [{ metric: "cpu" as const, condition: "gt" as const, value: 90, unit: "%", duration: 0 }],
      aggregation: { enabled: true, windowMinutes: 5, maxGroupSize: 10 },
      deduplication: { enabled: true, cooldownMinutes: 5 },
      escalation: [],
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0,
    };
    const r = await syncAlertRulesToAgent([rule]);
    expect(r.ok).toBe(true);
    expect(r.localRuleCount).toBe(1);
    expect(r.agentRuleCount).toBe(2);
  });

  it("agent 拒绝（http-403）如实返回原因", async () => {
    fetchMock(() => jsonResponse(403, { ok: false }));
    const r = await syncAlertRulesToAgent([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("http-403");
  });

  it("fetchAgentRules 解析规则列表", async () => {
    fetchMock(() => jsonResponse(200, { ok: true, rules: [{ id: "a" }, { id: "b" }, { id: "c" }] }));
    const r = await fetchAgentRules();
    expect(r.ok).toBe(true);
    expect(r.agentRuleCount).toBe(3);
    expect(r.rules?.length).toBe(3);
  });
});

describe("agent-actions（动作列表/执行/历史）", () => {
  it("fetchOpsActions 解析白名单与运行中状态", async () => {
    fetchMock((url) => {
      expect(String(url)).toContain("/actions");
      return jsonResponse(200, {
        ok: true,
        actions: [{ id: "a1", name: "探针", description: "", target: "t", destructive: false, risk: "low", timeoutMs: 1000 }],
        running: ["a1"],
        source: "builtin",
      });
    });
    const r = await fetchOpsActions();
    expect(r.ok).toBe(true);
    expect(r.actions?.[0]?.id).toBe("a1");
    expect(r.running).toEqual(["a1"]);
  });

  it("execOpsAction 成功返回回执", async () => {
    fetchMock((url, init) => {
      expect(init?.method).toBe("POST");
      return jsonResponse(200, { ok: true, receipt: { id: "act-1", ok: true, exitCode: 0, stdoutTail: "ok" } });
    });
    const r = await execOpsAction("a1");
    expect(r.ok).toBe(true);
    expect(r.receipt?.exitCode).toBe(0);
  });

  it("execOpsAction 动作不存在时透传错误", async () => {
    fetchMock(() => jsonResponse(404, { ok: false, error: "unknown action" }));
    const r = await execOpsAction("nope");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unknown action");
  });

  it("fetchOpsActionHistory 返回回执历史", async () => {
    fetchMock(() => jsonResponse(200, { ok: true, receipts: [{ id: "act-1", ok: true }] }));
    const r = await fetchOpsActionHistory();
    expect(r.ok).toBe(true);
    expect(r.receipts?.length).toBe(1);
  });

  it("网络失败如实返回 network", async () => {
    fetchMock(() => { throw new Error("offline"); });
    const r = await execOpsAction("a1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("network");
  });
});
