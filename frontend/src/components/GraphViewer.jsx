import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { X, GitBranch, Tag } from 'lucide-react';

// Color mapping for different entity types
const NODE_COLORS = {
  SalesOrder: '#3b82f6', // blue
  Customer: '#ec4899', // pink
  Delivery: '#f59e0b', // amber
  BillingDocument: '#10b981', // emerald
  AccountingDocument: '#8b5cf6', // purple
  Product: '#14b8a6', // teal
  Payment: '#f43f5e', // rose
  Unknown: '#94a3b8' // slate
};

export default function GraphViewer({ data }) {
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    setTimeout(() => {
        if(graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
        }
    }, 500);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data]);

  // Find connected edges for the selected node
  const getNodeConnections = (nodeId) => {
    if (!data || !data.links) return [];
    return data.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === nodeId || targetId === nodeId;
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel="label"
        nodeColor={node => NODE_COLORS[node.type] || NODE_COLORS.Unknown}
        nodeRelSize={6}
        linkLabel="label"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkColor={() => 'rgba(148, 163, 184, 0.4)'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          
          const isSelected = selectedNode && selectedNode.id === node.id;
          const radius = isSelected ? 7 : 5;

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = NODE_COLORS[node.type] || NODE_COLORS.Unknown;
          ctx.fill();
          
          if (isSelected) {
            ctx.lineWidth = 2/globalScale;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = NODE_COLORS[node.type] || '#fff';
            ctx.shadowBlur = 15;
          } else {
            ctx.lineWidth = 1/globalScale;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (globalScale >= 2 || isSelected) {
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 
              
              ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 7 - bckgDimensions[1] / 2, ...bckgDimensions);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#f8fafc';
              ctx.fillText(label, node.x, node.y + 7);
          }
        }}
        onNodeClick={node => {
          setSelectedNode(node);
          graphRef.current.centerAt(node.x, node.y, 1000);
          graphRef.current.zoom(4, 1000);
        }}
        onBackgroundClick={() => setSelectedNode(null)}
        cooldownTicks={100}
      />

      {/* Node Metadata Inspection Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[selectedNode.type] || NODE_COLORS.Unknown }}></div>
              <h3 className="text-sm font-bold text-slate-100 tracking-wide">{selectedNode.type}</h3>
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Properties */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <Tag size={12} /> Properties
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 px-3 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-400">ID</span>
                <span className="text-xs text-slate-200 font-mono">{selectedNode.id}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-400">Label</span>
                <span className="text-xs text-slate-200">{selectedNode.label}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-400">Type</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${NODE_COLORS[selectedNode.type] || NODE_COLORS.Unknown}22`, color: NODE_COLORS[selectedNode.type] || NODE_COLORS.Unknown }}>
                  {selectedNode.type}
                </span>
              </div>
            </div>

            {/* Connections */}
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold mt-4">
              <GitBranch size={12} /> Connections
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {getNodeConnections(selectedNode.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No direct connections.</p>
              ) : (
                getNodeConnections(selectedNode.id).map((link, idx) => {
                  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                  const isOutgoing = sourceId === selectedNode.id;
                  const otherNodeId = isOutgoing ? targetId : sourceId;
                  return (
                    <div key={idx} className="flex items-center gap-2 py-1.5 px-3 bg-slate-800/50 rounded-lg text-xs">
                      <span className={`${isOutgoing ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isOutgoing ? '→' : '←'}
                      </span>
                      <span className="text-slate-300 truncate flex-1">{otherNodeId}</span>
                      <span className="text-slate-500 text-[10px] italic">{link.label || 'connected'}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 shadow-lg">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(NODE_COLORS).filter(([k]) => k !== 'Unknown').map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-[10px] text-slate-300">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
