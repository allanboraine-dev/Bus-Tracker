"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { Bus, ChevronLeft, Clock, Navigation, MapPin, Gauge, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

// Dynamically import MapComponent so it doesn't SSR (Leaflet requires window)
const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

const STOPS = [
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Worcester", lat: -33.6384, lng: 19.4442 },
  { name: "Beaufort West", lat: -32.3551, lng: 22.5807 },
  { name: "Victoria West", lat: -31.4023, lng: 23.1118 },
  { name: "Kimberley", lat: -28.7282, lng: 24.7623 },
  { name: "Klerksdorp", lat: -26.8522, lng: 26.6667 },
  { name: "Potchefstroom", lat: -26.7145, lng: 27.0970 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

export default function TrackPage({ params }: { params: { tripId: string } }) {
  const router = useRouter();
  
  const [tripData, setTripData] = useState({
    latitude: -33.9249,
    longitude: 18.4241,
    status_message: "Locating bus...",
    eta: "--:--",
    current_speed: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [nextStop, setNextStop] = useState("Loading...");

  const [isDriving, setIsDriving] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentStepRef = useRef(0);
  const simulationPathRef = useRef<{lat: number, lng: number}[]>([]);

  // Cleanup simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  const startSimulation = async () => {
    try {
      const res = await fetch('/api/simulate');
      const data = await res.json();
      simulationPathRef.current = data.path;
      currentStepRef.current = 0;
      
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      
      const startPoint = data.path[0];
      
      // Optimistic update
      setTripData(prev => ({
        ...prev,
        latitude: startPoint.lat,
        longitude: startPoint.lng,
        status_message: "Boarding - Cape Town Terminus",
        current_speed: 0
      }));
      
      // Trigger backend reset
      await supabase.from("trips").update({
        latitude: startPoint.lat,
        longitude: startPoint.lng,
        status_message: "Boarding - Cape Town Terminus",
        current_speed: 0
      }).eq("trip_code", params.tripId);
      
      setIsDriving(true);
      
      const tick = async () => {
        currentStepRef.current++;
        const step = currentStepRef.current;
        const path = simulationPathRef.current;
        
        if (step >= path.length) {
           if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
           setIsDriving(false);
           await supabase.from("trips").update({ status_message: "Arrived at Destination", current_speed: 0 }).eq("trip_code", params.tripId);
           return;
        }
        
        const coord = path[step];
        const jhb = STOPS[STOPS.length - 1];
        const distToJHB = calculateDistance(coord.lat, coord.lng, jhb.lat, jhb.lng);
        const upcomingStop = STOPS.find(stop => {
          const stopDistToJHB = calculateDistance(stop.lat, stop.lng, jhb.lat, jhb.lng);
          return stopDistToJHB < (distToJHB - 10);
        }) || jhb;

        let status = `En Route to ${upcomingStop.name}`;
        let currentSpeed = Math.floor(Math.random() * (105 - 90 + 1) + 90);

        const distToBeaufort = calculateDistance(coord.lat, coord.lng, -32.3551, 22.5807);
        if (distToBeaufort < 8) {
          status = "Refreshment Stop: Beaufort West";
          currentSpeed = 0;
        }

        const distToKimberley = calculateDistance(coord.lat, coord.lng, -28.7282, 24.7623);
        if (distToKimberley < 8) {
          status = "Refreshment Stop: Kimberley";
          currentSpeed = 0;
        }
        
        await supabase.from("trips").update({
          latitude: coord.lat,
          longitude: coord.lng,
          status_message: status,
          current_speed: currentSpeed,
        }).eq("trip_code", params.tripId);
      };
      
      simulationIntervalRef.current = setInterval(tick, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const processIncomingData = (newData: any) => {
    setTripData(newData);
          
    // Basic progress calculation based on latitude moving north (from -33.9 to -26.2)
    const startLat = -33.9249;
    const endLat = -26.2041;
    const totalDist = Math.abs(endLat - startLat);
    const currentDist = Math.abs(newData.latitude - startLat);
    let percent = (currentDist / totalDist) * 100;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;
    setProgress(percent);

    // Calculate distance remaining to JHB
    const jhb = STOPS[STOPS.length - 1];
    const distToJHB = calculateDistance(newData.latitude, newData.longitude, jhb.lat, jhb.lng);
    setDistanceRemaining(Math.round(distToJHB));

    // Find next stop
    const upcomingStop = STOPS.find(stop => {
      const stopDistToJHB = calculateDistance(stop.lat, stop.lng, jhb.lat, jhb.lng);
      // It's the "next" stop if its distance to JHB is less than our current distance to JHB (minus a small 5km buffer to handle passing it)
      return stopDistToJHB < (distToJHB - 5);
    }) || jhb;

    setNextStop(upcomingStop.name);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchTrip = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("trip_code", params.tripId)
        .single();
        
      if (data) {
        processIncomingData(data);
        setIsLoaded(true);
      }
    };
    
    fetchTrip();
  }, [params.tripId]);

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel(`trip_${params.tripId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trips",
          filter: `trip_code=eq.${params.tripId}`,
        },
        (payload) => {
          processIncomingData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.tripId]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex flex-col">
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapComponent 
          latitude={tripData.latitude} 
          longitude={tripData.longitude} 
          isLoaded={isLoaded} 
        />
      </div>

      {/* Top Navigation */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
        <button 
          onClick={() => router.push("/")}
          className="pointer-events-auto p-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-lg transition-all"
        >
          <ChevronLeft className="w-6 h-6 text-slate-200" />
        </button>
        
        <div className="pointer-events-auto px-6 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-lg flex items-center gap-3">
          <Bus className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-slate-200 tracking-wider">CITYXPRESS</span>
        </div>

        {/* Demo Reset Button */}
        <button 
          onClick={startSimulation}
          className={`pointer-events-auto p-3 backdrop-blur-md border rounded-2xl shadow-lg transition-all flex items-center gap-2 group ${isDriving ? 'bg-green-500/20 hover:bg-green-500/40 border-green-500/50' : 'bg-amber-500/20 hover:bg-amber-500/40 border-amber-500/50'}`}
          title={isDriving ? "Simulation Running" : "Reset Demo Simulation"}
        >
          <RefreshCw className={`w-5 h-5 ${isDriving ? 'text-green-400 animate-spin' : 'text-amber-400 group-active:animate-spin'}`} />
        </button>
      </div>

      {/* Bottom Status Card Overlay */}
      <div className="absolute bottom-0 left-0 w-full z-10">
        <div className="bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800 rounded-t-[2rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {/* Header row: Live indicator & ETA */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400">Live GPS Active</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 max-w-[200px] leading-tight">{tripData.status_message}</h2>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                <Clock className="w-3 h-3" /> ETA
              </span>
              <span className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                {tripData.eta}
              </span>
            </div>
          </div>

          {/* Distance and Next Stop Row */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50 shadow-inner">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                <Navigation className="w-3 h-3 text-amber-500" /> Remaining
              </span>
              <span className="text-lg font-bold text-slate-200">{distanceRemaining} <span className="text-sm font-medium text-slate-500">km</span></span>
            </div>
            
            <div className="w-px h-10 bg-slate-700/50"></div>
            
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1 text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                <Gauge className="w-3 h-3 text-amber-500" /> Speed
              </span>
              <span className="text-lg font-bold text-slate-200">{tripData.current_speed} <span className="text-sm font-medium text-slate-500">km/h</span></span>
            </div>

            <div className="w-px h-10 bg-slate-700/50"></div>
            
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1 text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                <MapPin className="w-3 h-3 text-amber-500" /> Next Stop
              </span>
              <span className="text-lg font-bold text-slate-200">{nextStop}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2 px-1">
              <span>Cape Town</span>
              <span>Johannesburg</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-in-out relative"
                style={{ width: `${Math.max(progress, 5)}%` }}
              >
                {/* Glow effect on the tip of the progress bar */}
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 blur-[2px] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
