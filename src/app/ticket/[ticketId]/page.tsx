"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Bus, ChevronLeft, MapPin, User, Clock, QrCode } from "lucide-react";

export default function TicketPage({ params }: { params: { ticketId: string } }) {
  const router = useRouter();
  
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const { data, error: sbError } = await supabase
          .from("tickets")
          .select("*")
          .eq("ticket_code", params.ticketId)
          .single();
          
        if (sbError || !data) {
          throw new Error("Ticket not found");
        }
        
        setTicket(data);
      } catch (err: any) {
        setError(err.message || "Could not find ticket");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTicket();
  }, [params.ticketId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-50">
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-red-500/30 text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
          <p className="text-slate-400 mb-6">We couldn't find a ticket matching {params.ticketId}. Please check the code and try again.</p>
          <button 
            onClick={() => router.push("/")}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium w-full transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6 bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {/* Top Nav */}
      <div className="w-full max-w-md mb-8 flex items-center justify-between z-10">
        <button 
          onClick={() => router.push("/")}
          className="p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <span className="font-semibold text-slate-300 tracking-wider text-sm uppercase">Digital Pass</span>
        <div className="w-11"></div> {/* Spacer */}
      </div>

      {/* Ticket Card */}
      <div className="w-full max-w-md bg-slate-100 text-slate-900 rounded-[2rem] overflow-hidden shadow-2xl relative z-10">
        
        {/* Top Section */}
        <div className="bg-amber-400 p-8 text-slate-950 flex flex-col items-center justify-center relative">
          {/* Tear perforations */}
          <div className="absolute -bottom-3 left-0 w-full flex justify-between px-2 gap-2">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-slate-100 rounded-full"></div>
            ))}
          </div>

          <div className="w-16 h-16 bg-slate-950 text-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">Cityxpress</h1>
          <p className="text-amber-900 font-medium text-sm tracking-widest uppercase">Premium Boarding Pass</p>
        </div>

        {/* Middle Section - Details */}
        <div className="p-8 pt-10">
          <div className="flex justify-between items-end mb-8">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Passenger</span>
              <span className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" /> {ticket.passenger_name}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Seat</span>
              <span className="text-xl font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                {ticket.seat_number}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex flex-col items-center mt-1">
                <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-300 shadow-sm"></div>
                <div className="w-0.5 h-12 bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-sm"></div>
              </div>
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{ticket.departure_time.split('(')[0].trim()}</span>
                  <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Departs {ticket.departure_time.split('(')[1].replace(')', '')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{ticket.arrival_time.split('(')[0].trim()}</span>
                  <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Arrives {ticket.arrival_time.split('(')[1].replace(')', '')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Barcode */}
        <div className="border-t-2 border-dashed border-slate-300 p-8 bg-slate-50 flex flex-col items-center">
          <div className="w-full h-16 bg-[repeating-linear-gradient(90deg,#0f172a_0px,#0f172a_2px,transparent_2px,transparent_6px,#0f172a_6px,#0f172a_10px,transparent_10px,transparent_14px,#0f172a_14px,#0f172a_15px,transparent_15px,transparent_18px,#0f172a_18px,#0f172a_22px)] mb-3 opacity-80"></div>
          <span className="font-mono text-sm tracking-[0.3em] text-slate-500">{ticket.ticket_code}</span>
        </div>
      </div>

      {/* Call to Action */}
      <div className="w-full max-w-md mt-8 z-10">
        <button
          onClick={async () => {
            // Await the fetch so it completes before navigation, forcing a reset
            await fetch('/api/simulate?reset=true', { cache: 'no-store' }).catch(console.error);
            router.push(`/track/${ticket.trip_code}`);
          }}
          className="group relative flex items-center justify-center w-full gap-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-lg py-5 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] hover:-translate-y-1"
        >
          <MapPin className="w-6 h-6 animate-bounce" />
          <span>Track Live Journey</span>
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </div>
    </div>
  );
}

// Add Search icon to the missing import since it's used in the error state
import { Search } from "lucide-react";
