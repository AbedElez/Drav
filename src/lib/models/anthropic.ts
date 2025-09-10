import { Anthropic } from "@anthropic-ai/sdk";
import { DravAnswer } from "./types";

export async function askAnthropic(prompt: string, signal?: AbortSignal): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { modelId: "claude-3-5", text: "", latencyMs: Date.now() - t0, error: "Anthropic API key not configured" };
    }
    
    const client = new Anthropic({ 
      apiKey
    });
    
    const res = await client.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });
    
    const text = res.content?.[0]?.type === 'text' ? res.content[0].text : "";
    return { modelId: "claude-3-5", text, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    console.error("Anthropic error:", e);
    return { modelId: "claude-3-5", text: "", latencyMs: Date.now() - t0, error: e?.message ?? "Anthropic error" };
  }
}
