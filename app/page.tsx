"use client";

import { useState } from "react";
import { Send, User, Bot, Loader2, LayoutList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChartData {
  type: string;
  title: string;
  labels: string[];
  values: number[];
}

interface AIResponse {
  status: string;
  summary: string;
  charts: ChartData[];
  raw_data: any[];
  insight: string | null;
  error?: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  data?: AIResponse;
}

export default function ChatDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const starterQueries = [
    "Give me a breakdown of all tickets by their status",
    "Show me the 5 most recent high priority tickets",
    "What is the total number of closed tickets?",
    "Show me the top 10 most common problems reported by clients"
  ];

const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // --- UPGRADED: SMART CONTEXT RESOLUTION ---
    let backendQuery = text;
    
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      
      // If the AI's last message was asking for clarification/timeframe...
      if (lastMessage.role === "ai" && (lastMessage.content.includes("specify") || lastMessage.content.includes("narrow") || lastMessage.content.includes("timeframe"))) {
        
        // Find what the user originally asked before the AI interrupted
        const originalUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
        
        // Structure a foolproof command for the AI
        backendQuery = `[ORIGINAL REQUEST]: "${originalUserMessage}"
[AI CLARIFICATION]: "${lastMessage.content}"
[USER'S REPLY]: "${text}"

INSTRUCTION: Logically combine the [ORIGINAL REQUEST] and the [USER'S REPLY] to generate the final SQL query. (Example: If original was 'closed tickets' and reply is 'last month', generate SQL for 'closed tickets last month'). If the user's reply is a completely new question, ignore the original request.`;
      }
    }
    // ------------------------------------------

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: backendQuery, turn_count: messages.length }),
      });

      const data: AIResponse = await response.json();

      setMessages((prev) => [...prev, { role: "ai", content: data.summary, data }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "Failed to connect to the backend server." }]);
    } finally {
      setIsLoading(false);
    }
  };


  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    if (data.length === 1 && Object.keys(data[0]).length === 1) {
      const value = Object.values(data[0])[0];
      return (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 font-medium text-lg">
          Result: {String(value)}
        </div>
      );
    }

    const headers = Object.keys(data[0]);

    return (
      <div className="mt-4 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <LayoutList size={16} /> Data Results ({data.length} rows)
        </div>
        <div className="overflow-x-auto max-h-[400px] relative">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="font-semibold text-slate-700 whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i} className="hover:bg-slate-50">
                  {headers.map((header, j) => (
                    <TableCell key={j} className="whitespace-nowrap max-w-[200px] truncate text-slate-600">
                      {row[header] !== null ? String(row[header]) : "N/A"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center gap-3">
        <Bot className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">Corporate Ticket AI</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center">Welcome. What would you like to analyze today?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {starterQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(query)}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left text-slate-700 font-medium"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 max-w-5xl mx-auto ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 shadow-sm"}`}>
              {msg.role === "user" ? <User size={20} /> : <Bot size={20} />}
            </div>

            <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"} w-full min-w-0`}>
              <div className={`px-5 py-3 rounded-2xl max-w-[80%] shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-100 text-slate-800"}`}>
                {msg.content}
              </div>

              {msg.data?.raw_data && msg.data.raw_data.length > 0 && renderTable(msg.data.raw_data)}

              {/* Fallback Renderer (If the backend sends Chart data, format it as a Table instead) */}
              {(!msg.data?.raw_data || msg.data?.raw_data.length === 0) && msg.data?.charts && msg.data.charts.length > 0 && renderTable(
                msg.data.charts[0].labels.map((label, index) => ({
                  "Category": label,
                  "Count": msg.data?.charts[0]?.values[index]
                }))
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 max-w-5xl mx-auto">
             <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm flex items-center justify-center shrink-0">
               <Loader2 className="w-5 h-5 animate-spin" />
             </div>
             <div className="px-5 py-3 rounded-2xl bg-white border border-slate-100 text-slate-400 shadow-sm italic">
            Fetching the asked data...
             </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="max-w-5xl mx-auto relative flex items-center shadow-lg rounded-full">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask for data details..."
            className="w-full bg-white border border-slate-300 rounded-full pl-6 pr-14 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}