import { GoogleGenerativeAI } from "@google/generative-ai";
import { DravAnswer, StreamDeltaHandler } from "./types";
import { MODEL_CONFIG } from "./config";

export async function askGemini(
  prompt: string,
  signal?: AbortSignal,
  onDelta?: StreamDeltaHandler
): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return {
        modelId: "gemini-flash-latest",
        text: "",
        latencyMs: Date.now() - t0,
        providerModel: MODEL_CONFIG.gemini,
        error: "Gemini API key not configured",
      };
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_CONFIG.gemini,
      generationConfig: {
        temperature: 0.2,
      }
    });
    if (onDelta) {
      const streamed = await model.generateContentStream(prompt);
      let text = "";

      for await (const chunk of streamed.stream) {
        const chunkText = chunk?.text?.() ?? "";
        if (!chunkText) continue;

        const delta = chunkText.startsWith(text) ? chunkText.slice(text.length) : chunkText;
        if (!delta) continue;

        if (chunkText.startsWith(text)) {
          text = chunkText;
        } else {
          text += delta;
        }
        onDelta(delta);
      }

      if (!text) {
        const finalResponse = await streamed.response;
        text = finalResponse?.text?.() ?? "";
      }

      return { modelId: "gemini-flash-latest", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.gemini };
    }

    const res = await model.generateContent(prompt);
    const text = res.response?.text?.() ?? "";
    return { modelId: "gemini-flash-latest", text, latencyMs: Date.now() - t0, providerModel: MODEL_CONFIG.gemini };
  } catch (e: any) {
    console.error("Gemini error:", e);
    return {
      modelId: "gemini-flash-latest",
      text: "",
      latencyMs: Date.now() - t0,
      providerModel: MODEL_CONFIG.gemini,
      error: "Gemini request failed",
    };
  }
}
