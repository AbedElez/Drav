import { Anthropic } from "@anthropic-ai/sdk";
import { DravAnswer, StreamDeltaHandler } from "./types";
import { MODEL_CONFIG } from "./config";

export async function askAnthropic(
  prompt: string,
  signal?: AbortSignal,
  onDelta?: StreamDeltaHandler
): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        modelId: "claude-3-5",
        text: "",
        latencyMs: Date.now() - t0,
        providerModel: MODEL_CONFIG.anthropic,
        error: "Anthropic API key not configured",
      };
    }
    
    const client = new Anthropic({
      apiKey,
      fetch: globalThis.fetch,
    });
    
    if (onDelta) {
      const stream = client.messages.stream(
        {
          model: MODEL_CONFIG.anthropic,
          max_tokens: 700,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        },
        { signal }
      );

      let text = "";
      stream.on("text", (textDelta: string) => {
        if (!textDelta) return;
        text += textDelta;
        onDelta(textDelta);
      });

      const finalMessage = await stream.finalMessage();
      if (!text) {
        text =
          finalMessage.content
            ?.filter((block) => block.type === "text")
            .map((block) => block.text ?? "")
            .join(" ") ?? "";
      }
      return { modelId: "claude-3-5", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.anthropic };
    }

    const res = await client.messages.create({
      model: MODEL_CONFIG.anthropic,
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.content?.[0]?.type === "text" ? res.content[0].text : "";
    return { modelId: "claude-3-5", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.anthropic };
  } catch (e: any) {
    console.error("Anthropic error:", e);
    return {
      modelId: "claude-3-5",
      text: "",
      latencyMs: Date.now() - t0,
      providerModel: MODEL_CONFIG.anthropic,
      error: "Anthropic request failed",
    };
  }
}
