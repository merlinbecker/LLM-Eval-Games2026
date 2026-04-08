import type {
  AnthropicConverseResponse,
  ChatMessage,
  GatewayConfig,
  GeminiGenerateResponse,
  OpenAIChatResponse,
} from "./types";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export const GITHUB_MODELS_BASE = "https://models.inference.ai.azure.com";

export function isCustomType(type: string): boolean {
  return (
    type === "custom" ||
    type === "custom_openai" ||
    type === "custom_anthropic" ||
    type === "custom_gemini"
  );
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

function resolveCustomUrl(baseUrl: string, modelId: string): string {
  return baseUrl.replace(/\{model\}/g, encodeURIComponent(modelId));
}

function resolveEffectiveType(type: string): string {
  return type === "custom" ? "custom_openai" : type;
}

function splitMessages(messages: ChatMessage[]): {
  system: ChatMessage[];
  conversation: ChatMessage[];
} {
  const system: ChatMessage[] = [];
  const conversation: ChatMessage[] = [];

  for (const message of messages) {
    (message.role === "system" ? system : conversation).push(message);
  }

  return { system, conversation };
}

export function getProviderEndpoints(
  gateway: GatewayConfig,
  modelId?: string,
): { chatUrl: string; modelsUrl: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (gateway.type) {
    case "github_copilot": {
      const base = gateway.baseUrl || GITHUB_MODELS_BASE;
      headers.Authorization = `Bearer ${gateway.apiKey}`;

      return {
        chatUrl: `${base}/chat/completions`,
        modelsUrl: `${base}/models`,
        headers,
      };
    }

    case "openrouter": {
      const base = gateway.baseUrl || getDefaultBase(gateway.type);
      headers.Authorization = `Bearer ${gateway.apiKey}`;
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
      if (gateway.customHeaders) {
        for (const [key, value] of Object.entries(gateway.customHeaders)) {
          headers[key] = value;
        }
      }

      const hasAuthHeader = gateway.customHeaders
        && Object.keys(gateway.customHeaders).some(
          (key) => key.toLowerCase() === "authorization" || key.toLowerCase() === "api-key",
        );

      if (!hasAuthHeader && gateway.apiKey) {
        headers["api-key"] = gateway.apiKey;
      }

      return {
        chatUrl: modelId ? resolveCustomUrl(gateway.baseUrl, modelId) : gateway.baseUrl,
        modelsUrl: "",
        headers,
      };
    }

    default:
      headers.Authorization = `Bearer ${gateway.apiKey}`;
      return {
        chatUrl: `${gateway.baseUrl}/chat/completions`,
        modelsUrl: `${gateway.baseUrl}/models`,
        headers,
      };
  }
}

export function buildRequestBody(
  gateway: GatewayConfig,
  modelId: string,
  messages: ChatMessage[],
): unknown {
  const effectiveType = resolveEffectiveType(gateway.type);

  switch (effectiveType) {
    case "custom_anthropic": {
      const { system, conversation } = splitMessages(messages);
      const body: Record<string, unknown> = {
        messages: conversation.map((message) => ({
          role: message.role as "user" | "assistant",
          content: [{ text: message.content }],
        })),
        inferenceConfig: {
          maxTokens: DEFAULT_MAX_TOKENS,
          temperature: DEFAULT_TEMPERATURE,
        },
      };

      if (system.length > 0) {
        body.system = system.map((message) => ({ text: message.content }));
      }

      return body;
    }

    case "custom_gemini": {
      const { system, conversation } = splitMessages(messages);
      const body: Record<string, unknown> = {
        contents: conversation.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: DEFAULT_TEMPERATURE,
          topP: 1.0,
          topK: 4,
        },
      };

      if (system.length > 0) {
        body.systemInstruction = {
          role: "user",
          parts: system.map((message) => ({ text: message.content })),
        };
      }

      return body;
    }

    default:
      return {
        model: modelId,
        messages,
        temperature: DEFAULT_TEMPERATURE,
      };
  }
}

export function parseResponse(
  gateway: GatewayConfig,
  data: unknown,
): { content: string; promptTokens: number; completionTokens: number } {
  const effectiveType = resolveEffectiveType(gateway.type);

  switch (effectiveType) {
    case "custom_anthropic": {
      const response = data as AnthropicConverseResponse;
      return {
        content: response.output?.message?.content?.[0]?.text ?? "",
        promptTokens: response.usage?.inputTokens ?? 0,
        completionTokens: response.usage?.outputTokens ?? 0,
      };
    }

    case "custom_gemini": {
      const response = data as GeminiGenerateResponse;
      return {
        content: response.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      };
    }

    default: {
      const response = data as OpenAIChatResponse;
      return {
        content: response.choices?.[0]?.message?.content ?? "",
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    }
  }
}