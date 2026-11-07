import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ThreatActivityChartProps {
  data?: Array<{ time: string; investigations: number; threats: number }>;
  className?: string;
}

const DEFAULT_ACTIVITY_DATA = [
  { time: '00:00', investigations: 18, threats: 3 },
  { time: '03:00', investigations: 12, threats: 2 },
  { time: '06:00', investigations: 24, threats: 5 },
  { time: '09:00', investigations: 78, threats: 16 },
  { time: '12:00', investigations: 110, threats: 28 },
  { time: '15:00', investigations: 135, threats: 34 },
  { time: '18:00', investigations: 96, threats: 21 },
  { time: '21:00', investigations: 54, threats: 11 },
];

export const ThreatActivityChart: React.FC<ThreatActivityChartProps> = ({
  data = DEFAULT_ACTIVITY_DATA,
  className = '',
}) => {
  return (
    <div className={`p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-left font-mono ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            TELEMETRY STREAM // 24-HOUR INTERVAL
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Threat Activity & Investigation Volume
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9933]" />
            <span className="text-slate-400">Total Queries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-400">Flagged Threats</span>
          </div>
        </div>
      </div>

      <div className="h-64 mt-4 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="saffronGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9933" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF9933" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2B3E" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#526174"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1E2B3E' }}
            />
            <YAxis
              stroke="#526174"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono',
                color: '#F4F5F2',
              }}
            />
            <Area
              type="monotone"
              dataKey="investigations"
              stroke="#FF9933"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#saffronGradient)"
              name="Investigations"
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="#EF4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#roseGradient)"
              name="Threats"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

