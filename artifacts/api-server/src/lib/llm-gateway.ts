import { logger } from "./logger";
import { store } from "@workspace/store";
import {
  buildRequestBody,
  getDefaultBase,
  getProviderEndpoints,
  isCustomType,
  parseResponse,
} from "./llm-gateway/provider";
import { validateGatewayUrl } from "./llm-gateway/security";
import type {
  ChatCompletionResult,
  ChatMessage,
  GatewayConfig,
  OpenAIModelEntry,
  OpenAIModelsResponse,
  OpenRouterModelsResponse,
} from "./llm-gateway/types";

export type { ChatCompletionResult, ChatMessage } from "./llm-gateway/types";
export { getDefaultBase } from "./llm-gateway/provider";

import type { Gateway } from "@workspace/store";

/** Convert a store Gateway entity into the leaner GatewayConfig required by chatCompletion / listModels. */
export function toGatewayConfig(g: Gateway): GatewayConfig {
  return { type: g.type, baseUrl: g.baseUrl, apiKey: g.apiKey, customHeaders: g.customHeaders };
}

export async function chatCompletion(
  gateway: GatewayConfig,
  modelId: string,
  messages: ChatMessage[],
  sessionId?: string,
): Promise<ChatCompletionResult> {
  await validateGatewayUrl(gateway.baseUrl || getDefaultBase(gateway.type));
  const startTime = Date.now();

  const { chatUrl, headers } = getProviderEndpoints(gateway, modelId);
  const body = buildRequestBody(gateway, modelId, messages);

  const response = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "error",
  });

  if (!response.ok) {
    const errorText = await response.text();
    const durationMs = Date.now() - startTime;
    logger.error({ status: response.status, errorText, modelId, provider: gateway.type }, "LLM API error");

    logLlmCall(sessionId, {
      gatewayType: gateway.type, modelId, requestUrl: chatUrl,
      requestBody: body, responseStatus: response.status,
      responseBody: { error: errorText }, durationMs, error: errorText,
    });

    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const durationMs = Date.now() - startTime;

  const { content, promptTokens, completionTokens } = parseResponse(gateway, data);

  logLlmCall(sessionId, {
    gatewayType: gateway.type, modelId, requestUrl: chatUrl,
    requestBody: body, responseStatus: response.status,
    responseBody: data, durationMs, error: null,
  });

  return { content, promptTokens, completionTokens, durationMs };
}

function logLlmCall(
  sessionId: string | undefined,
  data: Omit<import("@workspace/store").LlmLog, "id" | "timestamp">,
): void {
  if (!sessionId) return;
  try {
    store.addLlmLog(sessionId, { timestamp: new Date().toISOString(), ...data });
  } catch { /* ignore logging errors */ }
}

export async function listModelsFromGateway(
  gateway: GatewayConfig,
): Promise<Array<{ id: string; name: string }>> {
  // Custom gateways have no models endpoint
  if (isCustomType(gateway.type)) {
    return [];
  }

  await validateGatewayUrl(gateway.baseUrl || getDefaultBase(gateway.type));

  const { modelsUrl, headers } = getProviderEndpoints(gateway);
  delete headers["Content-Type"];

  try {
    const response = await fetch(modelsUrl, { headers, redirect: "error" });
    if (!response.ok) {
      logger.warn({ status: response.status, type: gateway.type }, "Failed to list models");
      return [];
    }

    if (gateway.type === "openrouter") {
      const data = await response.json() as OpenRouterModelsResponse;
      const models = data.data ?? [];
      return models.map((m) => ({
        id: m.id ?? "",
        name: m.name ?? m.id ?? "",
      }));
    }

    const data = await response.json() as OpenAIModelsResponse;
    const models: OpenAIModelEntry[] = data.data ?? [];
    return Array.isArray(models)
      ? models.map((m) => ({ id: m.id ?? m.name ?? "", name: m.name ?? m.id ?? "" }))
      : [];
  } catch (err) {
    logger.error({ err, type: gateway.type }, "Error listing models");
    return [];
  }
}

