import { NextResponse } from "next/server";

export interface LiveNode {
  id: string;
  lat: number;
  lon: number;
  velocity: number; // knots
  category: "plane" | "ship";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback generator: spawns 1,000 mathematically clustered flight vectors
// over the three busiest air corridors on Earth.
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackFlights(count: number): LiveNode[] {
  const corridors = [
    { latMin: 35, latMax: 65, lonMin: -10, lonMax: 40 },   // Europe
    { latMin: 15, latMax: 45, lonMin: 100, lonMax: 145 },  // East Asia
    { latMin: 25, latMax: 55, lonMin: -125, lonMax: -65 }, // North America
    { latMin: 0,  latMax: 30, lonMin: 60,  lonMax: 90 },   // South Asia
  ];

  const nodes: LiveNode[] = [];
  for (let i = 0; i < count; i++) {
    const c = corridors[i % corridors.length];
    nodes.push({
      id: `SIM-FLT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      lat: parseFloat((c.latMin + Math.random() * (c.latMax - c.latMin)).toFixed(4)),
      lon: parseFloat((c.lonMin + Math.random() * (c.lonMax - c.lonMin)).toFixed(4)),
      velocity: parseFloat((380 + Math.random() * 220).toFixed(1)), // 380–600 kts
      category: "plane",
    });
  }
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ghost Protocol: 4-5 high-value tankers drifting the Indian Ocean at 14 kts.
// One tanker is intentionally < 2 kts to trigger the Chokepoint heuristic.
// ─────────────────────────────────────────────────────────────────────────────
function runGhostProtocol(): LiveNode[] {
  const ghostCount = 4 + Math.floor(Math.random() * 2); // 4 or 5

  const tankers: LiveNode[] = Array.from({ length: ghostCount }, (_, i) => ({
    id: `GHOST-TANKER-${String(i + 1).padStart(2, "0")}`,
    lat:  parseFloat((-20 + Math.random() * 30).toFixed(4)),  // −20°  to  10° N
    lon:  parseFloat((50  + Math.random() * 40).toFixed(4)),  //  50°  to  90° E
    velocity: 14, // nominal 14 kts
    category: "ship" as const,
  }));

  // Inject one anomalous ghost stopped at a chokepoint (Strait of Hormuz region)
  tankers.push({
    id: "GHOST-TANKER-CHOKE",
    lat:  25.3,
    lon:  56.4,
    velocity: 1.4, // < 2 kts → triggers Chokepoint alert in intelligence engine
    category: "ship",
  });

  return tankers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified GET /api/telemetry
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  let flights: LiveNode[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://opensky-network.org/api/states/all", {
      signal: controller.signal,
      headers: { "User-Agent": "Vector7-Intel-Platform/4.92" },
      next: { revalidate: 10 },
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);

    const data = await res.json();
    const states: any[] = Array.isArray(data?.states) ? data.states : [];

    const valid = states.filter((s) => s[5] !== null && s[6] !== null);

    if (valid.length >= 1000) {
      const sampled = valid.sort(() => 0.5 - Math.random()).slice(0, 1200);
      flights = sampled.map((s) => ({
        id:       `plane-${(s[0] || "unk").trim().toUpperCase()}`,
        lat:      parseFloat(Number(s[6]).toFixed(4)),
        lon:      parseFloat(Number(s[5]).toFixed(4)),
        velocity: s[9] ? parseFloat((s[9] * 1.94384).toFixed(1)) : 420, // m/s → kts
        category: "plane" as const,
      }));
    } else {
      throw new Error(`Insufficient states: ${valid.length}`);
    }
  } catch (err: any) {
    flights = generateFallbackFlights(1000);
  }

  const ships = runGhostProtocol();
  const unified: LiveNode[] = [...flights, ...ships];

  return NextResponse.json(unified, {
    headers: { "Cache-Control": "no-store" },
  });
}
