import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const RISK_DATA = [
  { name: 'Low Risk', value: 580, color: '#138808' },
  { name: 'Suspicious', value: 210, color: '#FF9933' },
  { name: 'High Risk', value: 145, color: '#F97316' },
  { name: 'Malicious', value: 85, color: '#EF4444' },
  { name: 'Inconclusive', value: 40, color: '#64748B' },
];

export const RiskDistributionChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-left font-mono ${className}`}>
      <div className="pb-3 border-b border-white/10">
        <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
          DISTRIBUTION PROFILE
        </span>
        <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
          Observed Risk Spectrum
        </h3>
      </div>

      <div className="h-44 sm:h-48 mt-2 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={RISK_DATA}
              innerRadius={45}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
            >
              {RISK_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                color: '#F4F5F2',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] sm:text-[11px]">
        {RISK_DATA.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400 truncate">{item.name}</span>
            </div>
            <span className="font-bold text-white flex-shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
