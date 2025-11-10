export type ModelId = "gpt-4o" | "claude-3-5" | "gemini-flash-latest";

export type DravAnswer = {
  modelId: ModelId;
  text: string;
  latencyMs: number;
  tokens?: number;
  error?: string;
};
