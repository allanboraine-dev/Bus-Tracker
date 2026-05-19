"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, Search, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [ticketCode, setTicketCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;
    
    setIsSubmitting(true);
    // Simple uppercase format
    const formattedCode = ticketCode.trim().toUpperCase();
    router.push(`/ticket/${formattedCode}`);
  };

  const useDemoTicket = () => {
    setTicketCode("TKT-90210");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl -z-10 mix-blend-screen opacity-50"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl -z-10 mix-blend-screen opacity-50"></div>

      <div className="flex flex-col items-center justify-center w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-center w-20 h-20 bg-amber-400 rounded-2xl mb-6 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
          <Bus className="w-10 h-10 text-slate-950" />
        </div>
        
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Cityxpress</h1>
        <p className="text-slate-400 text-center mb-10 text-sm">
          Premium Intercity Travel.<br/>
          Enter your ticket number to view your journey.
        </p>

        <form onSubmit={handleSearch} className="w-full relative mb-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
            </div>
            <input
              type="text"
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all text-lg font-mono tracking-widest placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal"
              placeholder="e.g. TKT-90210"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !ticketCode.trim()}
              className="absolute inset-y-2 right-2 flex items-center justify-center bg-amber-400 text-slate-950 rounded-xl px-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
        
        <button 
          type="button" 
          onClick={useDemoTicket}
          className="text-xs text-slate-500 hover:text-amber-400 font-medium tracking-wider uppercase transition-colors"
        >
          Use Demo Ticket: TKT-90210
        </button>
      </div>
    </main>
  );
}
