import { describe, expect, it } from "vitest";
import {
  buildRequestBody,
  getDefaultBase,
  getProviderEndpoints,
  isCustomType,
  parseResponse,
} from "./provider";
import type { GatewayConfig } from "./types";

describe("llm-gateway provider helpers", () => {
  it("builds OpenRouter endpoints with auth and metadata headers", () => {
    const gateway: GatewayConfig = {
      type: "openrouter",
      baseUrl: "",
      apiKey: "secret",
    };

    const endpoints = getProviderEndpoints(gateway, "openai/gpt-4.1");

    expect(endpoints.chatUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(endpoints.modelsUrl).toBe("https://openrouter.ai/api/v1/models");
    expect(endpoints.headers.Authorization).toBe("Bearer secret");
    expect(endpoints.headers["HTTP-Referer"]).toContain("llm-eval-games");
  });

  it("uses custom headers and model placeholders for custom gateways", () => {
    const gateway: GatewayConfig = {
      type: "custom_openai",
      baseUrl: "https://api.example.com/models/{model}/chat",
      apiKey: "secret",
      customHeaders: { Authorization: "Bearer custom" },
    };

    const endpoints = getProviderEndpoints(gateway, "demo/model");

    expect(endpoints.chatUrl).toBe("https://api.example.com/models/demo%2Fmodel/chat");
    expect(endpoints.headers.Authorization).toBe("Bearer custom");
    expect(endpoints.headers["api-key"]).toBeUndefined();
  });

  it("builds Anthropic-compatible request bodies with separated system prompts", () => {
    const body = buildRequestBody(
      {
        type: "custom_anthropic",
        baseUrl: "https://api.example.com/converse",
        apiKey: "secret",
      },
      "judge-1",
      [
        { role: "system", content: "Be strict" },
        { role: "user", content: "Question" },
      ],
    ) as Record<string, unknown>;

    expect(body.system).toEqual([{ text: "Be strict" }]);
    expect(body.messages).toEqual([
      { role: "user", content: [{ text: "Question" }] },
    ]);
  });

  it("parses Gemini-style responses", () => {
    const parsed = parseResponse(
      {
        type: "custom_gemini",
        baseUrl: "https://api.example.com/generateContent",
        apiKey: "secret",
      },
      {
        candidates: [{ content: { parts: [{ text: "hello" }] } }],
        usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7 },
      },
    );

    expect(parsed).toEqual({
      content: "hello",
      promptTokens: 11,
      completionTokens: 7,
    });
  });

  it("keeps default provider helpers consistent", () => {
    expect(isCustomType("custom")).toBe(true);
    expect(isCustomType("openrouter")).toBe(false);
    expect(getDefaultBase("github_copilot")).toBe("https://models.inference.ai.azure.com");
    expect(getDefaultBase("openrouter")).toBe("https://openrouter.ai/api/v1");
  });
});