/**
 * @file: provider-key-propagation.test.ts
 * @description: 服务商级 Key 传播单测 — 换 Key 后挂在名下的模型必须同步（落档 65）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [test],[provider],[credentials]
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useProviderSlice } from "../store/slices/provider-slice";

/** 测试用占位值：运行时拼接，源码不含可用凭据字面量（Mimosa 约束） */
const placeholder = (...parts: string[]) => parts.join("-");
const INHERITED = "";
const MODEL_OWN = placeholder("model", "own", "placeholder");
const PROVIDER_KEY_1 = placeholder("provider", "placeholder", "1");
const PROVIDER_KEY_2 = placeholder("provider", "placeholder", "2");

const provider = {
  id: "yyc3",
  label: "YanYuCloudCube (YYC³)",
  baseUrl: "http://localhost:3118/api/v1/llm/nas/v1",
  authType: "api-key" as const,
  models: [] as string[],
  requiresApiKey: true,
  isLocal: false,
  isBuiltin: true,
};

const modelBase = {
  providerId: "yyc3",
  providerLabel: provider.label,
  baseUrl: provider.baseUrl,
  apiFormat: "openai" as const,
  createdAt: 0,
  lastUsed: null,
  status: "unchecked" as const,
};

beforeEach(() => {
  useProviderSlice.setState({
    providers: [{ ...provider }],
    configuredModels: [
      { ...modelBase, id: "inherited", model: "nemotron", apiKey: INHERITED },
      { ...modelBase, id: "model-specific", model: "other", apiKey: MODEL_OWN },
    ],
    testingIds: [],
  });
});

describe("服务商级 Key 传播（落档 65）", () => {
  it("服务商换 Key：空 Key 模型同步，模型级独立 Key 不被覆盖", () => {
    useProviderSlice.getState().updateProvider("yyc3", { apiKey: PROVIDER_KEY_1 });
    const models = useProviderSlice.getState().configuredModels;
    expect(models.find((m) => m.id === "inherited")?.apiKey).toBe(PROVIDER_KEY_1);
    expect(models.find((m) => m.id === "model-specific")?.apiKey).toBe(MODEL_OWN);
  });

  it("再次换 Key：仍沿用上一版服务商 Key 的模型继续跟随", () => {
    useProviderSlice.getState().updateProvider("yyc3", { apiKey: PROVIDER_KEY_1 });
    useProviderSlice.getState().updateProvider("yyc3", { apiKey: PROVIDER_KEY_2 });
    const models = useProviderSlice.getState().configuredModels;
    expect(models.find((m) => m.id === "inherited")?.apiKey).toBe(PROVIDER_KEY_2);
    expect(models.find((m) => m.id === "model-specific")?.apiKey).toBe(MODEL_OWN);
  });

  it("新增模型未填 Key 时继承服务商级 Key", () => {
    useProviderSlice.getState().updateProvider("yyc3", { apiKey: PROVIDER_KEY_2 });
    const created = useProviderSlice.getState().addModel("yyc3", "new-model", "");
    expect(created?.apiKey).toBe(PROVIDER_KEY_2);
  });

  it("服务商改 baseUrl：名下模型地址同步", () => {
    const nextBase = "http://10.0.0.5:3118/api/v1/llm/nas/v1";
    useProviderSlice.getState().updateProvider("yyc3", { baseUrl: nextBase });
    for (const m of useProviderSlice.getState().configuredModels) {
      expect(m.baseUrl).toBe(nextBase);
    }
  });
});
