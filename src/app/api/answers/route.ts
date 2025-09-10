import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini, DravAnswer } from "@/lib/models";

export const runtime = "nodejs";

const Body = z.object({ q: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { q } = Body.parse(json);

    // Debug: Check if API keys are loaded
    console.log("API Keys loaded:", {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    const controller = new AbortController();

    const [o, c, g] = await Promise.allSettled([
      askOpenAI(q, controller.signal),
      askAnthropic(q, controller.signal),
      askGemini(q, controller.signal),
    ]);

    const results: DravAnswer[] = [o, c, g]
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as DravAnswer[];

    return NextResponse.json({ query: q, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
