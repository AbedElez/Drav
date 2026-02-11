import OpenAI from "openai";
import { DravAnswer } from "./types";

export async function askOpenAI(prompt: string, signal?: AbortSignal): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { modelId: "gpt-4o", text: "", latencyMs: Date.now() - t0, error: "OpenAI API key not configured" };
    }
    
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }, { signal });
    const text = res.choices?.[0]?.message?.content ?? "";
    return { modelId: "gpt-4o", text, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    console.error("OpenAI error:", e);
    return { modelId: "gpt-4o", text: "", latencyMs: Date.now() - t0, error: e?.message ?? "OpenAI error" };
  }
}
