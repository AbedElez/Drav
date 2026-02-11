export type ModelId = "gpt-4o" | "claude-3-5" | "gemini-flash-latest";

export type DravAnswer = {
  modelId: ModelId;
  text: string;
  latencyMs: number;
  providerModel?: string;
  tokens?: number;
  error?: string;
};

export type StreamDeltaHandler = (delta: string) => void;
