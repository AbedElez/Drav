import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini, DravAnswer } from "@/lib/models";
import { assertContentLength, checkRateLimit, createTimeoutSignal, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

const Body = z.object({ q: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`answers:${ip}`, { max: 20, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const bodyErr = assertContentLength(req, 16_000);
    if (bodyErr) {
      return NextResponse.json({ error: bodyErr }, { status: 413 });
    }

    const json = await req.json();
    const { q } = Body.parse(json);

    const runWithTimeout = async (
      askFn: (prompt: string, signal?: AbortSignal) => Promise<DravAnswer>
    ): Promise<DravAnswer> => {
      const { signal, cleanup } = createTimeoutSignal(req.signal, 20_000);
      try {
        return await askFn(q, signal);
      } finally {
        cleanup();
      }
    };

    const [o, c, g] = await Promise.allSettled([
      runWithTimeout(askOpenAI),
      runWithTimeout(askAnthropic),
      runWithTimeout(askGemini),
    ]);

    const results: DravAnswer[] = [o, c, g]
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as DravAnswer[];

    return NextResponse.json({ query: q, results });
  } catch (e: any) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
