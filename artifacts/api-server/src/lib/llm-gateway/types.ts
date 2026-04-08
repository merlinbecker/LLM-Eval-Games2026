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

export interface GatewayConfig {
  type: string;
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

export interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface AnthropicConverseResponse {
  output?: { message?: { content?: Array<{ text?: string }> } };
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface GeminiGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export interface OpenAIModelEntry {
  id?: string;
  name?: string;
}

export interface OpenAIModelsResponse {
  data?: OpenAIModelEntry[];
}

export interface OpenRouterModelsResponse {
  data?: Array<{ id?: string; name?: string }>;
}