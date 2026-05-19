"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Demo coordinates for drawing the full route path via Kimberley
const ROUTE_COORDINATES: [number, number][] = [
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

// Custom Bus Marker HTML Icon
const busIcon = L.divIcon({
  className: "custom-bus-marker",
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
      <div style="position: absolute; inset: 0; background-color: #fbbf24; border-radius: 50%; opacity: 0.2; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background-color: #fbbf24; border: 3px solid #020617; border-radius: 50%; box-shadow: 0 0 15px rgba(251,191,36,0.6);">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#020617" stroke="#020617" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});


interface MapComponentProps {
  latitude: number;
  longitude: number;
  isLoaded: boolean;
}

export default function MapComponent({ latitude, longitude, isLoaded }: MapComponentProps) {
  const mapRef = useRef<L.Map>(null);

  // Fly to the new coordinates when they change
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.flyTo([latitude, longitude], 12, {
        animate: true,
        duration: 2,
      });
    }
  }, [latitude, longitude, isLoaded]);

  return (
    <div style={{ width: "100%", height: "100%", zIndex: 0 }}>
      <MapContainer
        center={[latitude || -33.9249, longitude || 18.4241]}
        zoom={12}
        style={{ width: "100%", height: "100%", background: "#020617" }}
        zoomControl={false}
        ref={mapRef}
      >
        {/* Dark style tile layer from Carto (Free, no token required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Faint Polyline for Route */}
        <Polyline
          positions={ROUTE_COORDINATES}
          pathOptions={{ color: "#fcd34d", weight: 4, opacity: 0.3 }}
        />

        {/* Bus Marker */}
        {isLoaded && (
          <Marker position={[latitude, longitude]} icon={busIcon} />
        )}
      </MapContainer>
    </div>
  );
}
