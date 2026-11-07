import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  accent?: 'saffron' | 'green' | 'navy' | 'rose' | 'amber';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  accent = 'saffron',
  className = '',
}) => {
  const accentStyles = {
    saffron: {
      iconBg: 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30',
      badge: 'bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/30',
      highlight: 'hover:border-[#FF9933]/40',
    },
    green: {
      iconBg: 'bg-[#138808]/15 text-emerald-400 border-emerald-700/40',
      badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-700/40',
      highlight: 'hover:border-emerald-600/40',
    },
    navy: {
      iconBg: 'bg-blue-950/50 text-blue-400 border-blue-800/40',
      badge: 'bg-blue-950/60 text-blue-300 border-blue-800/40',
      highlight: 'hover:border-blue-600/40',
    },
    rose: {
      iconBg: 'bg-rose-950/50 text-rose-400 border-rose-800/40',
      badge: 'bg-rose-950/60 text-rose-300 border-rose-800/40',
      highlight: 'hover:border-rose-600/40',
    },
    amber: {
      iconBg: 'bg-amber-950/50 text-amber-400 border-amber-800/40',
      badge: 'bg-amber-950/60 text-amber-300 border-amber-800/40',
      highlight: 'hover:border-amber-600/40',
    },
  };

  const style = accentStyles[accent];

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md transition-all duration-200 text-left font-mono flex flex-col justify-between ${style.highlight} ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-1.5 pb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider line-clamp-2">
            {label}
          </span>
          <div className={`p-1.5 sm:p-2 rounded-lg border flex-shrink-0 ${style.iconBg}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-1 mt-1">
          <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {value}
          </span>
          {badge && (
            <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-bold truncate max-w-[85px] sm:max-w-none ${style.badge}`}>
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtext && (
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-2 border-t border-white/10 pt-1.5 sm:pt-2 font-sans line-clamp-2">
          {subtext}
        </p>
      )}
    </div>
  );
};
