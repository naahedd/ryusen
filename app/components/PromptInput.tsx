'use client';

import { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="fixed bottom-4 left-4 right-4 z-10 flex gap-2 max-w-2xl mx-auto">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 rounded-lg border border-foreground/10 bg-background px-4 py-2 font-[family-name:var(--font-geist-mono)]"
        placeholder="Enter your prompt..."
      />
      <button
        onClick={() => {
          if (prompt.trim()) {
            onSubmit(prompt);
            setPrompt('');
          }
        }}
        className="rounded-lg bg-foreground text-background px-4 py-2 hover:opacity-90 transition-opacity"
      >
        Generate
      </button>
    </div>
  );
}