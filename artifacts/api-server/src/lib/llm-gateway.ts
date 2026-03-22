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

export async function chatCompletion(
  gateway: GatewayConfig,
  modelId: string,
  messages: ChatMessage[],
): Promise<ChatCompletionResult> {
  const startTime = Date.now();

  let url: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (gateway.type === "github_copilot") {
    url = `${gateway.baseUrl}/chat/completions`;
    headers["Authorization"] = `Bearer ${gateway.apiKey}`;
  } else if (gateway.type === "openrouter") {
    url = `${gateway.baseUrl}/chat/completions`;
    headers["Authorization"] = `Bearer ${gateway.apiKey}`;
  } else {
    url = `${gateway.baseUrl}/chat/completions`;
    headers["Authorization"] = `Bearer ${gateway.apiKey}`;
  }

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

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  const content = data.choices?.[0]?.message?.content ?? "";
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;

  return { content, promptTokens, completionTokens, durationMs };
}

export async function listModelsFromGateway(
  gateway: GatewayConfig,
): Promise<Array<{ id: string; name: string }>> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${gateway.apiKey}`,
  };

  let url: string;
  if (gateway.type === "github_copilot") {
    url = `${gateway.baseUrl}/models`;
  } else if (gateway.type === "openrouter") {
    url = `${gateway.baseUrl}/models`;
  } else {
    url = `${gateway.baseUrl}/models`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      logger.warn({ status: response.status, type: gateway.type }, "Failed to list models");
      return [];
    }

    const data = await response.json() as any;
    const models = data.data ?? data ?? [];
    return Array.isArray(models)
      ? models.map((m: any) => ({ id: m.id ?? m.name, name: m.name ?? m.id }))
      : [];
  } catch (err) {
    logger.error({ err, type: gateway.type }, "Error listing models");
    return [];
  }
}
