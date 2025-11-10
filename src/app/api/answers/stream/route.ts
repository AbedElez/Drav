import { NextRequest } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini } from "@/lib/models";

export const runtime = "nodejs";

const Body = z.object({ q: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { q } = Body.parse(json);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Helper function to send data
        const send = (data: any) => {
          const chunk = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        };

        // Send initial message
        send({ type: "start", query: q });

        // Start all three requests in parallel
        const startTime = Date.now();
        let completedCount = 0;

        const handleResponse = (modelId: string, response: any) => {
          completedCount++;
          send({
            type: "response",
            modelId,
            response: {
              ...response,
              latencyMs: Date.now() - startTime
            }
          });

          // Close stream when all models complete
          if (completedCount === 3) {
            send({ type: "complete" });
            controller.close();
          }
        };

        // Start all three API calls
        askOpenAI(q).then(response => handleResponse("gpt-4o", response)).catch(error => 
          handleResponse("gpt-4o", { modelId: "gpt-4o", text: "", error: error.message, latencyMs: Date.now() - startTime })
        );
        
        askAnthropic(q).then(response => handleResponse("claude-3-5", response)).catch(error => 
          handleResponse("claude-3-5", { modelId: "claude-3-5", text: "", error: error.message, latencyMs: Date.now() - startTime })
        );
        
        askGemini(q).then(response => handleResponse("gemini-flash-latest", response)).catch(error => 
          handleResponse("gemini-flash-latest", { modelId: "gemini-flash-latest", text: "", error: error.message, latencyMs: Date.now() - startTime })
        );
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Bad request" }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
