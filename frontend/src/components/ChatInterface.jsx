import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am connected to your SAP Order-to-Cash context graph. You can ask me questions like:\n- Tracer the flow of Sales Order 100\n- Which products have the highest billing?\n- Show me incomplete deliveries."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content }),
      });
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to the analytical engine." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e293b]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md ${
              msg.role === "user" 
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" 
                : "bg-gradient-to-br from-emerald-400 to-teal-500 text-[#0f172a]"
            }`}>
              {msg.role === "user" ? <User size={16} strokeWidth={2.5} /> : <Bot size={18} strokeWidth={2.5} />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === "user"
                ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/30 rounded-tr-sm"
                : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm"
            }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[#0f172a] flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
              <Bot size={18} strokeWidth={2.5} />
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form onSubmit={handleSend} className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-25 group-focus-within:opacity-50 transition-opacity duration-300"></div>
          <div className="relative flex items-center bg-[#1e293b] rounded-xl border border-slate-700 shadow-inner overflow-hidden focus-within:border-emerald-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the context graph..."
              className="flex-1 bg-transparent py-3 px-4 outline-none text-slate-200 text-sm placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 mr-1 text-slate-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
           {/* Context Hints */}
           <div className="flex justify-between items-center mt-3 text-xs">
              <span className="text-slate-500 flex items-center gap-1"><Sparkles size={12}/> LLM-Powered Natural Language</span>
              <span className="text-slate-600">Enter to send</span>
           </div>
        </form>
      </div>
    </div>
  );
}
