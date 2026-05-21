import React from "react";
import { X, Network, Database, ShieldAlert, Navigation, Building2, Package } from "lucide-react";

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

interface TopologyGraphProps {
  entity: Entity;
  onClose: () => void;
}

export default function TopologyGraph({ entity, onClose }: TopologyGraphProps) {
  // Generate high-fidelity details based on type
  const isShip = entity.type === "ship";
  
  const details = {
    ownership: isShip 
      ? "Apex Maritime Holdings [BVI]" 
      : "AeroLease Global Inc. (Ireland)",
    cargo: entity.cargo || (isShip ? "4,500 TEU / Class-3 Chemical Hazmat" : "Commercial Strategic Freight / Sealed Cargo"),
    route: isShip ? "Rotterdam (NL) -> Singapore Strait (SG)" : "New York (JFK) -> New Delhi (DEL)",
    threat: entity.status === "critical"
      ? "CRITICAL: GPS Spoofing & AIS Transponder Blanking Detected"
      : "NOMINAL: Transmitting standard encrypted transponder packet",
  };

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-[#090b10]/90 flex items-center justify-center select-none font-mono">
      
      {/* Visual cyber mesh grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.25)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40 pointer-events-none"></div>

      {/* Extreme Glassmorphic Topology Container */}
      <div className="relative w-full h-full max-w-5xl max-h-[650px] bg-[#0c101a]/70 border border-[#1f2937]/80 rounded-sm shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#070a12]/90 border-b border-[#1f2937]/75">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Network className="h-5 w-5 text-emerald-400 animate-pulse" />
            <div>
              <span className="font-bold tracking-widest text-sm uppercase">RELATIONAL KNOWLEDGE TOPOLOGY</span>
              <div className="text-[9px] text-slate-500 font-mono">SECURE LINK PROTOCOL // WGS-84 DATA WEB</div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="flex items-center space-x-1 text-xs border border-[#ef4444]/30 hover:border-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444]/25 text-[#ef4444] px-2.5 py-1 rounded-sm transition-all uppercase tracking-wider"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close Topology</span>
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 relative w-full overflow-hidden min-h-[450px]">
          
          {/* Glowing Connecting SVG Vectors */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Definitions for Glow filters */}
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Left Top Line to Ownership */}
            <line x1="50%" y1="50%" x2="25%" y2="28%" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="5,5" filter="url(#glow)" className="animate-[dash_30s_linear_infinite]" />
            {/* Right Top Line to Cargo */}
            <line x1="50%" y1="50%" x2="75%" y2="28%" stroke="#00e5ff" strokeWidth="1.5" filter="url(#glow)" />
            {/* Left Bottom Line to Route */}
            <line x1="50%" y1="50%" x2="25%" y2="72%" stroke="#00e5ff" strokeWidth="1.5" filter="url(#glow)" />
            {/* Right Bottom Line to Threat */}
            <line x1="50%" y1="50%" x2="75%" y2="72%" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="5,5" filter="url(#glow)" className="animate-[dash_30s_linear_infinite]" />
          </svg>

          {/* Central Anchor Node: The Asset */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[240px]">
            <div className="bg-[#0b0e17]/90 border border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-sm p-4 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 mb-2 font-bold tracking-widest uppercase">
                <Database className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>CENTRAL ANCHOR</span>
              </div>
              <span className="text-sm font-bold text-white tracking-widest">{entity.name || entity.id}</span>
              <div className="text-[9px] text-slate-500 mt-1 uppercase font-mono">{entity.type} // {entity.code}</div>
              <div className="mt-3 flex items-center justify-center">
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase ${
                  entity.status === 'critical' ? 'bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444]' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {entity.statusText || entity.status}
                </span>
              </div>
            </div>
          </div>

          {/* Node 1: Ownership (Top-Left) */}
          <div className="absolute top-[28%] left-[25%] -translate-x-1/2 -translate-y-1/2 w-[220px]">
            <div className="bg-[#0b0e17]/85 border border-[#1f2937] hover:border-[#00e5ff]/50 rounded-sm p-3.5 transition-all backdrop-blur-md">
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1.5 tracking-wider uppercase font-semibold">
                <Building2 className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span>Beneficial Owner</span>
              </div>
              <span className="text-[11px] text-slate-200 font-bold">{details.ownership}</span>
              <div className="text-[8px] text-slate-500 mt-1 uppercase">Entity structure tracked via BVI registries</div>
            </div>
          </div>

          {/* Node 2: Cargo Manifest (Top-Right) */}
          <div className="absolute top-[28%] right-[25%] translate-x-1/2 -translate-y-1/2 w-[220px]">
            <div className="bg-[#0b0e17]/85 border border-[#1f2937] hover:border-[#00e5ff]/50 rounded-sm p-3.5 transition-all backdrop-blur-md">
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1.5 tracking-wider uppercase font-semibold">
                <Package className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span>Cargo manifest</span>
              </div>
              <span className="text-[11px] text-slate-200 font-bold">{details.cargo}</span>
              <div className="text-[8px] text-slate-500 mt-1 uppercase">Customs & port manifest declarations</div>
            </div>
          </div>

          {/* Node 3: Route (Bottom-Left) */}
          <div className="absolute bottom-[28%] left-[25%] -translate-x-1/2 translate-y-1/2 w-[220px]">
            <div className="bg-[#0b0e17]/85 border border-[#1f2937] hover:border-[#00e5ff]/50 rounded-sm p-3.5 transition-all backdrop-blur-md">
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1.5 tracking-wider uppercase font-semibold">
                <Navigation className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span>Route manifest</span>
              </div>
              <span className="text-[11px] text-slate-200 font-bold">{details.route}</span>
              <div className="text-[8px] text-slate-500 mt-1 uppercase">Calculated speed: {entity.speed || "0.0 kts"}</div>
            </div>
          </div>

          {/* Node 4: Threat Vector (Bottom-Right) */}
          <div className="absolute bottom-[28%] right-[25%] translate-x-1/2 translate-y-1/2 w-[220px]">
            <div className="bg-[#0b0e17]/85 border border-[#1f2937] hover:border-[#00e5ff]/50 rounded-sm p-3.5 transition-all backdrop-blur-md">
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1.5 tracking-wider uppercase font-semibold">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <span>Threat Vector</span>
              </div>
              <span className={`text-[11px] font-bold ${
                entity.status === 'critical' ? 'text-red-400' : 'text-slate-200'
              }`}>{details.threat}</span>
              <div className="text-[8px] text-slate-500 mt-1 uppercase">Real-time heuristic evaluation</div>
            </div>
          </div>

        </div>

        {/* Footer Technical Readouts */}
        <div className="px-6 py-3.5 bg-[#070a12]/90 border-t border-[#1f2937]/75 flex justify-between items-center text-[9px] text-slate-500">
          <span>ALGORITHM DECRYPT SYSTEM: RSA-4096-AES</span>
          <span className="text-emerald-400">NOMINAL LINK INTEGRITY</span>
        </div>

      </div>
    </div>
  );
}
