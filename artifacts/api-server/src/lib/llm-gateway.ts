import { logger } from "./logger";

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

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]",
  "169.254.169.254", "metadata.google.internal",
];

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^::1$/,
  /^::$/,
];

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(hostname));
}

function validateGatewayUrl(baseUrl: string): void {
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
  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new Error("Gateway URL points to a blocked host");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost")) {
    throw new Error("Gateway URL points to a blocked host");
  }
  if (isPrivateIp(hostname)) {
    throw new Error("Gateway URL points to a private/reserved IP range");
  }
  if (parsed.port && !["443", ""].includes(parsed.port)) {
    const portNum = Number(parsed.port);
    if (portNum < 1024 && portNum !== 443) {
      throw new Error("Gateway URL uses a restricted port");
    }
  }
}

export async function chatCompletion(
  gateway: GatewayConfig,
  modelId: string,
  messages: ChatMessage[],
): Promise<ChatCompletionResult> {
  validateGatewayUrl(gateway.baseUrl);
  const startTime = Date.now();

  const url = `${gateway.baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${gateway.apiKey}`,
  };

  const body = {
    model: modelId,
    messages,
    temperature: 0.7,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText, modelId }, "LLM API error");
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
  validateGatewayUrl(gateway.baseUrl);

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${gateway.apiKey}`,
  };

  const url = `${gateway.baseUrl}/models`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      logger.warn({ status: response.status, type: gateway.type }, "Failed to list models");
      return [];
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
