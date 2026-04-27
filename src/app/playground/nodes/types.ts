export type ModelId = "gpt-4o" | "claude-3-5" | "gemini-flash-latest";

export type NodeStatus = "idle" | "running" | "done" | "error";

export type NodeRunState = {
  status: NodeStatus;
  output: string;
  error?: string;
};

export type InputNodeData = {
  text: string;
  onChange: (patch: Partial<{ text: string }>) => void;
  onDelete: () => void;
};

export type ModelNodeData = {
  modelId: ModelId;
  prompt: string;
  state?: NodeRunState;
  incomingCount: number;
  onChange: (patch: Partial<{ modelId: ModelId; prompt: string }>) => void;
  onDelete: () => void;
};

export type OutputNodeData = {
  state?: NodeRunState;
  onDelete: () => void;
};

export const MODEL_OPTIONS: { id: ModelId; label: string }[] = [
  { id: "gpt-4o", label: "OpenAI" },
  { id: "claude-3-5", label: "Anthropic" },
  { id: "gemini-flash-latest", label: "Gemini" },
];
