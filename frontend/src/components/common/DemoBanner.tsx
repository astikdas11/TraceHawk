import React from 'react';
import { Database } from 'lucide-react';

interface DemoBannerProps {
  compact?: boolean;
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10 backdrop-blur-md text-[#FF9933] text-[10px] font-mono tracking-wide uppercase ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-pulse" />
        <span>Demonstration Data</span>
      </div>
    );
  }

  return (
    <div className={`p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-[11px] sm:text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-slate-300 ${className}`}>
      <div className="flex items-start sm:items-center gap-2">
        <Database className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-relaxed">
          <strong className="text-white">FRONTEND PREVIEW MODE:</strong> Displaying realistic benchmark indicators. Live ML model & threat feed telemetry will populate upon backend connection.
        </span>
      </div>
      <span className="self-start sm:self-auto text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-black/80 border border-white/15 text-[#FF9933] font-bold tracking-wider uppercase flex-shrink-0">
        Demo Telemetry
      </span>
    </div>
  );
};
