import { NextResponse } from "next/server";

// Dynamic Fallback Tankers inside the India/Indian Ocean bounding box
// Box: lamin=5.0, lomin=65.0, lamax=35.0, lomax=95.0
let simulatedTankers = [
  { 
    id: "940021", 
    name: "MT-EVERGIVEN", 
    lat: 18.0401, 
    lon: 68.1233, 
    speed: 14.0, 
    heading: 82, 
    status: "warning" as const, 
    statusText: "IDLE", 
    info: "Class A Container. Delayed due to engine cooling unit stress.", 
    cargo: "4,500 TEU High Value Electronics" 
  },
  { 
    id: "912554", 
    name: "MT-ALPHA", 
    lat: 12.3501, 
    lon: 72.1894, 
    speed: 14.2, 
    heading: 185, 
    status: "critical" as const, 
    statusText: "AIS BLACKOUT", 
    info: "Suspected Dark Fleet oil tanker. Transponder shut off 12 minutes ago.", 
    cargo: "Crude (Sanctioned)" 
  },
  { 
    id: "921554", 
    name: "MT-ORION", 
    lat: 9.3500, 
    lon: 78.1800, 
    speed: 15.1, 
    heading: 45, 
    status: "warning" as const, 
    statusText: "UNKNOWN", 
    info: "Suspected Dark Fleet oil tanker. Signal highly intermittent.", 
    cargo: "Crude Oil (Classified)" 
  },
  { 
    id: "938472", 
    name: "MT-VALKYRIE", 
    lat: 6.1200, 
    lon: 85.3000, 
    speed: 13.8, 
    heading: 220, 
    status: "critical" as const, 
    statusText: "DARK OPERATION", 
    info: "Tanker conducting unscheduled offshore bunkering.", 
    cargo: "Refined Petroleum" 
  }
];

let lastMaritimeUpdate = Date.now();

export async function GET() {
  const now = Date.now();
  const elapsed = (now - lastMaritimeUpdate) / 1000;
  lastMaritimeUpdate = now;

  // Mathematically update tanker coordinates
  // Instruction: approx 0.005 degrees every 10 seconds => 0.0005 degrees per second
  const driftRatePerSecond = 0.0005;

  simulatedTankers = simulatedTankers.map(t => {
    // Math conversion: headings are in degrees relative to North (0 deg is north, 90 is east)
    // In standard polar coords: 0 deg is right (East), 90 deg is up (North)
    // To convert nautical heading to standard cartesian radians:
    const rad = ((90 - t.heading) * Math.PI) / 180;
    
    const dLat = Math.sin(rad) * driftRatePerSecond * elapsed;
    const dLon = Math.cos(rad) * driftRatePerSecond * elapsed;

    let newLat = t.lat + dLat;
    let newLon = t.lon + dLon;

    // Boundaries checking: lamin=5.0, lomin=65.0, lamax=35.0, lomax=95.0
    // If boundary hit, reverse the heading to keep them drifting inside the active tactical radar area
    if (newLat < 5.0 || newLat > 35.0) {
      t.heading = (360 - t.heading) % 360;
      newLat = Math.max(5.0, Math.min(35.0, newLat));
    }
    if (newLon < 65.0 || newLon > 95.0) {
      t.heading = (180 - t.heading) % 360;
      newLon = Math.max(65.0, Math.min(95.0, newLon));
    }

    return {
      ...t,
      lat: Number(newLat.toFixed(4)),
      lon: Number(newLon.toFixed(4))
    };
  });

  const mappedVessels = simulatedTankers.map(t => ({
    id: `vessel-${t.id}`,
    name: t.name,
    code: `IMO:${t.id}`,
    type: "ship" as const,
    lat: `${t.lat.toFixed(4)}° N`,
    lon: `${t.lon.toFixed(4)}° E`,
    speed: `${t.speed.toFixed(1)} kts`,
    heading: `${t.heading}°`,
    status: t.status,
    statusText: t.statusText,
    info: t.info,
    cargo: t.cargo
  }));

  return NextResponse.json({
    source: "maritime-ghost-protocol",
    timestamp: new Date().toISOString(),
    data: mappedVessels
  });
}
