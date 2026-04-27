"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MODEL_OPTIONS, type ModelId, type ModelNodeData } from "./types";

export function ModelNode({ data, id }: NodeProps & { data: ModelNodeData }) {
  const state = data.state;
  const placeholders = (() => {
    if (data.incomingCount <= 1) return ["{{input}}"];
    return [
      "{{input}}",
      ...Array.from({ length: data.incomingCount }, (_, i) => `{{input_${i + 1}}}`),
    ];
  })();

  return (
    <div className="relative w-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Model
          </span>
          <select
            value={data.modelId}
            onChange={(e) => data.onChange({ modelId: e.target.value as ModelId })}
            className="text-xs rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 nodrag"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {state?.status === "running" && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400">running…</span>
          )}
          {state?.status === "done" && (
            <span className="text-[10px] text-green-600 dark:text-green-400">done</span>
          )}
          {state?.status === "error" && (
            <span className="text-[10px] text-red-600 dark:text-red-400">error</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-600">
            {id}
          </span>
          <button
            onClick={data.onDelete}
            className="nodrag text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-xs leading-none"
            aria-label="Delete node"
            title="Delete node"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <textarea
          value={data.prompt}
          onChange={(e) => data.onChange({ prompt: e.target.value })}
          placeholder="Prompt. Use {{input}} or {{input_N}} for upstream text."
          rows={4}
          className="w-full text-sm font-mono rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none nodrag"
        />
        <div className="text-[10px] text-gray-500 dark:text-gray-400">
          {data.incomingCount === 0 ? (
            <span className="italic">No incoming connections.</span>
          ) : (
            <span>
              Available:{" "}
              {placeholders.map((p, i) => (
                <span key={p}>
                  {i > 0 && ", "}
                  <code className="rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5 font-mono">
                    {p}
                  </code>
                </span>
              ))}
            </span>
          )}
        </div>
        {(state?.output || state?.error) && (
          <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 p-2 max-h-40 overflow-auto nowheel">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Output
            </div>
            {state.error ? (
              <div className="text-xs text-red-600 dark:text-red-400">{state.error}</div>
            ) : (
              <div className="text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                {state.output}
                {state.status === "running" && (
                  <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-gray-400 animate-pulse" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-600 !border-2 !border-white dark:!border-gray-950"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-600 !border-2 !border-white dark:!border-gray-950"
      />
    </div>
  );
}
