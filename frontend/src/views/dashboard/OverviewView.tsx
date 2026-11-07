import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Activity,
  Database,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { DemoBanner } from '../../components/common/DemoBanner';
import { RiskBadge } from '../../components/common/RiskBadge';
import { ThreatActivityChart } from '../../components/charts/ThreatActivityChart';
import { RiskDistributionChart } from '../../components/charts/RiskDistributionChart';
import { ThreatCategoryChart } from '../../components/charts/ThreatCategoryChart';
import { SAMPLE_INVESTIGATIONS } from '../../data/sampleInvestigations';
import { THREAT_FEED_SOURCES } from '../../data/mockThreatIntelligence';
import { DashboardViewId } from '../../components/layout/Sidebar';

interface OverviewViewProps {
  onNavigate: (view: DashboardViewId, target?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Top Banner Notice */}
      <DemoBanner />

      {/* Primary Statistics Grid: 2 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Total Audited"
          value="1,060"
          subtext="+42 queries in last 24h"
          icon={Activity}
          accent="saffron"
          badge="Live Index"
        />
        <StatCard
          label="Suspicious URLs"
          value="210"
          subtext="Elevated lexical entropy"
          icon={AlertTriangle}
          accent="amber"
          badge="Elevated"
        />
        <StatCard
          label="Active Threats"
          value="230"
          subtext="Confirmed phishing lures"
          icon={ShieldAlert}
          accent="rose"
          badge="Hostile"
        />
        <StatCard
          label="Feed Matches"
          value="342"
          subtext="Across 5 global repos"
          icon={Database}
          accent="green"
          badge="Multi-Feed"
        />
      </div>

      {/* Main Charts Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Threat Activity Time-Series (7 cols) */}
        <div className="lg:col-span-7">
          <ThreatActivityChart />
        </div>

        {/* Risk Distribution Donut (5 cols) */}
        <div className="lg:col-span-5">
          <RiskDistributionChart />
        </div>
      </div>

      {/* Secondary Matrix: Tactic Classification & Threat Intelligence Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Category Breakdown (5 cols) */}
        <div className="lg:col-span-5">
          <ThreatCategoryChart />
        </div>

        {/* Threat Intelligence Feed Status (7 cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
                CORROBORATION SOURCES
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                Threat Intelligence Feeds
              </h3>
            </div>
            <button
              onClick={() => onNavigate('threat-intel')}
              className="text-xs text-[#FF9933] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-white/10 text-xs">
            {THREAT_FEED_SOURCES.slice(0, 4).map((source) => (
              <div key={source.id} className="py-2.5 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 xs:gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white tracking-tight">{source.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                      {source.provider}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-sans block truncate">{source.category}</span>
                </div>
                <div className="flex xs:flex-col items-center xs:items-end justify-between xs:justify-center flex-shrink-0 pt-1 xs:pt-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                    {source.status}
                  </span>
                  <span className="text-[10px] text-slate-500 xs:mt-0.5">{source.lastSync}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Investigation Activity */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
              AUDIT LOG // RECENT TELEMETRY
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
              Recent Forensic Investigations
            </h3>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-[#FF9933] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full History</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Mobile View: Clean Touch Cards (< sm) */}
        <div className="sm:hidden space-y-2.5">
          {SAMPLE_INVESTIGATIONS.map((inv) => (
            <div
              key={inv.id}
              className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">{inv.id}</span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[9px] font-bold">
                  {inv.type}
                </span>
              </div>
              <div className="font-mono text-slate-200 text-xs break-all line-clamp-2">
                {inv.target}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <RiskBadge level={inv.riskLevel} score={inv.riskScore} size="sm" />
                <button
                  onClick={() => onNavigate('url', inv.target)}
                  className="px-3 py-1 rounded bg-[#FF9933] text-black font-bold text-[10px] uppercase cursor-pointer active:scale-95 transition-transform"
                >
                  Audit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / Tablet View: Full Table (sm:) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3">Investigation ID</th>
                <th className="py-2 px-3">Target Asset</th>
                <th className="py-2 px-3">Modality</th>
                <th className="py-2 px-3">Observed Risk</th>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {SAMPLE_INVESTIGATIONS.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 text-white font-bold">{inv.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 max-w-xs truncate">
                    {inv.target}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold">
                      {inv.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <RiskBadge level={inv.riskLevel} score={inv.riskScore} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{inv.timestamp}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onNavigate('url', inv.target)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase cursor-pointer transition-colors"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
