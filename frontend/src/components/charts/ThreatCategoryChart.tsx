import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CATEGORY_DATA = [
  { name: 'Banking Phish', count: 342, color: '#EF4444' },
  { name: 'Utility Cut-off', count: 215, color: '#F97316' },
  { name: 'Task Job Scam', count: 184, color: '#FF9933' },
  { name: 'Wallet Drainer', count: 126, color: '#3B82F6' },
  { name: 'Gov Impersonation', count: 98, color: '#EF4444' },
];

export const ThreatCategoryChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-left font-mono ${className}`}>
      <div className="pb-3 border-b border-white/10">
        <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
          TACTIC BREAKDOWN
        </span>
        <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
          Threat Modality Classification
        </h3>
      </div>

      <div className="h-48 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={CATEGORY_DATA}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
          >
            <XAxis type="number" stroke="#526174" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#F4F5F2"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={90}
            />
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
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {CATEGORY_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
