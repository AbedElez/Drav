import { NextRequest } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini } from "@/lib/models";
import { MODEL_CONFIG } from "@/lib/models/config";
import {
  assertContentLength,
  checkRateLimit,
  createTimeoutSignal,
  getClientIp,
} from "@/lib/security";

export const runtime = "nodejs";

const ModelId = z.enum(["gpt-4o", "claude-3-5", "gemini-flash-latest"]);

const Body = z.object({
  steps: z
    .array(
      z.object({
        modelId: ModelId,
        prompt: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(8),
});

type Step = z.infer<typeof Body>["steps"][number];

const askFor: Record<
  Step["modelId"],
  (prompt: string, signal?: AbortSignal, onDelta?: (d: string) => void) => Promise<{ text: string; error?: string }>
> = {
  "gpt-4o": askOpenAI,
  "claude-3-5": askAnthropic,
  "gemini-flash-latest": askGemini,
};

const providerModelFor = (id: Step["modelId"]) =>
  id === "gpt-4o"
    ? MODEL_CONFIG.openai
    : id === "claude-3-5"
      ? MODEL_CONFIG.anthropic
      : MODEL_CONFIG.gemini;

function renderPrompt(template: string, outputs: string[]): string {
  return template.replace(/\{\{\s*step(\d+)\s*\}\}/gi, (_, idx) => {
    const i = Number(idx) - 1;
    return outputs[i] ?? "";
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`playground-run:${ip}`, { max: 10, windowMs: 60_000 });
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyErr = assertContentLength(req, 64_000);
    if (bodyErr) {
      return new Response(JSON.stringify({ error: bodyErr }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await req.json();
    const { steps } = Body.parse(json);

    let providerAbortController: AbortController | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        providerAbortController = new AbortController();
        const currentAbortController = providerAbortController;
        let closed = false;

        const closeStream = () => {
          if (closed) return;
          closed = true;
          currentAbortController.abort();
          controller.close();
        };

        const safeSend = (data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            closeStream();
          }
        };

        (async () => {
          safeSend({
            type: "start",
            stepCount: steps.length,
            steps: steps.map((s, i) => ({
              index: i,
              modelId: s.modelId,
              providerModel: providerModelFor(s.modelId),
            })),
          });

          const outputs: string[] = [];

          for (let i = 0; i < steps.length; i++) {
            if (currentAbortController.signal.aborted) break;
            const step = steps[i];
            const renderedPrompt = renderPrompt(step.prompt, outputs);
            safeSend({
              type: "step_start",
              index: i,
              modelId: step.modelId,
              renderedPrompt,
            });

            const { signal, cleanup } = createTimeoutSignal(
              currentAbortController.signal,
              30_000
            );
            let text = "";
            let errorMessage: string | undefined;
            try {
              const askFn = askFor[step.modelId];
              const res = await askFn(renderedPrompt, signal, (delta) => {
                if (!delta) return;
                text += delta;
                safeSend({ type: "step_delta", index: i, delta });
              });
              if (res?.error) errorMessage = res.error;
              if (!text && res?.text) text = res.text;
            } catch {
              errorMessage = "Step request failed";
            } finally {
              cleanup();
            }

            outputs.push(text);
            safeSend({
              type: "step_complete",
              index: i,
              text,
              error: errorMessage,
            });

            if (errorMessage) {
              safeSend({ type: "complete", aborted: true });
              closeStream();
              return;
            }
          }

          safeSend({ type: "complete" });
          closeStream();
        })().catch(() => {
          if (!closed) {
            safeSend({ type: "complete", aborted: true });
            closeStream();
          }
        });
      },
      cancel() {
        providerAbortController?.abort();
      },
    });
    req.signal.addEventListener("abort", () => providerAbortController?.abort(), {
      once: true,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
