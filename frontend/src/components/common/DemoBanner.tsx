import React from 'react';
import { Database, ShieldCheck, AlertTriangle } from 'lucide-react';

interface DemoBannerProps {
  compact?: boolean;
  className?: string;
  isLiveInference?: boolean;
  serviceStatus?: 'online' | 'offline' | 'unknown';
  customMessage?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  compact = false,
  className = '',
  isLiveInference = false,
  serviceStatus = 'unknown',
  customMessage,
}) => {
  // 1. Compact Pill Mode (used in headers)
  if (compact) {
    if (isLiveInference) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-emerald-500/30 backdrop-blur-md text-emerald-400 text-[10px] font-mono tracking-wide uppercase ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live ML Inference</span>
        </div>
      );
    }
    if (serviceStatus === 'offline') {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-rose-500/30 backdrop-blur-md text-rose-400 text-[10px] font-mono tracking-wide uppercase ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Backend Offline</span>
        </div>
      );
    }
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10 backdrop-blur-md text-[#FF9933] text-[10px] font-mono tracking-wide uppercase ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-pulse" />
        <span>Demonstration Data</span>
      </div>
    );
  }

  // 2. Full Banner Mode (used at top of views)
  if (isLiveInference) {
    return (
      <div
        className={`p-2.5 sm:p-3 rounded-xl bg-black/60 border border-emerald-500/30 backdrop-blur-md text-[11px] sm:text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-slate-300 ${className}`}
      >
        <div className="flex items-start sm:items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-relaxed">
            <strong className="text-white">LIVE ML INFERENCE ACTIVE:</strong> Verified prediction from TRACEHAWK production inference engine (Tier 1 Lexical Model).
          </span>
        </div>
        <span className="self-start sm:self-auto text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold tracking-wider uppercase flex-shrink-0">
          Live Prediction
        </span>
      </div>
    );
  }

  if (serviceStatus === 'offline') {
    return (
      <div
        className={`p-2.5 sm:p-3 rounded-xl bg-black/60 border border-rose-500/30 backdrop-blur-md text-[11px] sm:text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-slate-300 ${className}`}
      >
        <div className="flex items-start sm:items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-relaxed">
            <strong className="text-white">BACKEND SERVICE UNREACHABLE:</strong> Operating in standalone preview mode. Verify network connection or backend availability.
          </span>
        </div>
        <span className="self-start sm:self-auto text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700 text-rose-300 font-bold tracking-wider uppercase flex-shrink-0">
          Offline
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-[11px] sm:text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-slate-300 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2">
        <Database className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-relaxed">
          {customMessage ? (
            customMessage
          ) : (
            <>
              <strong className="text-white">DEMONSTRATION DATA:</strong> Displaying benchmark sample indicators. Submit an investigation to execute live ML inference against the backend.
            </>
          )}
        </span>
      </div>
      <span className="self-start sm:self-auto text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-black/80 border border-white/15 text-[#FF9933] font-bold tracking-wider uppercase flex-shrink-0">
        Demonstration Data
      </span>
    </div>
  );
};
