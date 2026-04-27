"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { InputNodeData } from "./types";

export function InputNode({ data, id }: NodeProps & { data: InputNodeData }) {
  return (
    <div className="relative w-72 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Input
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
        <textarea
          value={data.text}
          onChange={(e) => data.onChange({ text: e.target.value })}
          placeholder="Type the starting input…"
          rows={4}
          className="w-full text-sm font-mono rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none nodrag"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-600 !border-2 !border-white dark:!border-gray-950"
      />
    </div>
  );
}
