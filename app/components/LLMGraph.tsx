'use client';

import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  SelectionMode,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PromptNode } from './PromptNode';
import { CompletionNode } from './CompletionNode';
import { PromptInput } from './PromptInput';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sidebar } from './Sidebar';

const VERTICAL_SPACING = 120;      // Space between levels
const CLUSTER_SPACING = 150;       // Closer spacing for AI responses within a cluster
const GROUP_SPACING = 400;         // Increased spacing between user prompt nodes
const LEVEL_SPREAD = 1.2;          // Spread multiplier

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Create a function to get model with different temperature
const getModel = (temperature: number) => genAI.getGenerativeModel({ 
  model: "gemini-pro",
  generationConfig: {
    temperature,
    topK: 40,
    topP: 0.8,
  }
});

const nodeTypes = {
  prompt: PromptNode,
  completion: CompletionNode,
};

interface NodeData {
  content: string;
  type: 'system' | 'prompt' | 'completion';
}

export function LLMGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([
    {
      id: 'system-node',
      type: 'prompt',
      data: { 
        content: 'You are a helpful AI assistant...',
        type: 'system'
      },
      position: { x: 400, y: 200 },
    }
  ]);
  
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [responseCount, setResponseCount] = useState(3); // Default to 3 responses

  const [selectionKey, setSelectionKey] = useState<string | null>(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Update selection key based on Alt key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setSelectionKey('Alt');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setSelectionKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNewPrompt = async (promptText: string) => {
    const selectedParentNode = nodes.find(node => node.selected);
    if (!selectedParentNode) return;

    const existingChildren = nodes.filter(node => 
      edges.some(edge => edge.source === selectedParentNode.id && edge.target === node.id)
    );
    
    const nodeLevel = edges.filter(edge => edge.target === selectedParentNode.id).length + 1;
    const spreadMultiplier = Math.pow(LEVEL_SPREAD, nodeLevel);
    
    const childIndex = existingChildren.length;
    const parentX = selectedParentNode.position.x;
    const parentY = selectedParentNode.position.y;
    
    const promptNode: Node = {
      id: `prompt-${Date.now()}`,
      type: 'prompt',
      data: { content: promptText, type: 'prompt' },
      position: { 
        x: parentX + childIndex * GROUP_SPACING * spreadMultiplier,
        y: parentY + VERTICAL_SPACING 
      },
    };

    // Create placeholder completion nodes
    const tempCompletionNodes: Node<NodeData>[] = Array.from(
      { length: responseCount }, 
      (_, index) => ({
        id: `completion-${promptNode.id}-${index}`,
        type: 'completion',
        data: { 
          content: 'Generating response...',
          type: 'completion'
        },
        position: { 
          x: promptNode.position.x + (index - (responseCount-1)/2) * CLUSTER_SPACING,
          y: promptNode.position.y + VERTICAL_SPACING 
        },
      })
    );

    // Create edges with animated style for loading state
    const parentToPromptEdge = {
      id: `edge-${selectedParentNode.id}-${promptNode.id}`,
      source: selectedParentNode.id,
      target: promptNode.id,
    };

    const loadingEdges = tempCompletionNodes.map(node => ({
      id: `edge-${promptNode.id}-${node.id}`,
      source: promptNode.id,
      target: node.id,
      animated: true, // This creates the dotted animated edge
    }));

    // Add nodes and loading edges immediately
    setNodes((nds) => [...nds, promptNode, ...tempCompletionNodes]);
    setEdges((eds) => [...eds, parentToPromptEdge, ...loadingEdges]);

    try {
      // Generate responses in parallel
      const responses = await Promise.all(
        Array.from({ length: responseCount }, async (_, index) => {
          const temperature = 0.7 + (index * 0.3 / responseCount);
          const model = getModel(temperature);
          const result = await model.generateContent(promptText);
          return result.response.text();
        })
      );

      // Update completion nodes with real content
      setNodes((nds) => 
        nds.map(node => {
          const matchIndex = tempCompletionNodes.findIndex(temp => temp.id === node.id);
          if (matchIndex !== -1) {
            return {
              ...node,
              data: {
                ...node.data,
                content: responses[matchIndex]
              }
            };
          }
          return node;
        })
      );

      // Update edges to remove animation
      setEdges((eds) =>
        eds.map(edge => {
          if (loadingEdges.some(le => le.id === edge.id)) {
            return { ...edge, animated: false };
          }
          return edge;
        })
      );

    } catch (error) {
      console.error('Error generating completions:', error);
      // Update nodes to show error state
      setNodes((nds) =>
        nds.map(node => {
          if (tempCompletionNodes.some(temp => temp.id === node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                content: 'Error generating response. Please try again.'
              }
            };
          }
          return node;
        })
      );
    }
  };

  const handleUpdateNodeContent = useCallback((content: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected) {
          return {
            ...node,
            data: {
              ...node.data,
              content
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleSystemPrompt = useCallback(async () => {
    const systemNode = nodes.find(node => node.data.type === 'system');
    if (!systemNode || !systemNode.data.content) return;

    // Use default temperature for system prompt
    const model = getModel(0.7);
    await model.generateContent(systemNode.data.content);
    
  }, [nodes]);

  const handleAddSystemNode = useCallback(() => {
    // Find the rightmost x position of existing nodes
    const rightmostX = nodes.reduce((max, node) => 
      Math.max(max, node.position.x), -Infinity);
    
    // Find the lowest y position of existing nodes
    const lowestY = nodes.reduce((max, node) => 
      Math.max(max, node.position.y), -Infinity);

    // Position new system node away from existing nodes
    const newSystemNode: Node = {
      id: `system-${Date.now()}`,
      type: 'prompt',
      data: { 
        content: 'Configure system behavior...',
        type: 'system'
      },
      position: { 
        x: rightmostX < 0 ? 300 : rightmostX + GROUP_SPACING,
        y: lowestY < 0 ? 200 : 200  // Always keep system nodes at top level
      },
    };

    setNodes((nds) => [...nds, newSystemNode]);
  }, [nodes, setNodes]);

  const handleDeleteSelected = useCallback(() => {
    // Get all selected nodes
    const selectedNodes = nodes.filter(node => node.selected);
    
    // Function to get all descendant node IDs recursively
    const getDescendantIds = (nodeId: string): string[] => {
      const childNodes = nodes.filter(node => 
        edges.some(edge => edge.source === nodeId && edge.target === node.id)
      );
      
      return [
        ...childNodes.map(node => node.id),
        ...childNodes.flatMap(node => getDescendantIds(node.id))
      ];
    };

    // Get all nodes to delete (selected nodes + their descendants)
    const nodesToDelete = new Set([
      ...selectedNodes.map(node => node.id),
      ...selectedNodes.flatMap(node => getDescendantIds(node.id))
    ]);

    // Remove nodes and their connected edges
    setNodes(nds => nds.filter(node => !nodesToDelete.has(node.id)));
    setEdges(eds => eds.filter(edge => 
      !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
    ));
  }, [nodes, edges, setNodes, setEdges]);

  const handleSaveGraph = useCallback(() => {
    const graphData = {
      nodes,
      edges,
      responseCount
    };
    
    // Create blob and download link
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges, responseCount]);

  const handleUploadGraph = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graphData = JSON.parse(e.target?.result as string);
        
        // Find rightmost and lowest positions of existing nodes
        const rightmostX = nodes.reduce((max, node) => 
          Math.max(max, node.position.x), -Infinity);

        // Offset new nodes to avoid overlap
        const newNodes = graphData.nodes.map((node: Node<NodeData>) => ({
          ...node,
          id: `imported-${node.id}`, // Prevent ID conflicts
          position: {
            x: node.position.x + (rightmostX < 0 ? 300 : rightmostX + 400),
            y: node.position.y
          }
        }));

        // Update edges to use new node IDs
        const newEdges = graphData.edges.map((edge: Edge) => ({
          ...edge,
          id: `imported-${edge.id}`,
          source: `imported-${edge.source}`,
          target: `imported-${edge.target}`
        }));

        setNodes(nds => [...nds, ...newNodes]);
        setEdges(eds => [...eds, ...newEdges]);
        
      } catch (error) {
        console.error('Error parsing JSON file:', error);
      }
    };
    reader.readAsText(file);
  }, [nodes, setNodes, setEdges]);

  const handleDownloadTree = useCallback(() => {
    const generateTreeText = (nodes: Node[], edges: Edge[], rootId: string, prefix = ''): string => {
      const node = nodes.find(n => n.id === rootId);
      if (!node) return '';

      const children = nodes.filter(n => 
        edges.some(e => e.source === rootId && e.target === n.id)
      );

      let treeText = `${prefix}${prefix ? '|__ ' : ''}${node.data.content.split('\n')[0]}\n`;
      
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        const newPrefix = prefix + (isLast ? '    ' : '|   ');
        treeText += generateTreeText(nodes, edges, child.id, newPrefix);
      });
      
      return treeText;
    };

    const systemNode = nodes.find(node => node.data.type === 'system');
    if (!systemNode) return;

    const treeText = generateTreeText(nodes, edges, systemNode.id);
    const blob = new Blob([treeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-tree-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const selectedNode = nodes.find(node => node.selected);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete') {
        // Get all selected nodes
        const selectedNodes = nodes.filter(node => node.selected);
        
        // Get all descendant IDs recursively
        const getDescendantIds = (nodeId: string): string[] => {
          const childNodes = nodes.filter(node => 
            edges.some(edge => edge.source === nodeId && edge.target === node.id)
          );
          
          return [
            ...childNodes.map(node => node.id),
            ...childNodes.flatMap(node => getDescendantIds(node.id))
          ];
        };

        // Get all nodes to delete (selected + descendants)
        const nodesToDelete = new Set([
          ...selectedNodes.map(node => node.id),
          ...selectedNodes.flatMap(node => getDescendantIds(node.id))
        ]);

        // Remove nodes and their edges
        setNodes(nds => nds.filter(node => !nodesToDelete.has(node.id)));
        setEdges(eds => eds.filter(edge => 
          !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
        ));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        setIsDraggable(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.altKey && !nodes.some(node => node.selected)) {
        setIsDraggable(false);
      }
    };

    // Update draggable state when nodes selection changes
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length > 0) {
      setIsDraggable(true);
    } else if (!isDraggable) {
      setIsDraggable(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nodes, isDraggable]);

  return (
    <div className="flex w-screen h-screen">
      <div className="flex-1">
        <div className="absolute top-4 left-4 flex gap-2 z-50">
          <div className="relative">
            <button
              onClick={() => setShowSaveOptions(!showSaveOptions)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg 
                       hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
            
            {showSaveOptions && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
                <button
                  onClick={() => {
                    handleSaveGraph();
                    setShowSaveOptions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-t-lg"
                >
                  Save as JSON
                </button>
                <button
                  onClick={() => {
                    handleDownloadTree();
                    setShowSaveOptions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-b-lg"
                >
                  Save as Tree
                </button>
              </div>
            )}
          </div>
          <label className="px-4 py-2 bg-gray-900 text-white rounded-lg 
                         hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload JSON
            <input
              type="file"
              accept=".json"
              onChange={handleUploadGraph}
              className="hidden"
            />
          </label>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 300, y: 100, zoom: 1 }}
          selectionKeyCode={selectionKey}
          selectionOnDrag={true}
          selectNodesOnDrag={true}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={isDraggable}
          elevateNodesOnSelect={false}
          nodeOrigin={[0.5, 0.5]}
          proOptions={{ hideAttribution: true }}
          
        >
          <Background />
          <Controls />
        </ReactFlow>
        <PromptInput onSubmit={handleNewPrompt} />
      </div>
      <Sidebar 
        selectedNode={selectedNode || null}
        onUpdateContent={handleUpdateNodeContent}
        onSystemPrompt={handleSystemPrompt}
        responseCount={responseCount}
        onResponseCountChange={setResponseCount}
        onAddSystemNode={handleAddSystemNode}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
} 