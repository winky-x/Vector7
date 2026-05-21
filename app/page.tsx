"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import TopologyGraph from "@/components/TopologyGraph";
import {
  Radar,
  Crosshair,
  Activity,
  Shield,
  Ship,
  Plane,
  Truck,
  AlertTriangle,
  Search,
  Terminal,
  Layers,
  Globe as GlobeIcon,
  Settings,
  RefreshCw,
  Wifi,
  Bell,
  Network,
  X,
  Lock,
  Database,
  Radio,
  ExternalLink,
  ChevronRight
} from "lucide-react";

// Dynamically import react-globe.gl to completely bypass SSR hydration issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// Types definition
interface Entity {
  id: string;
  name: string;
  type: "ship" | "plane" | "truck" | "facility";
  code: string;
  status: "active" | "warning" | "critical";
  statusText: string;
  lat: number | string;
  lon: number | string;
  info: string;
  speed?: string;
  heading?: string;
  cargo?: string;
  weight?: number;
  velocity?: number;
}

interface Alert {
  id: string;
  timestamp: string;
  level: "critical" | "warning" | "info";
  levelText: string;
  message: string;
  nodeId?: string;
  lat?: number | string;
  lon?: number | string;
}

export default function Home() {
  // Domain selection state
  const [activeDomain, setActiveDomain] = useState<string>("dark-fleet");

  // Search/Command state
  const [query, setQuery] = useState<string>("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "SYS_INIT: Decrypting tactical satcom transceivers...",
    "SECURE_UPLINK: Est. TLS 1.3 link to GEO-SAT-09 [SUCCESS]",
    "INTEL_ENGINE: AI threat model matching running in background...",
    "VECTOR_SYS: 3D Hexagonal Paradigm grid active. Rendering density pillars.",
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // NLP filter override — set by the command bar, cleared on domain switch
  const [nlpFilteredNodes, setNlpFilteredNodes] = useState<Array<{ id: string; lat: number; lon: number; velocity: number; category: 'plane' | 'ship' }> | null>(null);

  // Palantir Knowledge Graph Modal show/hide state
  const [showTopology, setShowTopology] = useState<boolean>(false);

  // ── Unified Live Telemetry ──────────────────────────────────────────────
  const [liveNodes, setLiveNodes] = useState<Array<{ id: string; lat: number; lon: number; velocity: number; category: 'plane' | 'ship' }>>([]);
  const [isFetchingTelemetry, setIsFetchingTelemetry] = useState<boolean>(false);

  // Derived views for backwards-compat with the left panel & globe HTML pins
  const aviationNodes: Entity[] = liveNodes
    .filter(n => n.category === 'plane')
    .map(n => ({
      id: n.id,
      name: n.id,
      type: 'plane' as const,
      code: `VEL:${n.velocity.toFixed(0)} kts`,
      status: 'active' as const,
      statusText: 'EN ROUTE',
      lat: n.lat,
      lon: n.lon,
      info: `Live aviation transponder. Velocity: ${n.velocity.toFixed(0)} kts.`,
      speed: `${n.velocity.toFixed(0)} kts`,
      heading: '---',
      weight: n.velocity,
    }));

  const maritimeNodes: Entity[] = liveNodes
    .filter(n => n.category === 'ship')
    .map(n => ({
      id: n.id,
      name: n.id,
      type: 'ship' as const,
      code: `VEL:${n.velocity.toFixed(1)} kts`,
      status: n.velocity < 2 ? 'critical' as const : 'active' as const,
      statusText: n.velocity < 2 ? 'CHOKEPOINT' : 'DRIFTING',
      lat: n.lat,
      lon: n.lon,
      info: `Ghost Protocol tanker. Velocity: ${n.velocity.toFixed(1)} kts. Indian Ocean surveillance active.`,
      speed: `${n.velocity.toFixed(1)} kts`,
      heading: '---',
      weight: n.velocity,
    }));

  // Active target node selection state
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Cursor coordinates tracking
  const [cursorPos, setCursorPos] = useState({ lat: "22.1834° N", lon: "72.4912° E" });

  // Node graph modal display
  const [isGraphOpen, setIsGraphOpen] = useState<boolean>(false);
  const [graphNodeId, setGraphNodeId] = useState<string>("");

  // Trigger Node Graph Modal
  const openNodeGraph = (nodeId: string) => {
    setGraphNodeId(nodeId);
    setIsGraphOpen(true);
    setConsoleLogs(prev => [
      ...prev,
      `SECURE_GRAPH: Extracting visual link topology for ${nodeId}...`,
      `SECURE_GRAPH: Compiled relational links [ESTABLISHED]`
    ]);
  };

  // ── AI Signal Feed (seeded, replaced by live intel polling) ──────────────
  const [signalFeed, setSignalFeed] = useState<Alert[]>([
    {
      id: "boot-001",
      timestamp: new Date().toISOString().substring(11, 19) + "Z",
      level: "info",
      levelText: "[BOOT]",
      message: "[BOOT] Vector 7 Intelligence Engine initializing. Awaiting first telemetry uplink...",
      nodeId: "SYSTEM",
      lat: 0,
      lon: 0
    }
  ]);

  // Phase 3: Dynamic Anomaly Tracking Sweep ("God-Mode" Click)
  const handleTrackAlertNode = (nodeId?: string, lat?: number | string, lon?: number | string) => {
    if (!nodeId) return;
    
    // Find matched node in our lists
    const matched = [...aviationNodes, ...maritimeNodes, ...staticSiloNodes].find(
      e => e.id === nodeId || e.name === nodeId
    );
    
    if (matched) {
      setSelectedEntity(matched);
      const parsedLat = parseCoordinate(matched.lat);
      const parsedLon = parseCoordinate(matched.lon);
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: parsedLat, lng: parsedLon, altitude: 0.8 }, 1500);
      }
      setConsoleLogs(prev => [
        ...prev,
        `TACTICAL_UPLINK: God-Mode operator tracked dynamic anomaly: ${matched.name} [PROJECTING LAT/LON]`
      ]);
    } else if (lat && lon) {
      const parsedLat = parseCoordinate(lat);
      const parsedLon = parseCoordinate(lon);
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: parsedLat, lng: parsedLon, altitude: 0.8 }, 1500);
      }
      setConsoleLogs(prev => [
        ...prev,
        `TACTICAL_UPLINK: Direct visual coordinate lock over alert region: ${parsedLat}° N, ${parsedLon}° E`
      ]);
    }
  };

  // ── Unified Telemetry Polling: /api/telemetry every 10 s ─────────────────
  const fetchTelemetryLive = async () => {
    setIsFetchingTelemetry(true);
    try {
      const res = await fetch("/api/telemetry", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLiveNodes(data);
        setConsoleLogs(prev => [
          ...prev,
          `SAT_POLL: Unified telemetry uplink OK — ${data.filter((n: any) => n.category === 'plane').length} air vectors + ${data.filter((n: any) => n.category === 'ship').length} sea vectors received.`
        ]);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, "SAT_POLL_ERROR: Unified telemetry downlink timeout. Retrying next cycle..."]);
    } finally {
      setIsFetchingTelemetry(false);
    }
  };

  // ── AI Signal Feed Polling: POST liveNodes → /api/intelligence every 15 s ─
  useEffect(() => {
    if (liveNodes.length === 0) return;

    const fetchIntelligence = async () => {
      try {
        const res = await fetch("/api/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(liveNodes),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rawAlerts: Array<{ id: string; timestamp: string; level: "CRITICAL" | "WARNING"; message: string; lat: number; lon: number }> = await res.json();

        const mapped: Alert[] = rawAlerts.map(a => ({
          id:        a.id,
          timestamp: a.timestamp.substring(11, 19) + "Z",
          level:     a.level === "CRITICAL" ? "critical" as const : "warning" as const,
          levelText: a.level === "CRITICAL" ? "[CRITICAL]" : "[WARNING]",
          message:   a.message,
          nodeId:    a.id,
          lat:       a.lat,
          lon:       a.lon,
        }));

        setSignalFeed(prev => {
          const combined = [...mapped, ...prev];
          const seen = new Set<string>();
          return combined.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }).slice(0, 5);
        });

        setConsoleLogs(prev => [
          ...prev,
          `INTEL_ENGINE: ${rawAlerts.length} threat signal(s) decoded — top alert: ${rawAlerts[0]?.level ?? "NOMINAL"}`
        ]);
      } catch (err) {
        setConsoleLogs(prev => [...prev, "INTEL_ENGINE: Signal feed offline. Retry scheduled."]);
      }
    };

    const intelInterval = setInterval(fetchIntelligence, 15000);
    return () => clearInterval(intelInterval);
  }, [liveNodes]);

  // System statistics states (live updates)
  const [uplinkLatency, setUplinkLatency] = useState<number>(42);
  const [sysSync, setSysSync] = useState<number>(99.92);

  // GeoJSON World Countries outlines for 3D extrusion
  const [countries, setCountries] = useState<any>({ features: [] });

  // WebGL Globe Refs and Dimensions
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Reference for console scroll
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Static facilities for Strategic Hoarding domain (since repositories don't drift)
  const staticSiloNodes: Entity[] = [
    {
      id: "facility-silo-zh",
      name: "SILO-ZH-09",
      type: "facility",
      code: "LOC:ZHUHAI",
      status: "warning",
      statusText: "ACCUMULATING",
      lat: 22.2707,
      lon: 113.5678,
      info: "Sino-Grain Strategic Grain Reserves. Rapid accumulation detected.",
      cargo: "Wheat Reserves (88% capacity)"
    },
    {
      id: "facility-depot-ru",
      name: "DEPOT-RU-42",
      type: "facility",
      code: "LOC:MURMANSK",
      status: "critical",
      statusText: "MAXIMUM FILL",
      lat: 68.9585,
      lon: 33.0827,
      info: "Northern Fleet Rare Earth Reserves. High threat stockpiling.",
      cargo: "Neodymium / Dysprosium (98% capacity)"
    },
    {
      id: "facility-store-us",
      name: "STORE-US-01",
      type: "facility",
      code: "LOC:SAVANNAH",
      status: "active",
      statusText: "NOMINAL",
      lat: 32.0762,
      lon: -81.0912,
      info: "US East Coast Federal Critical Tech Hub.",
      cargo: "Lithium-Ion Cells / AI Accelerator Arrays"
    }
  ];

  // Helper parser for degrees coordinate strings to raw numbers
  const parseCoordinate = (coord: any): number => {
    if (typeof coord === "number") return coord;
    if (typeof coord === "string") {
      const match = coord.match(/-?[\d\.]+/);
      if (match) {
        return parseFloat(match[0]);
      }
    }
    return 0;
  };

  // Alias so existing click handlers (navbar refresh button) still work
  const fetchTelemetry = fetchTelemetryLive;

  // Filter current nodes to render on Left Panel based on strategic domain
  const getFilteredNodes = () => {
    if (activeDomain === "dark-fleet") {
      return maritimeNodes;
    } else if (activeDomain === "strategic-hoarding") {
      return staticSiloNodes;
    } else if (activeDomain === "india-freight") {
      const mockTruck: Entity = {
        id: "vessel-convoy-in",
        name: "CONVOY-IN-04",
        type: "truck" as const,
        code: "FASTAG:TRK99",
        status: "critical" as const,
        statusText: "CHOKEPOINT",
        lat: 22.3512,
        lon: 88.3698,
        info: "Strategic Materials Convoy stalled at domestic customs gate.",
        speed: "0.0 kts",
        heading: "000°",
        cargo: "Enriched Ore Concentrate"
      };
      const regionalAir = aviationNodes.filter(p => {
        const lat = parseCoordinate(p.lat);
        const lon = parseCoordinate(p.lon);
        return lat >= 0 && lat <= 40 && lon >= 60 && lon <= 100;
      });
      return [...regionalAir, mockTruck];
    }
    return [];
  };

  const currentEntities = getFilteredNodes();

  // Load World GeoJSON outlines and manage resizing
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        setConsoleLogs(prev => [...prev, "GEOJSON: World boundaries loaded successfully."]);
      })
      .catch(() => {
        setConsoleLogs(prev => [...prev, "GEOJSON_ERR: Fallback wireframe outlines active."]);
      });

    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener("resize", handleResize);

    fetchTelemetryLive();
    const telemetryInterval = setInterval(fetchTelemetryLive, 10000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(telemetryInterval);
    };
  }, []);

  // Effect to scroll console logs to the bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Telemetry Sync with selected entity camera swept
  useEffect(() => {
    if (selectedEntity && globeRef.current) {
      const lat = parseCoordinate(selectedEntity.lat);
      const lon = parseCoordinate(selectedEntity.lon);

      globeRef.current.pointOfView({
        lat,
        lng: lon,
        altitude: 0.8
      }, 1500);
    }
  }, [selectedEntity]);

  // System Sync Telemetry Fluctuation loops
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setUplinkLatency(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        return next > 80 || next < 15 ? 42 : next;
      });

      setSysSync(prev => {
        const delta = (Math.random() * 0.04) - 0.02;
        const next = Number((prev + delta).toFixed(2));
        return next > 100 || next < 99.7 ? 99.92 : next;
      });
    }, 4000);

    return () => clearInterval(statusInterval);
  }, []);

  // Update selected entity telemetry dynamically when live nodes refresh
  useEffect(() => {
    if (selectedEntity) {
      const matched = [...aviationNodes, ...maritimeNodes, ...staticSiloNodes].find(
        e => e.id === selectedEntity.id
      );
      if (matched) {
        const hasChanged =
          matched.lat !== selectedEntity.lat ||
          matched.lon !== selectedEntity.lon ||
          matched.status !== selectedEntity.status ||
          matched.speed !== selectedEntity.speed ||
          matched.statusText !== selectedEntity.statusText;
        if (hasChanged) setSelectedEntity(matched);
      }
    }
  }, [liveNodes]);

  // Auto-select first entity on domain switch or when lists load
  useEffect(() => {
    const filtered = getFilteredNodes();
    if (filtered.length > 0 && !selectedEntity) {
      setSelectedEntity(filtered[0]);
    }
  }, [activeDomain, aviationNodes, maritimeNodes]);

  // Handle Natural Language query submit — powered by /api/nlp
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAnalyzing) return;

    const currentQuery = query;
    setQuery("");
    setIsAnalyzing(true);
    setConsoleLogs(prev => [
      ...prev,
      `USER_CMD: "${currentQuery}"`,
      `INTEL_ENGINE: Routing natural language command to NLP parser...`,
    ]);

    try {
      const res = await fetch("/api/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: currentQuery, nodes: liveNodes }),
      });

      if (!res.ok) throw new Error(`NLP HTTP ${res.status}`);
      const result = await res.json();

      // Print the AI's response message to console
      setConsoleLogs(prev => [...prev, result.message]);

      if (result.success && result.action !== "NO_ACTION") {
        // 1. Fly the globe camera to the extracted target region
        if (result.target && globeRef.current) {
          globeRef.current.pointOfView(
            { lat: result.target.lat, lng: result.target.lon, altitude: result.target.altitude },
            2000
          );
        }

        // 2. Switch domain if NLP detected one
        if (result.domain) {
          setActiveDomain(result.domain);
        }

        // 3. Override the left panel with filtered nodes
        if (Array.isArray(result.filteredNodes) && result.filteredNodes.length > 0) {
          setNlpFilteredNodes(result.filteredNodes);
          // Auto-select first result and sweep camera to it
          const firstMatch = result.filteredNodes[0];
          const mapped: Entity = {
            id: firstMatch.id,
            name: firstMatch.id,
            type: firstMatch.category === 'ship' ? 'ship' : 'plane',
            code: `VEL:${firstMatch.velocity.toFixed(0)} kts`,
            status: firstMatch.velocity < 2 ? 'critical' : 'active',
            statusText: firstMatch.category === 'ship' ? 'TRACKED' : 'EN ROUTE',
            lat: firstMatch.lat,
            lon: firstMatch.lon,
            info: `NLP-targeted asset. Query: "${currentQuery}". Velocity: ${firstMatch.velocity.toFixed(0)} kts.`,
            speed: `${firstMatch.velocity.toFixed(0)} kts`,
            velocity: firstMatch.velocity,
          };
          setSelectedEntity(mapped);
        } else {
          setNlpFilteredNodes(null);
        }
      } else {
        setNlpFilteredNodes(null);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, "INTEL_ENGINE: NLP uplink timeout. Manual domain selection active."]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreloadQuery = (sampleText: string) => {
    setQuery(sampleText);
  };

  // Only render the HTML label for the currently selected/clicked entity
  const targetedNodeData = selectedEntity ? [selectedEntity] : [];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090b10] text-slate-100 overflow-hidden font-sans select-none border border-[#1f2937]/50 select-none">
      
      {/* Top Navbar */}
      <nav className="h-[60px] border-b border-[#1f2937] flex items-center justify-between px-6 bg-[#0c0f17] shrink-0">
        
        {/* Left Logo */}
        <div className="flex items-center space-x-3 w-[280px]">
          <div className="relative flex items-center justify-center h-8 w-8 border border-emerald-500/80 bg-emerald-500/10 shrink-0">
            <Radar className="h-5 w-5 text-emerald-500 animate-pulse" />
            <div className="absolute inset-0 border border-emerald-500/20 animate-ping rounded-none"></div>
          </div>
          <div>
            <span className="font-bold tracking-widest text-lg text-white">VECTOR <span className="text-emerald-500 font-mono">7</span></span>
            <div className="text-[9px] text-slate-500 tracking-wider font-mono">INTEL_PLATFORM_V4.92</div>
          </div>
        </div>

        {/* Center: Command Interface */}
        <div className="flex-1 max-w-xl mx-4 relative">
          <form onSubmit={handleQuerySubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query: e.g., Show delayed tankers in Indian Ocean..."
              className="w-full bg-[#05060a] border border-[#1f2937] text-slate-200 placeholder-slate-600 pl-10 pr-24 py-1.5 text-sm rounded-sm font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              disabled={isAnalyzing}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {isAnalyzing ? (
                <div className="flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/20 rounded-sm">
                  <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                  <span>ANALYZING...</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="bg-[#11141d] hover:bg-[#1b202d] text-slate-400 border border-[#1f2937] hover:border-slate-600 px-2 py-0.5 text-[10px] font-mono rounded-sm transition-all"
                >
                  EXECUTE
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Telemetry / Status */}
        <div className="flex items-center space-x-6 w-[330px] justify-end">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 tracking-wider font-mono">SYS_SYNC STATUS</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold text-white tracking-widest">{sysSync}%</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 glow-emerald animate-pulse"></span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1f2937]"></div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 tracking-wider font-mono">SECURE UPLINK</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold text-emerald-400 tracking-widest">{uplinkLatency}ms</span>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>

          <div className="h-6 w-px bg-[#1f2937]"></div>

          <div className="flex items-center space-x-2 text-slate-400">
            <div className="flex items-center justify-center h-7 w-7 border border-[#1f2937] bg-[#11141d] hover:bg-[#1b202d] rounded-sm cursor-pointer hover:text-white transition-all">
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div 
              onClick={fetchTelemetry}
              className={`flex items-center justify-center h-7 w-7 border border-[#1f2937] bg-[#11141d] hover:bg-[#1b202d] rounded-sm cursor-pointer hover:text-white transition-all ${isFetchingTelemetry ? "text-emerald-400" : ""}`}
              title="Force Telemetry Sync"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingTelemetry ? "animate-spin" : ""}`} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 h-[calc(100vh-60px)] w-full overflow-hidden">
        
        {/* Left Panel: Domain Control & Active Nodes */}
        <aside className="w-[300px] border-r border-[#1f2937] bg-[#11141d] flex flex-col h-full shrink-0 overflow-hidden">
          
          {/* Section: Strategic Domains */}
          <div className="p-4 border-b border-[#1f2937]/80 shrink-0">
            <div className="flex items-center space-x-2 mb-3">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold tracking-widest text-slate-500">STRATEGIC DOMAINS</span>
            </div>
            <div className="flex flex-col space-y-1.5">
              <button
                onClick={() => {
                  setActiveDomain("dark-fleet");
                  setSelectedEntity(null);
                  setNlpFilteredNodes(null);
                  setConsoleLogs(prev => [...prev, "VECTOR_SYS: Switching focus to DARK FLEET domain."]);
                }}
                className={`w-full text-left py-2 px-3 text-xs font-mono tracking-wider flex items-center justify-between border transition-all ${
                  activeDomain === "dark-fleet"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-semibold"
                    : "bg-[#090b10] border-[#1f2937] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                } rounded-none`}
              >
                <span>1. DARK FLEET MONITOR</span>
                <ChevronRight className={`h-3 w-3 transition-transform ${activeDomain === "dark-fleet" ? "rotate-90 text-emerald-400" : "text-slate-600"}`} />
              </button>

              <button
                onClick={() => {
                  setActiveDomain("strategic-hoarding");
                  setSelectedEntity(null);
                  setNlpFilteredNodes(null);
                  setConsoleLogs(prev => [...prev, "VECTOR_SYS: Switching focus to STRATEGIC HOARDING domain."]);
                }}
                className={`w-full text-left py-2 px-3 text-xs font-mono tracking-wider flex items-center justify-between border transition-all ${
                  activeDomain === "strategic-hoarding"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-semibold"
                    : "bg-[#090b10] border-[#1f2937] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                } rounded-none`}
              >
                <span>2. STRATEGIC HOARDING</span>
                <ChevronRight className={`h-3 w-3 transition-transform ${activeDomain === "strategic-hoarding" ? "rotate-90 text-emerald-400" : "text-slate-600"}`} />
              </button>

              <button
                onClick={() => {
                  setActiveDomain("india-freight");
                  setSelectedEntity(null);
                  setNlpFilteredNodes(null);
                  setConsoleLogs(prev => [...prev, "VECTOR_SYS: Switching focus to INDIA FREIGHT CORRIDORS domain."]);
                }}
                className={`w-full text-left py-2 px-3 text-xs font-mono tracking-wider flex items-center justify-between border transition-all ${
                  activeDomain === "india-freight"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-semibold"
                    : "bg-[#090b10] border-[#1f2937] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                } rounded-none`}
              >
                <span>3. INDIA FREIGHT CORRIDORS</span>
                <ChevronRight className={`h-3 w-3 transition-transform ${activeDomain === "india-freight" ? "rotate-90 text-emerald-400" : "text-slate-600"}`} />
              </button>
            </div>
          </div>

          {/* Section: Active Tracking Nodes */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-semibold tracking-widest text-slate-500">
                  {nlpFilteredNodes ? "NLP QUERY RESULTS" : "ACTIVE TRACKING NODES"}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">COUNT: {nlpFilteredNodes ? nlpFilteredNodes.length : currentEntities.length}</span>
            </div>

            {/* NLP badge — shown when results are from a query */}
            {nlpFilteredNodes && (
              <div className="flex items-center justify-between mb-2 shrink-0 bg-emerald-500/5 border border-emerald-500/20 px-2 py-1 rounded-sm">
                <span className="text-[9px] font-mono text-emerald-400 tracking-widest">NLP FILTER ACTIVE</span>
                <button
                  onClick={() => { setNlpFilteredNodes(null); setSelectedEntity(null); }}
                  className="text-[9px] font-mono text-slate-500 hover:text-white transition-colors"
                >CLEAR ✕</button>
              </div>
            )}

            <div className="space-y-2 flex-1">
              {(nlpFilteredNodes
                ? nlpFilteredNodes.map(n => ({
                    id: n.id, name: n.id,
                    type: (n.category === 'ship' ? 'ship' : 'plane') as Entity['type'],
                    code: `VEL:${n.velocity.toFixed(0)} kts`,
                    status: (n.velocity < 2 ? 'critical' : 'active') as Entity['status'],
                    statusText: n.category === 'ship' ? (n.velocity < 2 ? 'CHOKEPOINT' : 'DRIFTING') : 'EN ROUTE',
                    lat: n.lat, lon: n.lon,
                    info: `NLP-matched asset. Velocity: ${n.velocity.toFixed(0)} kts.`,
                    speed: `${n.velocity.toFixed(0)} kts`,
                    heading: '---',
                    cargo: undefined,
                    velocity: n.velocity,
                  } as Entity))
                : currentEntities
              ).slice(0, 15).map((entity) => {
                const isSelected = selectedEntity?.id === entity.id;
                
                let statusBadge = "bg-emerald-500 text-emerald-950";
                if (entity.status === "warning") {
                  statusBadge = "bg-amber-500 text-amber-950";
                } else if (entity.status === "critical") {
                  statusBadge = "bg-red-500 text-red-950";
                }

                const borderClass = isSelected 
                  ? "border-emerald-500 shadow-md shadow-emerald-500/5 bg-emerald-950/5" 
                  : "border-[#1f2937]/80 hover:border-slate-700 bg-[#0c0f17]/90";

                return (
                  <div
                    key={entity.id}
                    onClick={() => {
                      setSelectedEntity(entity);
                      setConsoleLogs(prev => [
                        ...prev,
                        `VECTOR_SYS: Focusing 3D Globe camera onto ${entity.name}.`
                      ]);
                    }}
                    className={`border p-3 cursor-pointer transition-all duration-200 flex flex-col space-y-2 rounded-sm ${borderClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {entity.type === "ship" && <Ship className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        {entity.type === "plane" && <Plane className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        {entity.type === "truck" && <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        {entity.type === "facility" && <Database className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        <span className="font-bold text-xs text-white font-mono tracking-wider">{entity.name}</span>
                      </div>
                      <span className={`font-mono text-[9px] px-1 py-0.5 rounded-none font-bold tracking-widest ${statusBadge}`}>
                        {entity.statusText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{entity.code}</span>
                      <span className="text-slate-400 font-bold">
                        {typeof entity.lat === "number" ? `${entity.lat.toFixed(2)}°N` : entity.lat}, {typeof entity.lon === "number" ? `${entity.lon.toFixed(2)}°E` : entity.lon}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="pt-2 mt-2 border-t border-[#1f2937] text-xs text-slate-400 space-y-1 bg-black/20 p-2 rounded-sm">
                        <p className="text-[11px] leading-relaxed text-slate-300">{entity.info}</p>
                        {entity.speed && (
                          <div className="flex justify-between font-mono text-[10px] pt-1 text-slate-500">
                            <span>VELOCITY: <span className="text-white">{entity.speed}</span></span>
                            <span>HDG: <span className="text-white">{entity.heading}</span></span>
                          </div>
                        )}
                        {entity.cargo && (
                          <div className="font-mono text-[10px] pt-1 text-slate-500">
                            <span className="block truncate">CARGO: <span className="text-emerald-400">{entity.cargo}</span></span>
                          </div>
                        )}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntity(entity);
                              setShowTopology(true);
                              setConsoleLogs(prev => [
                                ...prev,
                                `VECTOR_SYS: Visualising high-fidelity Relational Knowledge Graph for ${entity.name}.`
                              ]);
                            }}
                            className="text-[9px] font-mono text-emerald-400 hover:text-white flex items-center space-x-1 uppercase mt-1 border border-emerald-500/20 px-1 py-0.5 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-sm"
                          >
                            <Network className="h-2.5 w-2.5" />
                            <span>Link Topology</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Query presets to assist the AI/UX */}
            <div className="mt-4 pt-4 border-t border-[#1f2937] shrink-0">
              <span className="text-[9px] font-mono text-slate-500 block mb-2 tracking-wider">Tactical Query Presets</span>
              <div className="flex flex-col space-y-1 text-[10px] font-mono">
                <button
                  onClick={() => handlePreloadQuery("Show tankers in Indian Ocean")}
                  className="w-full text-left truncate text-slate-400 hover:text-emerald-400 bg-[#090b10] border border-[#1f2937] p-1.5 transition-all text-[9px]"
                >
                  &gt; Track suspected Dark Fleet AIS blackout
                </button>
                <button
                  onClick={() => handlePreloadQuery("Analyze Grain Reserves stockpile")}
                  className="w-full text-left truncate text-slate-400 hover:text-emerald-400 bg-[#090b10] border border-[#1f2937] p-1.5 transition-all text-[9px]"
                >
                  &gt; Inspect Strategic Hoarding levels
                </button>
                <button
                  onClick={() => handlePreloadQuery("Show chokepoints India Freight Convoy")}
                  className="w-full text-left truncate text-slate-400 hover:text-emerald-400 bg-[#090b10] border border-[#1f2937] p-1.5 transition-all text-[9px]"
                >
                  &gt; Map India Freight Convoy-IN-04 anomaly
                </button>
              </div>
            </div>

          </div>
        </aside>

        {/* Center Viewport: Tactical 3D Globe Viewport */}
        <main className="flex-1 bg-[#090b10] flex flex-col h-full overflow-hidden relative">
          
          {/* WebGL 3D Globe Container */}
          <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center"
          >
            {/* Ambient Tech Grid Elements */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#090b10]/95 pointer-events-none z-10"></div>

            {/* Simulated Radar Compass Rose */}
            <div className="absolute bottom-6 left-6 flex flex-col text-[10px] font-mono text-slate-500 border border-[#1f2937] p-2 bg-[#0c0f17]/90 rounded-sm z-20">
              <span className="font-bold text-slate-400 flex items-center gap-1">
                <GlobeIcon className="h-3 w-3 text-slate-400 animate-spin-slow" /> GEOMETRIC RADIAL RANGE
              </span>
              <span className="text-[9px] text-slate-600">SYS_REF: WGS-84 3D WEBGL</span>
              <span className="text-emerald-500 font-semibold mt-1">ZOOM: INTERACTIVE 3D GLOBE</span>
            </div>

            {/* Real-time Cursor Pos */}
            <div className="absolute top-4 right-4 bg-[#0c0f17]/95 border border-[#1f2937] p-3 text-[11px] font-mono shadow-lg rounded-sm w-[240px] z-20">
              <div className="flex justify-between items-center text-slate-500 border-b border-[#1f2937] pb-1.5 mb-1.5">
                <span className="flex items-center gap-1"><Crosshair className="h-3 w-3 text-slate-400" /> CAMERA_FOCUS</span>
                <span className="text-emerald-500 font-bold">LIVE</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>TARGET LAT:</span>
                  <span className="text-white font-bold">{selectedEntity ? `${parseCoordinate(selectedEntity.lat).toFixed(4)}°` : "0.0000°"}</span>
                </div>
                <div className="flex justify-between">
                  <span>TARGET LON:</span>
                  <span className="text-white font-bold">{selectedEntity ? `${parseCoordinate(selectedEntity.lon).toFixed(4)}°` : "0.0000°"}</span>
                </div>
              </div>
            </div>

            {/* 3D WebGL Canvas Layer */}
            <div className="absolute inset-0">
              <Globe
                ref={globeRef}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundColor="rgba(0,0,0,0)"
                atmosphereColor="#4b7bec"
                atmosphereAltitude={0.15}
                
                // 1. The Glowing Country Borders
                polygonsData={countries.features}
                polygonCapColor={() => 'rgba(0, 0, 0, 0)'}
                polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
                polygonStrokeColor={() => '#00e5ff'} // Glowing cyan
                polygonAltitude={0.005}
                
                // 2. The Paradigm 3D Hex-Grid with exact overrides
                hexBinPointsData={aviationNodes}
                hexBinPointLat={(d: any) => parseCoordinate(d.lat)}
                hexBinPointLng={(d: any) => parseCoordinate(d.lon)}
                hexBinPointWeight="velocity"
                hexBinResolution={4}
                hexMargin={0.2}
                
                // FIX: The Mathematical Cap. Never allow altitude to exceed 0.12, no matter how high the sumWeight is.
                hexAltitude={(d: any) => Math.min((d.sumWeight || 1) * 0.00005, 0.12)}
                
                // FIX: Sleek Paradigm Coloring.
                hexTopColor={(d: any) => {
                  const height = Math.min((d.sumWeight || 1) * 0.00005, 0.12);
                  return height > 0.08 ? '#ff003c' : '#ffffff'; // High pillars are red, low pillars are white
                }}
                hexSideColor={(d: any) => {
                  const height = Math.min((d.sumWeight || 1) * 0.00005, 0.12);
                  return height > 0.08 ? 'rgba(255, 0, 60, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                }}
                
                // 4. Glassmorphic Targeting Pin
                htmlElementsData={targetedNodeData}
                htmlLat={(d: any) => parseCoordinate(d.lat)}
                htmlLng={(d: any) => parseCoordinate(d.lon)}
                htmlAltitude={0.15} // Float slightly above the hex pillars
                htmlElement={(d: any) => {
                  const el = document.createElement('div');
                  el.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none; transform: translate(-50%, -100%);">
                      <!-- The Floating Tag -->
                      <div style="
                        background: rgba(15, 23, 42, 0.75);
                        backdrop-filter: blur(4px);
                        border: 1px solid #00e5ff;
                        color: white;
                        padding: 4px 8px;
                        font-family: monospace;
                        font-size: 11px;
                        border-radius: 2px;
                        text-shadow: 0 0 4px rgba(0,229,255,0.5);
                        white-space: nowrap;
                      ">
                        [ TARGET: ${d.id || d.name} ]<br/>
                        <span style="color: #10b981;">VEL: ${d.velocity || d.speed || 0}</span>
                      </div>
                      <!-- The Vertical Laser Line -->
                      <div style="
                        width: 1px;
                        height: 30px;
                        background: linear-gradient(to bottom, #00e5ff, transparent);
                        margin: 2px 0;
                      "></div>
                      <!-- The Target Reticle/Dot -->
                      <div style="
                        width: 12px;
                        height: 12px;
                        background-color: #ff003c;
                        border: 2px solid white;
                        border-radius: 50%;
                        box-shadow: 0 0 10px #ff003c;
                      "></div>
                    </div>
                  `;
                  return el;
                }}
              />
            </div>

            {/* Overlay Title of Tactical Viewport */}
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-[#0c0f17]/90 border border-[#1f2937] p-2 text-xs font-mono rounded-sm select-none z-20">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold tracking-widest uppercase">TACTICAL 3D VIEWPORT // {activeDomain.replace("-", " ")}</span>
            </div>

          </div>

          {/* Bottom Console Log panel */}
          <div className="h-[180px] bg-[#0c0f17] border-t border-[#1f2937] flex flex-col shrink-0 overflow-hidden font-mono z-20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2937] bg-[#11141d]/90 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span>INTELLIGENCE STREAM CONSOLE</span>
              </div>
              <div className="flex items-center space-x-4 text-[10px] text-slate-500">
                <span>BUFFER: NOMINAL</span>
                <div className="flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ACTIVE DECRYPT</span>
                </div>
              </div>
            </div>

            {/* Log Stream Terminal */}
            <div className="flex-1 p-3 overflow-y-auto space-y-1.5 bg-[#050609] text-[11px] text-slate-400 leading-normal scrollbar-thin">
              {consoleLogs.map((log, index) => {
                let colorClass = "text-slate-400";
                if (log.includes("USER_CMD:")) colorClass = "text-white font-bold";
                else if (log.includes("SUCCESS") || log.includes("ESTABLISHED") || log.includes("SAT_POLL")) colorClass = "text-emerald-400";
                else if (log.includes("warning") || log.includes("priority")) colorClass = "text-amber-400";
                else if (log.includes("lost") || log.includes("blackout") || log.includes("critical")) colorClass = "text-red-400";

                return (
                  <div key={index} className={`flex items-start space-x-1.5 ${colorClass}`}>
                    <span className="text-slate-600 select-none">&gt;&gt;</span>
                    <span>{log}</span>
                  </div>
                );
              })}
              {isAnalyzing && (
                <div className="flex items-center space-x-2 text-emerald-400 animate-pulse">
                  <span className="text-slate-600">&gt;&gt;</span>
                  <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                  <span>DECRYPTING CLASSIFIED LIVE TELEMETRY FROM SATELLITE ARRAYS...</span>
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </main>

        {/* Right Panel: AI Signal Feed (Signal Intelligence) */}
        <aside className="w-[350px] border-l border-[#1f2937] bg-[#11141d] flex flex-col h-full shrink-0 overflow-hidden">
          
          {/* Header Title with Scan effect */}
          <div className="p-4 border-b border-[#1f2937] relative shrink-0 overflow-hidden bg-[#151924]">
            <div className="scan-line"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-slate-300 uppercase">AI SIGNAL FEED</span>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 text-[10px] text-red-500 px-1.5 py-0.5 rounded-sm font-mono tracking-widest font-bold">
                LIVE LOGGING
              </div>
            </div>
          </div>

          {/* List of Alerts */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#11141d]/40">
            {signalFeed.map((alert) => {
              // Color styles based on severity
              let borderClass = "border-[#1f2937] bg-[#0c0f17]/95";
              let levelBadge = "text-slate-400 bg-slate-500/10 border-slate-500/20";
              
              if (alert.level === "critical") {
                borderClass = "border-red-500/30 bg-red-950/5";
                levelBadge = "text-red-500 bg-red-500/10 border-red-500/20";
              } else if (alert.level === "warning") {
                borderClass = "border-amber-500/30 bg-amber-950/5";
                levelBadge = "text-amber-500 bg-amber-500/10 border-amber-500/20";
              }

              return (
                <div
                  key={alert.id}
                  className={`border p-3 flex flex-col space-y-2 rounded-sm transition-all duration-200 hover:border-slate-600 animate-alert-fade-in ${borderClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{alert.timestamp}</span>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 border font-semibold ${levelBadge}`}>
                      {alert.levelText}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1f2937]/50 mt-1 gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">ANOMALY_INDEX: 0.94</span>
                    <div className="flex items-center space-x-1.5">
                      {alert.nodeId && (
                        <button
                          onClick={() => handleTrackAlertNode(alert.nodeId, alert.lat, alert.lon)}
                          className="text-[10px] text-amber-500 hover:text-white font-mono flex items-center space-x-1 uppercase transition-all bg-[#090b10] border border-[#1f2937] px-2 py-0.5 rounded-sm"
                        >
                          <span>TRACK</span>
                        </button>
                      )}
                      <button
                        onClick={() => openNodeGraph(alert.nodeId || "SYSTEM")}
                        className="text-[10px] text-emerald-400 hover:text-white font-mono flex items-center space-x-1 uppercase transition-all bg-[#090b10] border border-[#1f2937] px-2 py-0.5 rounded-sm"
                      >
                        <span>GRAPH</span>
                        <ExternalLink className="h-3 w-3 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Security / System Signatures */}
          <div className="p-4 border-t border-[#1f2937] bg-[#0c0f17]/95 shrink-0 text-[10px] font-mono text-slate-500 space-y-1.5">
            <div className="flex justify-between">
              <span>ALGORITHM:</span>
              <span className="text-slate-400">GEO_THREAT_MDL_v3.2</span>
            </div>
            <div className="flex justify-between">
              <span>SCAN RATE:</span>
              <span className="text-emerald-500">1,240 SAMPLES / SEC</span>
            </div>
            <div className="flex justify-between">
              <span>SHA-256 STATE:</span>
              <span className="text-slate-400 truncate w-32 text-right">E4B9C23...D5F</span>
            </div>
          </div>
        </aside>

      </div>

      {/* Relational Node Graph Modal Overlay */}
      {isGraphOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6">
          <div className="w-full max-w-2xl bg-[#11141d] border border-[#1f2937] shadow-2xl flex flex-col rounded-sm overflow-hidden select-none">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c0f17] border-b border-[#1f2937]">
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
                <Network className="h-4 w-4" />
                <span className="tracking-widest uppercase">RELATIONAL TOPOLOGY // NODE: {graphNodeId}</span>
              </div>
              <button 
                onClick={() => setIsGraphOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content - Cybernetic SVG Tree */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#090b10] border-b border-[#1f2937] relative min-h-[350px]">
              
              {/* Tech details left side */}
              <div className="absolute top-4 left-4 font-mono text-[10px] text-slate-500 space-y-1">
                <div>SYSTEM REF: <span className="text-emerald-500">SECURE_LINK_GRID</span></div>
                <div>INTEGRITY: <span className="text-emerald-400">100% VALIDATED</span></div>
                <div>DEGREE OF SEPARATION: <span className="text-slate-300">1ST ORDER</span></div>
              </div>

              {/* Graphic Node Network (SVG) */}
              <svg className="w-full h-[280px]" viewBox="0 0 600 280">
                {/* Connection paths */}
                <path d="M 300 140 L 150 70" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" strokeDasharray="4,4" />
                <path d="M 300 140 L 450 70" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" strokeDasharray="4,4" />
                <path d="M 300 140 L 150 210" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />
                <path d="M 300 140 L 450 210" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" />

                {/* Central Focus Node */}
                <circle cx="300" cy="140" r="14" fill="#0c0f17" stroke="#10b981" strokeWidth="2.5" />
                <circle cx="300" cy="140" r="4" fill="#10b981" />
                <text x="300" y="170" fill="#ffffff" fontSize="10" fontFamily="monospace" textAnchor="middle" className="font-bold">
                  {graphNodeId} (TARGET)
                </text>

                {/* Connected Node 1 */}
                <circle cx="150" cy="70" r="10" fill="#0c0f17" stroke="#10b981" strokeWidth="1.5" />
                <text x="150" y="92" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  SATCOM-UP-09 (Active)
                </text>

                {/* Connected Node 2 */}
                <circle cx="450" cy="70" r="10" fill="#0c0f17" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="450" y="92" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  CHOKEPOINT-B (Stressed)
                </text>

                {/* Connected Node 3 */}
                <circle cx="150" cy="210" r="10" fill="#0c0f17" stroke="#10b981" strokeWidth="1.5" />
                <text x="150" y="232" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  AIS-TERRESTRIAL-14 (Nominal)
                </text>

                {/* Connected Node 4 */}
                <circle cx="450" cy="210" r="10" fill="#0c0f17" stroke="#ef4444" strokeWidth="1.5" />
                <text x="450" y="232" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  SEC-7-BLACKOUT (CRITICAL)
                </text>
              </svg>

              <div className="text-center font-mono text-xs text-slate-400">
                This diagram renders real-time signal connectivity relays mapped through active logistics pipelines.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-[#0c0f17] flex justify-end space-x-2">
              <button
                onClick={() => setIsGraphOpen(false)}
                className="bg-[#11141d] hover:bg-[#1b202d] text-slate-400 border border-[#1f2937] hover:border-slate-600 px-4 py-1.5 text-xs font-mono rounded-sm transition-all"
              >
                DISMISS
              </button>
              <button
                onClick={() => {
                  setIsGraphOpen(false);
                  setConsoleLogs(prev => [...prev, `SECURE_GRAPH: Exported relational log report for ${graphNodeId}.`]);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 px-4 py-1.5 text-xs font-mono font-semibold rounded-sm transition-all"
              >
                EXPORT RAW DATAFEED
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Palantir Knowledge Graph Topology Modal */}
      {showTopology && selectedEntity && (
        <TopologyGraph
          entity={selectedEntity}
          onClose={() => setShowTopology(false)}
        />
      )}

    </div>
  );
}
