import { NextRequest, NextResponse } from "next/server";

interface LiveNode {
  id: string;
  lat: number;
  lon: number;
  velocity: number;
  category: "plane" | "ship";
}

interface GlobeTarget {
  lat: number;
  lon: number;
  altitude: number;
}

interface NlpResponse {
  success: boolean;
  message: string;
  action: "FLY_AND_FILTER" | "FILTER_ONLY" | "NO_ACTION";
  domain?: "dark-fleet" | "strategic-hoarding" | "india-freight";
  target?: GlobeTarget;
  filteredNodes: LiveNode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Heuristic NLP Router — deterministic parser
// ─────────────────────────────────────────────────────────────────────────────
function parseQueryHeuristic(query: string, nodes: LiveNode[]): NlpResponse {
  const q = query.toLowerCase().trim();

  // ── Rule 1 (Location & Chokepoint Extraction):
  let target = { lat: 20.0, lon: 0.0, altitude: 1.8 }; // Default global view
  let locationLabel = "Global";

  if (q.includes("hormuz") || q.includes("middle east") || q.includes("iran")) {
    target = { lat: 26.56, lon: 56.25, altitude: 0.6 }; // Zoomed closely into the Strait of Hormuz
    locationLabel = "Strait of Hormuz";
  }
  else if (q.includes("malacca") || q.includes("singapore")) {
    target = { lat: 2.5, lon: 101.5, altitude: 0.6 }; // Strait of Malacca
    locationLabel = "Strait of Malacca";
  }
  else if (q.includes("suez") || q.includes("egypt")) {
    target = { lat: 29.92, lon: 32.55, altitude: 0.6 }; // Suez Canal
    locationLabel = "Suez Canal";
  }
  else if (q.includes("panama")) {
    target = { lat: 9.14, lon: -79.73, altitude: 0.6 }; // Panama Canal
    locationLabel = "Panama Canal";
  }
  else if (q.includes("europe")) {
    target = { lat: 48.0, lon: 10.0, altitude: 1.2 };
    locationLabel = "European sector";
  }
  else if (q.includes("indian ocean") || q.includes("india")) {
    target = { lat: 15.0, lon: 75.0, altitude: 1.2 };
    locationLabel = "Indian Ocean sector";
  }

  // ── Rule 2: Domain / Category Extraction ─────────────────────────────────
  let filteredNodes: LiveNode[] = nodes;
  let domainLabel = "all transponders";
  let domain: NlpResponse["domain"] | undefined;
  let action: NlpResponse["action"] = target ? "FLY_AND_FILTER" : "FILTER_ONLY";

  const isMaritime = q.includes("tanker") || q.includes("ship") || q.includes("vessel")
    || q.includes("fleet") || q.includes("maritime") || q.includes("sea") || q.includes("dark fleet");

  const isAviation = q.includes("flight") || q.includes("plane") || q.includes("aircraft")
    || q.includes("air") || q.includes("jet") || q.includes("fly");

  const isAnomaly = q.includes("anomaly") || q.includes("delayed") || q.includes("idle")
    || q.includes("stopped") || q.includes("chokepoint") || q.includes("stationary") || q.includes("suspicious");

  if (isAnomaly) {
    filteredNodes = nodes.filter(n =>
      (n.category === "ship" && n.velocity < 5) ||
      (n.category === "plane" && n.velocity < 80 && n.velocity > 0)
    );
    domainLabel = "anomalous slow-moving vectors";
    domain = "dark-fleet";
  } else if (isMaritime && !isAviation) {
    filteredNodes = nodes.filter(n => n.category === "ship");
    domainLabel = "maritime surface vessels";
    domain = "dark-fleet";
  } else if (isAviation && !isMaritime) {
    filteredNodes = nodes.filter(n => n.category === "plane");
    domainLabel = "aviation transponders";
    domain = "india-freight";
  } else if (isMaritime && isAviation) {
    filteredNodes = nodes;
    domainLabel = "all active transponders";
  }

  // ── Rule 3: Location-based secondary filter if we have a region ───────────
  if (target && target.lat !== 20.0) {
    const latRange = 30;
    const lonRange = 40;
    const regionalNodes = filteredNodes.filter(n =>
      Math.abs(n.lat - target.lat) < latRange &&
      Math.abs(n.lon - target.lon) < lonRange
    );
    if (regionalNodes.length > 0) {
      filteredNodes = regionalNodes;
    }
  }

  const topNodes = filteredNodes.slice(0, 20);

  return {
    success: true,
    message: `INTEL_ENGINE: Tracking ${topNodes.length} ${domainLabel} in ${locationLabel}. Globe camera repositioning...`,
    action,
    domain,
    target,
    filteredNodes: topNodes.length > 0 ? topNodes : nodes.slice(0, 20),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nlp — Unified True LLM + Fallback Heuristics
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = typeof body.query === "string" ? body.query : "";
    const nodes: LiveNode[] = Array.isArray(body.nodes) ? body.nodes : [];

    if (!query.trim()) {
      return NextResponse.json({
        success: false,
        message: "INTEL_ENGINE: Empty query received. Please enter a tactical command.",
        action: "NO_ACTION",
        filteredNodes: [],
      });
    }

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
                  text: `You are Vector-7, a military logistics AI. Analyze the user query and the provided JSON array of global flights/ships.
User query: "${query}"
Nodes data: ${JSON.stringify(nodes.slice(0, 100))}

Return ONLY a JSON object matching this schema, with no markdown wrapping and no backticks:
{
  "target": { "lat": number, "lon": number, "altitude": number },
  "filteredIds": string[],
  "ai_message": string
}`
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
          const llmResult = JSON.parse(text);

          const filteredNodes = nodes.filter(n => llmResult.filteredIds?.includes(n.id));
          const domain = query.toLowerCase().includes("flight") || query.toLowerCase().includes("plane") ? "india-freight" : "dark-fleet";

          return NextResponse.json({
            success: true,
            message: `INTEL_ENGINE (LLM): ${llmResult.ai_message || "Analysis complete."}`,
            action: "FLY_AND_FILTER",
            domain,
            target: llmResult.target || { lat: 20.0, lon: 0.0, altitude: 1.8 },
            filteredNodes: filteredNodes.length > 0 ? filteredNodes.slice(0, 20) : nodes.slice(0, 20),
          });
        }
      } catch (llmErr) {
        console.warn("[Vector7 NLP] Gemini API call failed — falling back to heuristics:", llmErr);
      }
    }

    // Fallback deterministic heuristics if LLM is unavailable
    const result = parseQueryHeuristic(query, nodes);
    return NextResponse.json(result);

  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "INTEL_ENGINE: NLP router failed. Manual override required.",
      action: "NO_ACTION",
      filteredNodes: [],
    }, { status: 200 });
  }
}
