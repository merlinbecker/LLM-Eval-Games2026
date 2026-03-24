import { logger } from "./logger";
import { resolve4, resolve6 } from "node:dns/promises";
import { store } from "@workspace/store";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

interface GatewayConfig {
  type: string;
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface AnthropicConverseResponse {
  output?: { message?: { content?: Array<{ text?: string }> } };
  usage?: { inputTokens?: number; outputTokens?: number };
}

interface GeminiGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

interface OpenAIModelEntry {
  id?: string;
  name?: string;
}

interface OpenAIModelsResponse {
  data?: OpenAIModelEntry[];
}

interface OpenRouterModelsResponse {
  data?: Array<{ id?: string; name?: string; pricing?: { prompt?: string; completion?: string } }>;
}

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]",
  "169.254.169.254", "metadata.google.internal",
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^::1$/,
  /^::$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(ip));
}

async function validateGatewayUrl(baseUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Invalid gateway URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`Gateway URL must use HTTPS (got ${parsed.protocol})`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Gateway URL points to a blocked host");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost")) {
    throw new Error("Gateway URL points to a blocked host");
  }
  if (isPrivateIp(hostname)) {
    throw new Error("Gateway URL points to a private/reserved IP range");
  }

  const allAddresses: string[] = [];
  try {
    const v4 = await resolve4(hostname);
    allAddresses.push(...v4);
  } catch {}
  try {
    const v6 = await resolve6(hostname);
    allAddresses.push(...v6);
  } catch {}
  if (allAddresses.length === 0) {
    throw new Error(`Gateway hostname ${hostname} could not be resolved`);
  }
  for (const addr of allAddresses) {
    if (isPrivateIp(addr)) {
      throw new Error(`Gateway hostname ${hostname} resolves to private IP ${addr}`);
    }
  }
}

const GITHUB_MODELS_BASE = "https://models.inference.ai.azure.com";

function isCustomType(type: string): boolean {
  return type === "custom" || type === "custom_openai" || type === "custom_anthropic" || type === "custom_gemini";
}

function resolveCustomUrl(baseUrl: string, modelId: string): string {
  return baseUrl.replace(/\{model\}/g, encodeURIComponent(modelId));
}

function getProviderEndpoints(gateway: GatewayConfig, modelId?: string): { chatUrl: string; modelsUrl: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (gateway.type) {
    case "github_copilot": {
      const base = gateway.baseUrl || GITHUB_MODELS_BASE;
      headers["Authorization"] = `Bearer ${gateway.apiKey}`;
      return {
        chatUrl: `${base}/chat/completions`,
        modelsUrl: `${base}/models`,
        headers,
      };
    }
    case "openrouter": {
      const base = gateway.baseUrl || "https://openrouter.ai/api/v1";
      headers["Authorization"] = `Bearer ${gateway.apiKey}`;
      headers["HTTP-Referer"] = "https://llm-eval-games.replit.app";
      headers["X-Title"] = "LLM Eval Games 2026";
      return {
        chatUrl: `${base}/chat/completions`,
        modelsUrl: `${base}/models`,
        headers,
      };
    }
    case "custom_openai":
    case "custom_anthropic":
    case "custom_gemini":
    case "custom": {
      // Custom headers override defaults; apiKey is NOT auto-added as Authorization
      if (gateway.customHeaders) {
        for (const [key, value] of Object.entries(gateway.customHeaders)) {
          headers[key] = value;
        }
      }
      // If no custom auth header is set but apiKey is provided, add api-key header
      const hasAuthHeader = gateway.customHeaders && Object.keys(gateway.customHeaders).some(
        k => k.toLowerCase() === "authorization" || k.toLowerCase() === "api-key"
      );
      if (!hasAuthHeader && gateway.apiKey) {
        headers["api-key"] = gateway.apiKey;
      }
      const chatUrl = modelId ? resolveCustomUrl(gateway.baseUrl, modelId) : gateway.baseUrl;
      return {
        chatUrl,
        modelsUrl: "", // Custom gateways have no models endpoint
        headers,
      };
    }
    default: {
      headers["Authorization"] = `Bearer ${gateway.apiKey}`;
      return {
        chatUrl: `${gateway.baseUrl}/chat/completions`,
        modelsUrl: `${gateway.baseUrl}/models`,
        headers,
      };
    }
  }
}

function splitMessages(messages: ChatMessage[]): { system: ChatMessage[]; conversation: ChatMessage[] } {
  const system: ChatMessage[] = [];
  const conversation: ChatMessage[] = [];
  for (const m of messages) {
    (m.role === "system" ? system : conversation).push(m);
  }
  return { system, conversation };
}

function resolveEffectiveType(type: string): string {
  return type === "custom" ? "custom_openai" : type;
}

function buildRequestBody(gateway: GatewayConfig, modelId: string, messages: ChatMessage[]): unknown {
  const effectiveType = resolveEffectiveType(gateway.type);

  switch (effectiveType) {
    case "custom_anthropic": {
      const { system, conversation } = splitMessages(messages);
      const body: Record<string, unknown> = {
        messages: conversation.map(m => ({
          role: m.role as "user" | "assistant",
          content: [{ text: m.content }],
        })),
        inferenceConfig: {
          maxTokens: 4096,
          temperature: 0.7,
        },
      };
      if (system.length > 0) {
        body.system = system.map(m => ({ text: m.content }));
      }
      return body;
    }
    case "custom_gemini": {
      const { system, conversation } = splitMessages(messages);
      const body: Record<string, unknown> = {
        contents: conversation.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          topP: 1.0,
          topK: 4,
        },
      };
      if (system.length > 0) {
        body.systemInstruction = {
          role: "user",
          parts: system.map(m => ({ text: m.content })),
        };
      }
      return body;
    }
    default: {
      return {
        model: modelId,
        messages,
        temperature: 0.7,
      };
    }
  }
}

function parseResponse(gateway: GatewayConfig, data: unknown): { content: string; promptTokens: number; completionTokens: number } {
  const effectiveType = resolveEffectiveType(gateway.type);

  switch (effectiveType) {
    case "custom_anthropic": {
      const resp = data as AnthropicConverseResponse;
      const content = resp.output?.message?.content?.[0]?.text ?? "";
      const promptTokens = resp.usage?.inputTokens ?? 0;
      const completionTokens = resp.usage?.outputTokens ?? 0;
      return { content, promptTokens, completionTokens };
    }
    case "custom_gemini": {
      const resp = data as GeminiGenerateResponse;
      const content = resp.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const promptTokens = resp.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = resp.usageMetadata?.candidatesTokenCount ?? 0;
      return { content, promptTokens, completionTokens };
    }
    default: {
      // OpenAI-compatible
      const resp = data as OpenAIChatResponse;
      const content = resp.choices?.[0]?.message?.content ?? "";
      const promptTokens = resp.usage?.prompt_tokens ?? 0;
      const completionTokens = resp.usage?.completion_tokens ?? 0;
      return { content, promptTokens, completionTokens };
    }
  }
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

export function getDefaultBase(type: string): string {
  switch (type) {
    case "github_copilot":
      return GITHUB_MODELS_BASE;
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    default:
      return "";
  }
}
