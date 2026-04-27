"use client";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { InputNode } from "./nodes/InputNode";
import { ModelNode } from "./nodes/ModelNode";
import { OutputNode } from "./nodes/OutputNode";
import type { ModelId, NodeRunState } from "./nodes/types";

type FlowNode = Node<any>;
type DravNodeType = "dravInput" | "dravModel" | "dravOutput";

const newId = (() => {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}${counter}_${Math.random().toString(36).slice(2, 6)}`;
  };
})();

const NODE_TYPES: NodeTypes = {
  dravInput: InputNode as any,
  dravModel: ModelNode as any,
  dravOutput: OutputNode as any,
};

const SERVER_TYPE: Record<DravNodeType, "input" | "model" | "output"> = {
  dravInput: "input",
  dravModel: "model",
  dravOutput: "output",
};

function buildInitialGraph(): { nodes: FlowNode[]; edges: Edge[] } {
  const inputId = newId("in");
  const model1Id = newId("m");
  const model2Id = newId("m");
  const outputId = newId("out");
  return {
    nodes: [
      {
        id: inputId,
        type: "dravInput",
        position: { x: 40, y: 120 },
        data: { text: "Write a one-paragraph story about a lighthouse keeper." },
      },
      {
        id: model1Id,
        type: "dravModel",
        position: { x: 380, y: 60 },
        data: { modelId: "gpt-4o" as ModelId, prompt: "{{input}}" },
      },
      {
        id: model2Id,
        type: "dravModel",
        position: { x: 760, y: 60 },
        data: {
          modelId: "claude-3-5" as ModelId,
          prompt:
            "Rewrite the following in the style of a noir detective novel:\n\n{{input}}",
        },
      },
      {
        id: outputId,
        type: "dravOutput",
        position: { x: 1140, y: 120 },
        data: {},
      },
    ],
    edges: [
      { id: `e_${inputId}_${model1Id}`, source: inputId, target: model1Id },
      { id: `e_${model1Id}_${model2Id}`, source: model1Id, target: model2Id },
      { id: `e_${model2Id}_${outputId}`, source: model2Id, target: outputId },
    ],
  };
}

function PlaygroundCanvas() {
  const { resolvedTheme } = useTheme();
  const initial = useMemo(() => buildInitialGraph(), []);
  const [nodes, setNodes] = useState<FlowNode[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);

  const [running, setRunning] = useState(false);
  const [runStates, setRunStates] = useState<Record<string, NodeRunState>>({});
  const abortRef = useRef<AbortController | null>(null);

  const updateNodeData = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setRunStates((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((prev) => applyNodeChanges(changes, prev)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((prev) => applyEdgeChanges(changes, prev)),
    []
  );

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((prev) =>
        addEdge(
          {
            ...conn,
            id: `e_${conn.source}_${conn.target}_${Math.random().toString(36).slice(2, 6)}`,
          },
          prev
        )
      ),
    []
  );

  // Compute incoming edge counts per node so model nodes can render the
  // available {{input_N}} placeholders.
  const incomingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of edges) counts[e.target] = (counts[e.target] || 0) + 1;
    return counts;
  }, [edges]);

  // Inject `data.onChange`, `data.onDelete`, `data.state`, and incoming-count
  // into each node so the React Flow node components can edit themselves and
  // reflect run state without us re-creating the node objects on every keystroke.
  const renderedNodes = useMemo<FlowNode[]>(() => {
    return nodes.map((n) => {
      const state = runStates[n.id];
      if (n.type === "dravInput") {
        return {
          ...n,
          data: {
            text: (n.data as any).text ?? "",
            onChange: (patch: any) => updateNodeData(n.id, patch),
            onDelete: () => deleteNode(n.id),
          },
        };
      }
      if (n.type === "dravModel") {
        return {
          ...n,
          data: {
            modelId: (n.data as any).modelId,
            prompt: (n.data as any).prompt,
            state,
            incomingCount: incomingCounts[n.id] || 0,
            onChange: (patch: any) => updateNodeData(n.id, patch),
            onDelete: () => deleteNode(n.id),
          },
        };
      }
      if (n.type === "dravOutput") {
        return {
          ...n,
          data: { state, onDelete: () => deleteNode(n.id) },
        };
      }
      return n;
    });
  }, [nodes, runStates, updateNodeData, deleteNode, incomingCounts]);

  const addNode = (type: DravNodeType) => {
    const prefix =
      type === "dravInput" ? "in" : type === "dravModel" ? "m" : "out";
    const id = newId(prefix);
    const position = {
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    };
    let data: any;
    if (type === "dravInput") data = { text: "" };
    else if (type === "dravModel")
      data = { modelId: "gpt-4o" as ModelId, prompt: "{{input}}" };
    else data = {};
    setNodes((prev) => [...prev, { id, type, position, data }]);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const run = async () => {
    if (running) return;
    setRunStates({});
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payload = {
      nodes: nodes.map((n) => {
        const serverType = SERVER_TYPE[n.type as DravNodeType];
        if (serverType === "input")
          return { id: n.id, type: "input", text: (n.data as any).text ?? "" };
        if (serverType === "model")
          return {
            id: n.id,
            type: "model",
            modelId: (n.data as any).modelId,
            prompt: (n.data as any).prompt,
          };
        return { id: n.id, type: "output" };
      }),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    };

    try {
      const res = await fetch("/api/playground/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Request failed (${res.status})`);
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
          let event: any;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "node_start") {
            setRunStates((prev) => ({
              ...prev,
              [event.id]: { status: "running", output: "" },
            }));
          } else if (event.type === "node_delta") {
            setRunStates((prev) => {
              const cur = prev[event.id] ?? { status: "running", output: "" };
              return {
                ...prev,
                [event.id]: { ...cur, output: cur.output + event.delta },
              };
            });
          } else if (event.type === "node_complete") {
            setRunStates((prev) => {
              const cur = prev[event.id] ?? { status: "running", output: "" };
              return {
                ...prev,
                [event.id]: {
                  status: event.error ? "error" : "done",
                  output: event.text ?? cur.output,
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
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div className="absolute z-10 top-3 left-3 flex items-center gap-2">
        <Button
          onClick={() => addNode("dravInput")}
          disabled={running}
          className="h-8 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          + Input
        </Button>
        <Button
          onClick={() => addNode("dravModel")}
          disabled={running}
          className="h-8 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          + Model
        </Button>
        <Button
          onClick={() => addNode("dravOutput")}
          disabled={running}
          className="h-8 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          + Output
        </Button>
      </div>

      <div className="absolute z-10 top-3 right-3 flex items-center gap-2">
        {running ? (
          <Button
            onClick={stop}
            className="h-8 rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-gray-950 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={run}
            disabled={nodes.length === 0}
            className="h-8 px-4 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Run
          </Button>
        )}
      </div>

      <ReactFlow
        nodes={renderedNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode={resolvedTheme}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-gray-50 dark:bg-gray-950"
      >
        <Background gap={16} className="!bg-gray-50 dark:!bg-gray-950" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <header className="h-16 px-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-900">
        <div className="flex items-baseline gap-4">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-medium tracking-tight">Playground</h1>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Build a graph. Use{" "}
            <code className="rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5 text-[10px]">
              {"{{input}}"}
            </code>{" "}
            or{" "}
            <code className="rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5 text-[10px]">
              {"{{input_N}}"}
            </code>{" "}
            in Model prompts to reference upstream text.
          </span>
        </div>
        <ThemeToggle />
      </header>

      <ReactFlowProvider>
        <PlaygroundCanvas />
      </ReactFlowProvider>
    </main>
  );
}
