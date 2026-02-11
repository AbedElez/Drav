import { NextRequest } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini } from "@/lib/models";
import { MODEL_CONFIG } from "@/lib/models/config";
import { assertContentLength, checkRateLimit, createTimeoutSignal, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

const Body = z.object({ q: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`answers-stream:${ip}`, { max: 20, windowMs: 60_000 });
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyErr = assertContentLength(req, 16_000);
    if (bodyErr) {
      return new Response(JSON.stringify({ error: bodyErr }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await req.json();
    const { q } = Body.parse(json);

    const modelCount = 3;

    // Create a readable stream for Server-Sent Events
    let providerAbortController: AbortController | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        providerAbortController = new AbortController();
        const currentAbortController = providerAbortController;
        let closed = false;
        let completedCount = 0;

        const closeStream = () => {
          if (closed) return;
          closed = true;
          currentAbortController.abort();
          controller.close();
        };

        const markModelComplete = () => {
          completedCount++;
          if (completedCount >= modelCount) {
            safeSend({ type: "complete" });
            closeStream();
          }
        };

        const safeSend = (data: unknown) => {
          if (closed) return;
          try {
            const chunk = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          } catch {
            closeStream();
          }
        };

        const runModel = async (
          modelId: "gpt-4o" | "claude-3-5" | "gemini-flash-latest",
          askFn: (prompt: string, signal?: AbortSignal, onDelta?: (delta: string) => void) => Promise<any>
        ) => {
          const providerModel =
            modelId === "gpt-4o"
              ? MODEL_CONFIG.openai
              : modelId === "claude-3-5"
                ? MODEL_CONFIG.anthropic
                : MODEL_CONFIG.gemini;
          safeSend({ type: "response_start", modelId });
          const { signal, cleanup } = createTimeoutSignal(currentAbortController.signal, 20_000);
          try {
            const response = await askFn(q, signal, (delta) => {
              if (!delta) return;
              safeSend({ type: "response_delta", modelId, delta });
            });
            safeSend({ type: "response_complete", modelId, response });
          } catch {
            safeSend({
              type: "response_complete",
              modelId,
              response: {
                modelId,
                text: "",
                providerModel,
                error: "Model request failed",
                latencyMs: 0,
              },
            });
          } finally {
            cleanup();
            markModelComplete();
          }
        };

        safeSend({
          type: "start",
          query: q,
          models: {
            "gpt-4o": MODEL_CONFIG.openai,
            "claude-3-5": MODEL_CONFIG.anthropic,
            "gemini-flash-latest": MODEL_CONFIG.gemini,
          },
        });

        Promise.allSettled([
          runModel("gpt-4o", askOpenAI),
          runModel("claude-3-5", askAnthropic),
          runModel("gemini-flash-latest", askGemini),
        ]).catch(() => {
          if (!closed) {
            safeSend({ type: "complete" });
            closeStream();
          }
        });
      },
      cancel() {
        providerAbortController?.abort();
      },
    });
    req.signal.addEventListener("abort", () => providerAbortController?.abort(), { once: true });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Bad request" }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
