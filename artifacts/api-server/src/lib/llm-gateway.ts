import { logger } from "./logger";
import { resolve as dnsResolve } from "node:dns/promises";

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
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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

  try {
    const addresses = await dnsResolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new Error(`Gateway hostname ${hostname} resolves to private IP ${addr}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("resolves to private IP")) {
      throw err;
    }
  }
}

const GITHUB_MODELS_BASE = "https://models.inference.ai.azure.com";

function getProviderEndpoints(gateway: GatewayConfig): { chatUrl: string; modelsUrl: string; headers: Record<string, string> } {
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
      headers["HTTP-Referer"] = "https://llm-championship.replit.app";
      headers["X-Title"] = "LLM Championship";
      return {
        chatUrl: `${base}/chat/completions`,
        modelsUrl: `${base}/models`,
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

export async function chatCompletion(
  gateway: GatewayConfig,
  modelId: string,
  messages: ChatMessage[],
): Promise<ChatCompletionResult> {
  await validateGatewayUrl(gateway.baseUrl || getDefaultBase(gateway.type));
  const startTime = Date.now();

  const { chatUrl, headers } = getProviderEndpoints(gateway);

  const body = {
    model: modelId,
    messages,
    temperature: 0.7,
  };

  const response = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "error",
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText, modelId, provider: gateway.type }, "LLM API error");
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as OpenAIChatResponse;
  const durationMs = Date.now() - startTime;

  const content = data.choices?.[0]?.message?.content ?? "";
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;

  return { content, promptTokens, completionTokens, durationMs };
}

export async function listModelsFromGateway(
  gateway: GatewayConfig,
): Promise<Array<{ id: string; name: string }>> {
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

function getDefaultBase(type: string): string {
  switch (type) {
    case "github_copilot":
      return GITHUB_MODELS_BASE;
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    default:
      return "";
  }
}
