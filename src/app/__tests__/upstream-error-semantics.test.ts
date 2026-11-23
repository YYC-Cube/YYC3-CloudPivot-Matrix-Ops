/**
 * @file: upstream-error-semantics.test.ts
 * @description: 上游错误语义单测 — 状态码解释/错误体解析（落档 73，覆盖 model-request 错误分支）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-24
 * @updated: 2026-11-24
 * @status: active
 * @tags: [test],[model-request],[error-semantics]
 */

import { describe, it, expect } from "vitest";
import { explainUpstreamStatus, extractUpstreamMessage } from "../lib/model-request";

describe("explainUpstreamStatus（上游状态码语义，落档 65）", () => {
  it("400 guardrail 标注「与 API Key 无关」", () => {
    const hint = explainUpstreamStatus(400, "输入违反内容安全策略: guardrail_blocked");
    expect(hint).toContain("与 API Key 无关");
  });

  it("401 指向认证失败", () => {
    expect(explainUpstreamStatus(401, "")).toContain("认证失败");
  });

  it("403 model_not_allowed 指向未授权模型", () => {
    const hint = explainUpstreamStatus(403, "虚拟密钥无权访问模型 nemotron");
    expect(hint).toContain("未被授权访问此模型");
  });

  it("402/429 分别指向预算与限流", () => {
    expect(explainUpstreamStatus(402, "")).toContain("预算");
    expect(explainUpstreamStatus(429, "")).toContain("限流");
  });

  it("502/504 指向本地反代不可达并给出数据源入口", () => {
    expect(explainUpstreamStatus(502, "")).toContain("数据源");
    expect(explainUpstreamStatus(504, "")).toContain("数据源");
  });

  it("普通错误码无特定解释（undefined）", () => {
    expect(explainUpstreamStatus(500, "boom")).toBeUndefined();
  });
});

describe("extractUpstreamMessage（错误体解析）", () => {
  it("嵌套 OpenAI 形态 detail.error.message", () => {
    const body = JSON.stringify({ detail: { error: { message: "vk 无权访问", type: "model_not_allowed" } } });
    expect(extractUpstreamMessage(body)).toBe("vk 无权访问");
  });

  it("标准形态 error.message", () => {
    const body = JSON.stringify({ error: { message: "Invalid API key" } });
    expect(extractUpstreamMessage(body)).toBe("Invalid API key");
  });

  it("纯文本错误体按原文返回", () => {
    expect(extractUpstreamMessage("Bad Gateway")).toBe("Bad Gateway");
  });

  it("空体返回空串", () => {
    expect(extractUpstreamMessage("")).toBe("");
  });
});
