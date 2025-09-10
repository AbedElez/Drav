export type ModelId = "gpt-4o" | "claude-3-5" | "gemini-1.5-pro";

export type DravAnswer = {
  modelId: ModelId;
  text: string;
  latencyMs: number;
  tokens?: number;
  error?: string;
};
