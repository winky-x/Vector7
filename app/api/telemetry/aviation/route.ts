import { NextResponse } from "next/server";

// Fallback dynamic generator helper that clusters flights heavily over major landmasses
function generateClusteredFlights(count: number): any[] {
  const list = [];
  const clusters = [
    { name: "Europe", latMin: 35, latMax: 65, lonMin: -10, lonMax: 40 },
    { name: "East Asia", latMin: 15, latMax: 45, lonMin: 100, lonMax: 140 },
    { name: "North America", latMin: 25, latMax: 55, lonMin: -125, lonMax: -70 }
  ];

  for (let i = 0; i < count; i++) {
    const randomCluster = clusters[Math.floor(Math.random() * clusters.length)];
    const u1 = Math.random();
    const u2 = Math.random();
    const lat = randomCluster.latMin + u1 * (randomCluster.latMax - randomCluster.latMin);
    const lon = randomCluster.lonMin + u2 * (randomCluster.lonMax - randomCluster.lonMin);

    const speed = 400 + Math.floor(Math.random() * 100);
    const heading = Math.floor(Math.random() * 360);
    const icao = Math.random().toString(16).substring(2, 8).toUpperCase();

    list.push({
      id: `sim-plane-${icao}`,
      name: `FLT-${icao}`,
      code: `ICAO:${icao}`,
      type: "plane" as const,
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      speed: `${speed} kts`,
      heading: `${heading}°`,
      status: "active" as const,
      statusText: "EN ROUTE",
      info: `Simulated air traffic inside ${randomCluster.name} cluster. Mapped dynamically to WebGL Hex Heatmap.`,
      cargo: "Commercial Air Transit",
      weight: Number((Math.random() * 10).toFixed(2)), // Dynamic weight field added
      velocity: speed // Add numeric velocity field
    });
  }

  return list;
}

let lastGlobalUpdate = Date.now();

export async function GET() {
  const now = Date.now();
  const elapsed = (now - lastGlobalUpdate) / 1000;
  lastGlobalUpdate = now;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      "https://opensky-network.org/api/states/all",
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Vector7-Geospatial-Defense-Interface/4.9"
        },
        next: { revalidate: 10 }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenSky status error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.states || !Array.isArray(data.states) || data.states.length === 0) {
      throw new Error("No state vectors in OpenSky response");
    }

    // Filter out invalid vectors (null coordinates)
    const validStates = data.states.filter(
      (state: any) => state[5] !== null && state[6] !== null
    );

    // Randomly sample ~1,000 live flights to merge with simulation
    const sampledStates = validStates
      .sort(() => 0.5 - Math.random())
      .slice(0, 1000);

    const livePlanes = sampledStates.map((state: any) => {
      const icao = state[0] || "UNKNWN";
      const callsign = (state[1] || "").trim() || `FLT-${icao.toUpperCase()}`;
      const lon = state[5];
      const lat = state[6];
      const velocityMS = state[9];
      const heading = state[10];

      const speedKnots = velocityMS ? Math.round(velocityMS * 1.94384) : 420;

      return {
        id: `plane-${icao}`,
        name: callsign,
        code: `ICAO:${icao.toUpperCase()}`,
        type: "plane" as const,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        speed: `${speedKnots} kts`,
        heading: heading ? `${Math.round(heading)}°` : "360°",
        status: "active" as const,
        statusText: "EN ROUTE",
        info: `Aviation Transit. Altitude telemetry tracked via SATCOM-GEO-09. Origin: ${state[2] || "International"}.`,
        cargo: "Classified Strategic Air Freight",
        weight: Number((Math.random() * 10).toFixed(2)), // Dynamic weight field added
        velocity: speedKnots // Add numeric velocity field
      };
    });

    // Pad to exactly 5,000 clustered flights to create Paradigm look
    const needed = 5000 - livePlanes.length;
    const paddedPlanes = [...livePlanes, ...generateClusteredFlights(needed)];

    return NextResponse.json({
      source: "opensky-live-padded",
      timestamp: new Date().toISOString(),
      data: paddedPlanes
    });

  } catch (error) {
    // If OpenSky fails, return 5,000 fully simulated clustered flights
    const fallbackPlanes = generateClusteredFlights(5000);
    return NextResponse.json({
      source: "opensky-fallback-simulation-massive",
      timestamp: new Date().toISOString(),
      data: fallbackPlanes
    });
  }
}
