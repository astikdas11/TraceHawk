import React from 'react';
import { AlertCircle, Database } from 'lucide-react';

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
    <div className={`p-2.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md text-xs font-mono flex items-center justify-between gap-3 text-slate-300 ${className}`}>
      <div className="flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
        <span>
          <strong className="text-white">FRONTEND PREVIEW MODE:</strong> Displaying realistic benchmark indicators. Live machine learning model & threat feed telemetry will populate upon backend connection.
        </span>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded bg-black/80 border border-white/15 text-[#FF9933] font-bold tracking-wider uppercase flex-shrink-0">
        Demo Telemetry
      </span>
    </div>
  );
};

