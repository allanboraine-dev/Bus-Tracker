import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// Interpolate function to generate points between two coordinates
function interpolate(start: number[], end: number[], steps: number) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const lat = start[0] + (end[0] - start[0]) * (i / steps);
    const lng = start[1] + (end[1] - start[1]) * (i / steps);
    points.push({ lat, lng });
  }
  return points;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

const STOPS = [
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Worcester", lat: -33.6384, lng: 19.4442 },
  { name: "Beaufort West", lat: -32.3551, lng: 22.5807 },
  { name: "Victoria West", lat: -31.4023, lng: 23.1118 },
  { name: "Kimberley", lat: -28.7282, lng: 24.7623 },
  { name: "Klerksdorp", lat: -26.8522, lng: 26.6667 },
  { name: "Potchefstroom", lat: -26.7145, lng: 27.0970 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 }
];

// Generate a mock route going via Kimberley
const KEY_WAYPOINTS = [
  [-33.9249, 18.4241], // CT
  [-33.7225, 18.9667], // Paarl
  [-33.6384, 19.4442], // Worcester
  [-32.3551, 22.5807], // Beaufort West
  [-31.4023, 23.1118], // Victoria West
  [-28.7282, 24.7623], // Kimberley
  [-26.8522, 26.6667], // Klerksdorp
  [-26.7145, 27.0970], // Potchefstroom
  [-26.2041, 28.0473], // JHB
];

// Build the dense array of points
let SIMULATION_PATH: { lat: number, lng: number }[] = [];
for (let i = 0; i < KEY_WAYPOINTS.length - 1; i++) {
  // 15 steps between each major waypoint to get ~100 points
  const segmentPoints = interpolate(KEY_WAYPOINTS[i], KEY_WAYPOINTS[i+1], 15);
  SIMULATION_PATH = [...SIMULATION_PATH, ...segmentPoints];
}

// Global state for simple in-memory tracking
let isSimulating = false;
let currentSimulationId = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceReset = url.searchParams.get("reset") === "true";

  if (isSimulating && !forceReset) {
    return NextResponse.json({ message: "Simulation already running." });
  }

  const simId = ++currentSimulationId;
  isSimulating = true;
  
  // Start the background loop without awaiting it, so the request completes immediately
  (async () => {
    console.log("Starting Ghost Bus Simulation...");
    const tripCode = "CX-CT2JHB";

    // Instantly reset the bus back to Cape Town so the user sees the start
    let resetPayload: any = {
      latitude: SIMULATION_PATH[0].lat,
      longitude: SIMULATION_PATH[0].lng,
      status_message: "Boarding - Cape Town Terminus",
      current_speed: 0
    };
    
    let resetResult = await supabase.from("trips").update(resetPayload).eq("trip_code", tripCode);
    if (resetResult.error && resetResult.error.message.includes('current_speed')) {
      delete resetPayload.current_speed;
      await supabase.from("trips").update(resetPayload).eq("trip_code", tripCode);
    }

    // Wait a couple seconds so the user can load the page and see the start before it moves
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (let i = 0; i < SIMULATION_PATH.length; i++) {
      if (currentSimulationId !== simId) {
        console.log(`Simulation ${simId} aborted in favor of new run.`);
        return;
      }
      
      const coord = SIMULATION_PATH[i];
      const progressPercent = (i / SIMULATION_PATH.length) * 100;
      
      const jhb = STOPS[STOPS.length - 1];
      const distToJHB = calculateDistance(coord.lat, coord.lng, jhb.lat, jhb.lng);
      
      const upcomingStop = STOPS.find(stop => {
        const stopDistToJHB = calculateDistance(stop.lat, stop.lng, jhb.lat, jhb.lng);
        return stopDistToJHB < (distToJHB - 10);
      }) || jhb;

      let status = `En Route to ${upcomingStop.name}`;
      let currentSpeed = Math.floor(Math.random() * (105 - 90 + 1) + 90);
      
      // Stop logic
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

      // Update Supabase
      let updatePayload: any = {
        latitude: coord.lat,
        longitude: coord.lng,
        status_message: status,
        current_speed: currentSpeed,
      };
      
      let { error } = await supabase.from("trips").update(updatePayload).eq("trip_code", tripCode);

      if (error && error.message.includes('current_speed')) {
        delete updatePayload.current_speed;
        error = (await supabase.from("trips").update(updatePayload).eq("trip_code", tripCode)).error;
      }

      if (error) {
        console.error("Supabase update error:", error);
      } else {
        console.log(`Updated point ${i}/${SIMULATION_PATH.length}: [${coord.lat}, ${coord.lng}] - ${status}`);
      }

      // If refreshment stop, wait 5 seconds, otherwise 1.5 seconds
      const waitTime = status.includes("Refreshment") ? 5000 : 1500;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Arrival
    if (currentSimulationId === simId) {
      let arrivePayload: any = { status_message: "Arrived at Destination", current_speed: 0 };
      let arrRes = await supabase.from("trips").update(arrivePayload).eq("trip_code", tripCode);
      if (arrRes.error && arrRes.error.message.includes('current_speed')) {
        delete arrivePayload.current_speed;
        await supabase.from("trips").update(arrivePayload).eq("trip_code", tripCode);
      }
      console.log(`Simulation ${simId} complete.`);
      isSimulating = false;
    }
  })();

  return NextResponse.json({ 
    message: "Simulation started successfully.",
    totalPoints: SIMULATION_PATH.length
  });
}
