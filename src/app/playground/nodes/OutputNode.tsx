"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { OutputNodeData } from "./types";

export function OutputNode({ data, id }: NodeProps & { data: OutputNodeData }) {
  const state = data.state;
  return (
    <div className="relative w-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Output
        </span>
        <div className="flex items-center gap-2">
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
      <div className="p-3">
        {state?.output ? (
          <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 p-2 max-h-60 overflow-auto nowheel">
            <div className="text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
              {state.output}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic">
            Connect an upstream node to see its final output here.
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-600 !border-2 !border-white dark:!border-gray-950"
      />
    </div>
  );
}
