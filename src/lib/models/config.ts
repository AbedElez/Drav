export const MODEL_CONFIG = {
  openai: process.env.OPENAI_MODEL || "gpt-4.1",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-latest",
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  openaiSuggestions: process.env.OPENAI_SUGGESTIONS_MODEL || "gpt-4.1-mini",
  geminiSuggestions: process.env.GEMINI_SUGGESTIONS_MODEL || "gemini-2.5-flash",
} as const;
