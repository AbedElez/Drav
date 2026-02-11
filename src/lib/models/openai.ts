import OpenAI from "openai";
import { DravAnswer, StreamDeltaHandler } from "./types";
import { MODEL_CONFIG } from "./config";

export async function askOpenAI(
  prompt: string,
  signal?: AbortSignal,
  onDelta?: StreamDeltaHandler
): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        modelId: "gpt-4o",
        text: "",
        latencyMs: Date.now() - t0,
        providerModel: MODEL_CONFIG.openai,
        error: "OpenAI API key not configured",
      };
    }
    
    const client = new OpenAI({ apiKey });
    if (onDelta) {
      const stream = await client.chat.completions.create(
        {
          model: MODEL_CONFIG.openai,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        },
        { signal }
      );

      let text = "";
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;
        text += delta;
        onDelta(delta);
      }
      return { modelId: "gpt-4o", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.openai };
    }

    const res = await client.chat.completions.create({
      model: MODEL_CONFIG.openai,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }, { signal });
    const text = res.choices?.[0]?.message?.content ?? "";
    return { modelId: "gpt-4o", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.openai };
  } catch (e: any) {
    console.error("OpenAI error:", e);
    return {
      modelId: "gpt-4o",
      text: "",
      latencyMs: Date.now() - t0,
      providerModel: MODEL_CONFIG.openai,
      error: "OpenAI request failed",
    };
  }
}
