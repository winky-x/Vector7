import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

interface LiveNode {
  id: string;
  lat: number;
  lon: number;
  velocity: number;
  category: "plane" | "ship";
}

interface ThreatAlert {
  id: string;
  timestamp: string;
  level: "CRITICAL" | "WARNING";
  message: string;
  lat: number;
  lon: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Heuristic Threat Scanner — deterministic scanner
// ─────────────────────────────────────────────────────────────────────────────
function evaluateTelemetryHeuristics(nodes: LiveNode[]): ThreatAlert[] {
  const alerts: ThreatAlert[] = [];
  const now = new Date().toISOString();

  for (const node of nodes) {
    if (node.category === "ship") {
      // HEURISTIC-1: Chokepoint — ship nearly stationary
      if (node.velocity < 2) {
        alerts.push({
          id:        randomUUID(),
          timestamp: now,
          level:     "CRITICAL",
          message:   `Chokepoint detected: Vessel ${node.id} has nearly stopped (${node.velocity.toFixed(2)} kts) at ${node.lat.toFixed(2)}°N, ${node.lon.toFixed(2)}°E. Possible illicit transfer or blockade.`,
          lat:       node.lat,
          lon:       node.lon,
        });
      }
      // HEURISTIC-2: Anomalous ship speed — too fast for a tanker
      else if (node.velocity > 30) {
        alerts.push({
          id:        randomUUID(),
          timestamp: now,
          level:     "WARNING",
          message:   `Maritime Speed Anomaly: Vessel ${node.id} exceeding tanker threshold at ${node.velocity.toFixed(1)} kts. Possible interceptor or evasion manoeuvre.`,
          lat:       node.lat,
          lon:       node.lon,
        });
      }
    } else if (node.category === "plane") {
      // HEURISTIC-3: Supersonic / phantom transponder
      if (node.velocity > 600) {
        alerts.push({
          id:        randomUUID(),
          timestamp: now,
          level:     "WARNING",
          message:   `Vector Anomaly: Flight ${node.id} is broadcasting supersonic velocity (${node.velocity.toFixed(0)} kts). Possible spoofed transponder or military fast-mover.`,
          lat:       node.lat,
          lon:       node.lon,
        });
      }
      // HEURISTIC-4: Stall-speed commercial — aircraft in distress or circling
      else if (node.velocity > 0 && node.velocity < 80) {
        alerts.push({
          id:        randomUUID(),
          timestamp: now,
          level:     "WARNING",
          message:   `Vector Anomaly: Flight ${node.id} reporting abnormally low airspeed (${node.velocity.toFixed(0)} kts). Possible holding pattern, distress, or AIS ghost.`,
          lat:       node.lat,
          lon:       node.lon,
        });
      }
    }
  }

  // Sort: CRITICAL first, then WARNING; shuffle within same level for variety
  alerts.sort((a, b) => {
    if (a.level === b.level) return Math.random() - 0.5;
    return a.level === "CRITICAL" ? -1 : 1;
  });

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/intelligence — Unified True LLM + Fallback Heuristics
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        [
          {
            id:        randomUUID(),
            timestamp: new Date().toISOString(),
            level:     "WARNING" as const,
            message:   "Intelligence Engine: Received malformed telemetry payload. Expected an array.",
            lat:       0,
            lon:       0,
          },
        ],
        { status: 200 }
      );
    }

    const nodes = body as LiveNode[];
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are Vector-7, a military logistics and geospatial threat intelligence AI. Analyze this JSON array of global flights/ships:
Nodes data: ${JSON.stringify(nodes.slice(0, 100))}

Detect any anomalies such as chokepoints (velocity < 2 kts), excessive maritime speeds, transponder outages, anomalous air speeds, or flight vector issues.
Return a JSON array of up to 3 threat alerts matching this schema, with no markdown wrapping and no backticks:
[
  {
    "level": "CRITICAL" | "WARNING",
    "message": "Dynamic natural-language alert reporting ship/flight ID, location, speed and high-fidelity intelligence context",
    "lat": number,
    "lon": number
  }
]`
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const rawAlerts: Array<{ level: "CRITICAL" | "WARNING"; message: string; lat: number; lon: number }> = JSON.parse(text);

          if (Array.isArray(rawAlerts) && rawAlerts.length > 0) {
            const mappedAlerts: ThreatAlert[] = rawAlerts.map(a => ({
              id: randomUUID(),
              timestamp: new Date().toISOString(),
              level: a.level === "CRITICAL" ? "CRITICAL" : "WARNING",
              message: `AI_INTEL: ${a.message}`,
              lat: Number(a.lat) || 0,
              lon: Number(a.lon) || 0
            }));
            return NextResponse.json(mappedAlerts);
          }
        }
      } catch (llmErr) {
        console.warn("[Vector7 Intelligence] Gemini threat scanner failed — falling back to heuristics:", llmErr);
      }
    }

    // Heuristics Fallback
    const allAlerts = evaluateTelemetryHeuristics(nodes);
    const topAlerts = allAlerts.slice(0, 3);

    if (topAlerts.length === 0) {
      topAlerts.push({
        id:        randomUUID(),
        timestamp: new Date().toISOString(),
        level:     "WARNING",
        message:   `Intelligence Stream nominal. Scanned ${nodes.length} transponders — no critical anomalies detected in this cycle.`,
        lat:       0,
        lon:       0,
      });
    }

    return NextResponse.json(topAlerts);

  } catch (err) {
    console.error("[Vector7 Intelligence] Engine fault:", err);
    return NextResponse.json([
      {
        id:        randomUUID(),
        timestamp: new Date().toISOString(),
        level:     "WARNING" as const,
        message:   "Intelligence Engine encountered an internal evaluation fault. Fallback mode active. Manual review recommended.",
        lat:       0,
        lon:       0,
      },
    ]);
  }
}
