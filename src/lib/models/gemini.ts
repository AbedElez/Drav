import { GoogleGenerativeAI } from "@google/generative-ai";
import { DravAnswer } from "./types";

export async function askGemini(prompt: string, signal?: AbortSignal): Promise<DravAnswer> {
  const t0 = Date.now();
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { modelId: "gemini-1.5-pro", text: "", latencyMs: Date.now() - t0, error: "Gemini API key not configured" };
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.2,
      }
    });
    const res = await model.generateContent(prompt);
    const text = res.response?.text?.() ?? "";
    return { modelId: "gemini-1.5-pro", text, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    console.error("Gemini error:", e);
    return { modelId: "gemini-1.5-pro", text: "", latencyMs: Date.now() - t0, error: e?.message ?? "Gemini error" };
  }
}
