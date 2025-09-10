import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askOpenAI, askAnthropic, askGemini } from "@/lib/models";

export const runtime = "nodejs";

const Body = z.object({ 
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { message, conversationId } = Body.parse(json);

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
        send({ type: "start", message, conversationId });

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
        askOpenAI(message).then(response => handleResponse("gpt-4o", response)).catch(error => 
          handleResponse("gpt-4o", { modelId: "gpt-4o", text: "", error: error.message, latencyMs: Date.now() - startTime })
        );
        
        askAnthropic(message).then(response => {
          console.log("Claude response:", response);
          handleResponse("claude-3-5", response);
        }).catch(error => {
          console.error("Claude error:", error);
          handleResponse("claude-3-5", { modelId: "claude-3-5", text: "", error: error.message, latencyMs: Date.now() - startTime });
        });
        
        askGemini(message).then(response => handleResponse("gemini-1.5-pro", response)).catch(error => 
          handleResponse("gemini-1.5-pro", { modelId: "gemini-1.5-pro", text: "", error: error.message, latencyMs: Date.now() - startTime })
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
