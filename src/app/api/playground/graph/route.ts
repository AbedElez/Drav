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

const InputNode = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("input"),
  text: z.string().max(8000).default(""),
});

const ModelNode = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("model"),
  modelId: ModelId,
  prompt: z.string().min(1).max(8000),
});

const OutputNode = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("output"),
});

const Node = z.discriminatedUnion("type", [InputNode, ModelNode, OutputNode]);

const Edge = z.object({
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
});

const Body = z.object({
  nodes: z.array(Node).min(1).max(20),
  edges: z.array(Edge).max(60),
});

type GraphNode = z.infer<typeof Node>;
type GraphEdge = z.infer<typeof Edge>;

const providerModelFor = (id: "gpt-4o" | "claude-3-5" | "gemini-flash-latest") =>
  id === "gpt-4o"
    ? MODEL_CONFIG.openai
    : id === "claude-3-5"
      ? MODEL_CONFIG.anthropic
      : MODEL_CONFIG.gemini;

const askFor: Record<
  "gpt-4o" | "claude-3-5" | "gemini-flash-latest",
  (
    prompt: string,
    signal?: AbortSignal,
    onDelta?: (d: string) => void
  ) => Promise<{ text: string; error?: string }>
> = {
  "gpt-4o": askOpenAI,
  "claude-3-5": askAnthropic,
  "gemini-flash-latest": askGemini,
};

function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]) {
  const ids = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    if (e.source === e.target) continue;
    incoming.get(e.target)!.push(e.source);
    outgoing.get(e.source)!.push(e.target);
  }
  return { incoming, outgoing };
}

function topoSort(
  nodes: GraphNode[],
  incoming: Map<string, string[]>,
  outgoing: Map<string, string[]>
): string[] | null {
  const remaining = new Map<string, number>();
  for (const n of nodes) remaining.set(n.id, incoming.get(n.id)!.length);

  const ready: string[] = [];
  for (const [id, count] of remaining) if (count === 0) ready.push(id);

  const order: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    order.push(id);
    for (const next of outgoing.get(id) || []) {
      const r = (remaining.get(next) || 0) - 1;
      remaining.set(next, r);
      if (r === 0) ready.push(next);
    }
  }
  return order.length === nodes.length ? order : null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`playground-graph:${ip}`, { max: 10, windowMs: 60_000 });
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyErr = assertContentLength(req, 256_000);
    if (bodyErr) {
      return new Response(JSON.stringify({ error: bodyErr }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await req.json();
    const { nodes, edges } = Body.parse(json);

    const idSet = new Set<string>();
    for (const n of nodes) {
      if (idSet.has(n.id)) {
        return new Response(JSON.stringify({ error: "Duplicate node id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      idSet.add(n.id);
    }

    const { incoming, outgoing } = buildAdjacency(nodes, edges);
    const order = topoSort(nodes, incoming, outgoing);
    if (!order) {
      return new Response(JSON.stringify({ error: "Graph has a cycle" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

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

        const outputs = new Map<string, string>();
        const errored = new Set<string>();

        const upstreamErrored = (id: string): boolean => {
          for (const src of incoming.get(id) || []) {
            if (errored.has(src)) return true;
          }
          return false;
        };

        const renderInput = (id: string): string => {
          const sources = incoming.get(id) || [];
          if (!sources.length) return "";
          return sources
            .map((src) => outputs.get(src) ?? "")
            .filter((s) => s.length > 0)
            .join("\n\n");
        };

        const renderPrompt = (template: string, id: string): string => {
          const sources = incoming.get(id) || [];
          const sourceTexts = sources.map((src) => outputs.get(src) ?? "");
          let out = template.replace(
            /\{\{\s*input_(\d+)\s*\}\}/gi,
            (_, idx: string) => {
              const i = Number(idx) - 1;
              return sourceTexts[i] ?? "";
            }
          );
          out = out.replace(
            /\{\{\s*input\s*\}\}/gi,
            sourceTexts.filter((s) => s.length > 0).join("\n\n")
          );
          return out;
        };

        const runNode = async (id: string) => {
          if (currentAbortController.signal.aborted) return;
          const node = nodeById.get(id)!;

          if (upstreamErrored(id)) {
            errored.add(id);
            safeSend({
              type: "node_complete",
              id,
              text: "",
              error: "Upstream node failed",
            });
            return;
          }

          if (node.type === "input") {
            outputs.set(id, node.text);
            safeSend({
              type: "node_complete",
              id,
              text: node.text,
            });
            return;
          }

          if (node.type === "output") {
            const text = renderInput(id);
            outputs.set(id, text);
            safeSend({ type: "node_complete", id, text });
            return;
          }

          const renderedPrompt = renderPrompt(node.prompt, id);

          safeSend({
            type: "node_start",
            id,
            modelId: node.modelId,
            providerModel: providerModelFor(node.modelId),
            renderedPrompt,
          });

          const { signal, cleanup } = createTimeoutSignal(
            currentAbortController.signal,
            30_000
          );
          let text = "";
          let errorMessage: string | undefined;
          try {
            const askFn = askFor[node.modelId];
            const res = await askFn(renderedPrompt, signal, (delta) => {
              if (!delta) return;
              text += delta;
              safeSend({ type: "node_delta", id, delta });
            });
            if (res?.error) errorMessage = res.error;
            if (!text && res?.text) text = res.text;
          } catch {
            errorMessage = "Node request failed";
          } finally {
            cleanup();
          }

          if (errorMessage) {
            errored.add(id);
          }
          outputs.set(id, text);
          safeSend({
            type: "node_complete",
            id,
            text,
            error: errorMessage,
          });
        };

        (async () => {
          safeSend({
            type: "start",
            order,
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              ...(n.type === "model"
                ? { modelId: n.modelId, providerModel: providerModelFor(n.modelId) }
                : {}),
            })),
          });

          // Run in waves of nodes whose dependencies are satisfied,
          // so independent branches execute in parallel.
          const remaining = new Set(order);
          const completed = new Set<string>();

          while (remaining.size > 0) {
            if (currentAbortController.signal.aborted) break;
            const wave: string[] = [];
            for (const id of remaining) {
              const deps = incoming.get(id) || [];
              if (deps.every((d) => completed.has(d))) {
                wave.push(id);
              }
            }
            if (!wave.length) break;
            await Promise.allSettled(wave.map(runNode));
            for (const id of wave) {
              completed.add(id);
              remaining.delete(id);
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
