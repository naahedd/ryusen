import { Node } from 'reactflow';

interface NodeData {
  content: string;
  type: 'system' | 'prompt' | 'completion';
}

interface SidebarProps {
  selectedNode: Node<NodeData> | null;
  onUpdateContent: (content: string) => void;
  onSystemPrompt?: () => void;
  responseCount: number;
  onResponseCountChange: (count: number) => void;
  onAddSystemNode: () => void;
  onDeleteSelected: () => void;
}

export function Sidebar({ 
  selectedNode, 
  onUpdateContent, 
  onSystemPrompt,
  responseCount,
  onResponseCountChange,
  onAddSystemNode,
  onDeleteSelected
}: SidebarProps) {
  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'system': return 'System Prompt';
      case 'prompt': return 'User Prompt';
      case 'completion': return 'AI Response';
      default: return 'Node Details';
    }
  };

  return (
    <div className="w-96 bg-white/80 border-l border-gray-200 h-screen sticky top-0 overflow-hidden">
      <button
        onClick={onAddSystemNode}
        className="fixed top-4 right-[calc(24rem+1.25rem)] w-8 h-8 rounded-full bg-gray-900 text-white 
                 flex items-center justify-center hover:bg-gray-700 transition-colors
                 z-50"
      >
        <span className="text-xl">+</span>
      </button>
      <button
        onClick={onDeleteSelected}
        className={`fixed top-16 right-[calc(24rem+1.25rem)] w-8 h-8 rounded-full bg-red-600 text-white 
                 flex items-center justify-center transition-colors
                 z-50 ${selectedNode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300'}`}
      >
        <span className="text-xl">×</span>
      </button>

      <div className="relative z-10 p-6 h-[calc(100vh-100px)] overflow-y-auto">
        {selectedNode ? (
          <div className="space-y-6">
            <div>
              <span className="text-sm font-medium text-gray-500">
                Node Type
              </span>
              <h2 className="text-xl font-semibold text-gray-900">
                {getNodeTypeLabel(selectedNode.data.type)}
              </h2>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {selectedNode.data.type === 'system' 
                  ? 'System Instructions' 
                  : selectedNode.data.type === 'prompt'
                  ? 'User Input'
                  : 'AI Response'}
              </label>
              <textarea
                className="w-full h-[calc(100vh-300px)] p-4 border rounded-lg shadow-sm 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                          resize-none font-mono text-sm"
                value={selectedNode.data.content}
                onChange={(e) => onUpdateContent(e.target.value)}
                placeholder={
                  selectedNode.data.type === 'system' 
                    ? "Configure the AI's behavior and capabilities..."
                    : selectedNode.data.type === 'prompt'
                    ? "Enter your prompt..."
                    : "AI response content..."
                }
                readOnly={selectedNode.data.type === 'completion'}
              />
            </div>

            {selectedNode.data.type === 'system' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  Tip: The system prompt helps define how the AI should behave and respond.
                </div>
                <button
                  onClick={onSystemPrompt}
                  className="w-full rounded-lg bg-foreground text-background px-4 py-2 
                           hover:opacity-90 transition-opacity"
                >
                  Set System Prompt
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a node to view details</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-6 bg-gray-50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-900">
              Response Count
            </label>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-sm">
              {responseCount}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={responseCount}
            onChange={(e) => onResponseCountChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-gray-900
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-gray-900
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}