"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

type ModelId = "gpt-4o" | "claude-3-5" | "gemini-flash-latest";

type Step = {
  id: string;
  modelId: ModelId;
  prompt: string;
};

type StepRunState = {
  status: "idle" | "running" | "done" | "error";
  output: string;
  error?: string;
};

const MODEL_OPTIONS: { id: ModelId; label: string }[] = [
  { id: "gpt-4o", label: "OpenAI" },
  { id: "claude-3-5", label: "Anthropic" },
  { id: "gemini-flash-latest", label: "Gemini" },
];

const newStepId = () => Math.random().toString(36).slice(2, 9);

const initialSteps: Step[] = [
  {
    id: newStepId(),
    modelId: "gpt-4o",
    prompt: "Write a one-paragraph story about a lighthouse keeper.",
  },
  {
    id: newStepId(),
    modelId: "claude-3-5",
    prompt:
      "Take the following story and rewrite it in the style of a noir detective novel:\n\n{{step1}}",
  },
];

export default function PlaygroundPage() {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [runState, setRunState] = useState<Record<number, StepRunState>>({});
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = (id: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: newStepId(),
        modelId: "gpt-4o",
        prompt: `Use the previous output:\n\n{{step${prev.length}}}`,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.id !== id)));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const run = async () => {
    if (running) return;
    setRunState({});
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/playground/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: steps.map((s) => ({ modelId: s.modelId, prompt: s.prompt })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          let event: any;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "step_start") {
            setRunState((prev) => ({
              ...prev,
              [event.index]: { status: "running", output: "" },
            }));
          } else if (event.type === "step_delta") {
            setRunState((prev) => {
              const cur = prev[event.index] ?? { status: "running", output: "" };
              return {
                ...prev,
                [event.index]: { ...cur, output: cur.output + event.delta },
              };
            });
          } else if (event.type === "step_complete") {
            setRunState((prev) => {
              const cur = prev[event.index] ?? { status: "running", output: "" };
              return {
                ...prev,
                [event.index]: {
                  status: event.error ? "error" : "done",
                  output: event.text || cur.output,
                  error: event.error,
                },
              };
            });
          } else if (event.type === "complete") {
            setRunning(false);
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-12 pb-32">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Back
            </Link>
            <h1 className="mt-2 text-3xl font-medium tracking-tight">Playground</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pipe one model's output into the next. Use{" "}
              <code className="rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5 text-xs">
                {"{{step1}}"}
              </code>{" "}
              to reference earlier outputs.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => {
            const state = runState[i];
            return (
              <div
                key={step.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Step {i + 1}
                    </span>
                    <select
                      value={step.modelId}
                      onChange={(e) =>
                        updateStep(step.id, { modelId: e.target.value as ModelId })
                      }
                      className="text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {state?.status === "running" && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        running…
                      </span>
                    )}
                    {state?.status === "done" && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        done
                      </span>
                    )}
                    {state?.status === "error" && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        error
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === steps.length - 1}
                      className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length === 1}
                      className="text-xs px-2 py-1 rounded text-gray-500 hover:text-red-600 disabled:opacity-30"
                      aria-label="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <textarea
                  value={step.prompt}
                  onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                  rows={4}
                  placeholder="Write a prompt. Reference prior steps with {{step1}}, {{step2}}…"
                  className="w-full text-sm font-mono rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y"
                />

                {(state?.output || state?.error) && (
                  <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Output
                    </div>
                    {state.error ? (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {state.error}
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {state.output}
                        {state.status === "running" && (
                          <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-gray-400 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            onClick={addStep}
            disabled={steps.length >= 8 || running}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            + Add step
          </Button>
          <div className="flex-1" />
          {running ? (
            <Button
              onClick={stop}
              className="rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-gray-950 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Stop
            </Button>
          ) : (
            <Button
              onClick={run}
              className="px-6 py-2 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-xl"
            >
              Run chain
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
