import React, { useState, useEffect } from "react";
import GraphViewer from "./components/GraphViewer";
import ChatInterface from "./components/ChatInterface";
import { Activity } from "lucide-react";

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch graph data from backend
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/graph`)
      .then((res) => res.json())
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load graph:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar - Chat Interface */}
      <div className="w-[400px] flex-shrink-0 border-r border-slate-700 bg-[#1e293b] flex flex-col shadow-2xl z-10 relative">
        <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-[#1e293b] to-[#0f172a] shadow-md flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              O2C Context Graph
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Knowledge Engine</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
           <ChatInterface />
        </div>
      </div>

      {/* Main Area - Graph Visualization */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
        <div className="absolute top-4 left-4 z-10 py-2 px-4 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700 shadow-lg flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                {loading ? "Loading Graph Network..." : `${graphData.nodes.length} Nodes Rendered`}
            </span>
        </div>
        
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          {!loading && <GraphViewer data={graphData} />}
        </div>
      </div>
      
    </div>
  );
}

export default App;
