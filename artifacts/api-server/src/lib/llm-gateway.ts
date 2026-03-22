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

const ALLOWED_URL_PROTOCOLS = ["https:"];
const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254", "metadata.google.internal"];

function validateGatewayUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Invalid gateway URL");
  }
  if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(`Gateway URL must use HTTPS (got ${parsed.protocol})`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Gateway URL points to a blocked host");
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
