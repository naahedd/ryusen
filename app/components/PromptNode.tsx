'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const PromptNode = memo(({ data, selected }: { data: { type: string }, selected: boolean }) => {
  return (
    <div className={`
      rounded-lg border bg-background p-4 shadow-lg transition-all
      ${selected 
        ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' 
        : 'border-foreground/10'
      }
    `}>
      {data.type !== 'system' && (
        <Handle type="target" position={Position.Top} className="!bg-foreground" />
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-foreground" />
      <div>
        <h3 className="font-bold text-sm">
          {data.type === 'system' ? 'System' : 'User'}
        </h3>
      </div>
    </div>
  );
});

PromptNode.displayName = 'PromptNode';