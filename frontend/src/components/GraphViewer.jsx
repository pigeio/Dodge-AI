import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

  // Auto-resize graph to fit container
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
    
    // Fit to initial load 
    setTimeout(() => {
        if(graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
        }
    }, 500);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data]);

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
          
          // Draw Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fillStyle = NODE_COLORS[node.type] || NODE_COLORS.Unknown;
          ctx.fill();
          
          // Draw glowing border
          ctx.lineWidth = 1/globalScale;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Only draw text if zoomed in enough
          if (globalScale >= 2) {
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
          graphRef.current.centerAt(node.x, node.y, 1000);
          graphRef.current.zoom(4, 1000);
        }}
        cooldownTicks={100}
      />
    </div>
  );
}
