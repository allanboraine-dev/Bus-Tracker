import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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

export async function GET() {
  // Build the dense array of points
  let SIMULATION_PATH: { lat: number, lng: number }[] = [];
  for (let i = 0; i < KEY_WAYPOINTS.length - 1; i++) {
    // 15 steps between each major waypoint to get ~100 points
    const segmentPoints = interpolate(KEY_WAYPOINTS[i], KEY_WAYPOINTS[i+1], 15);
    SIMULATION_PATH = [...SIMULATION_PATH, ...segmentPoints];
  }

  return NextResponse.json({ 
    path: SIMULATION_PATH
  });
}
