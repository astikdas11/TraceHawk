import React, { useState } from 'react';
import {
  Database,
  Search,
} from 'lucide-react';
import { THREAT_FEED_SOURCES } from '../../data/mockThreatIntelligence';
import { DemoBanner } from '../../components/common/DemoBanner';
import { RiskBadge } from '../../components/common/RiskBadge';
import { RiskLevel } from '../../types';

interface CuratedIndicator {
  ioc: string;
  type: 'URL' | 'DOMAIN' | 'IP' | 'HASH';
  source: string;
  category: string;
  riskLevel: RiskLevel;
  confidence: number;
  firstSeen: string;
  tags: string[];
}

const CURATED_INDICATORS: CuratedIndicator[] = [
  {
    ioc: 'http://sbi-kyc-verify-portal.in/login.php',
    type: 'URL',
    source: 'URLhaus Abuse Repository',
    category: 'Banking Phish & Credential Harvest',
    riskLevel: 'CONFIRMED_MALICIOUS',
    confidence: 99,
    firstSeen: '2026-11-07 14:15 IST',
    tags: ['sbi', 'kyc-fraud', 'phishing'],
  },
  {
    ioc: '185.220.101.45',
    type: 'IP',
    source: 'AbuseIPDB Global Blocklist',
    category: 'Hostile SSH Brute Force & C2 Relay',
    riskLevel: 'HIGH_RISK',
    confidence: 96,
    firstSeen: '2026-11-07 13:50 IST',
    tags: ['c2-node', 'brute-force', 'tor-exit'],
  },
  {
    ioc: 'electricity-bill-pay-portal.online',
    type: 'DOMAIN',
    source: 'PhiUSIIL Corpus / PhishTank',
    category: 'Utility Cut-off Panic Extortion',
    riskLevel: 'CONFIRMED_MALICIOUS',
    confidence: 98,
    firstSeen: '2026-11-07 12:08 IST',
    tags: ['power-cut', 'urgent-extortion'],
  },
  {
    ioc: 'https://netflix-billing-resolve.xyz/account',
    type: 'URL',
    source: 'PhishTank Collective Feed',
    category: 'Subscription Billing Credential Phish',
    riskLevel: 'HIGH_RISK',
    confidence: 94,
    firstSeen: '2026-11-07 11:15 IST',
    tags: ['netflix', 'credit-card-harvest'],
  },
  {
    ioc: 'amazon-task-review-jobs.org',
    type: 'DOMAIN',
    source: 'CIRCL MISP OSINT Stream',
    category: 'Advance-Fee Task Scam / Telegram',
    riskLevel: 'HIGH_RISK',
    confidence: 91,
    firstSeen: '2026-11-07 09:50 IST',
    tags: ['job-fraud', 'part-time-scam'],
  },
  {
    ioc: '194.26.29.112',
    type: 'IP',
    source: 'AbuseIPDB Global Blocklist',
    category: 'Port Scanner & Vulnerability Probe',
    riskLevel: 'SUSPICIOUS',
    confidence: 78,
    firstSeen: '2026-11-07 08:30 IST',
    tags: ['recon', 'scanner'],
  },
  {
    ioc: 'https://onlinesbi.sbi',
    type: 'URL',
    source: 'Sovereign Certificate Registry',
    category: 'Legitimate Sovereign Banking Infrastructure',
    riskLevel: 'LOW_RISK',
    confidence: 100,
    firstSeen: '2026-11-01 00:00 IST',
    tags: ['verified-bank', 'digicert-ev'],
  },
];

export const ThreatIntelligenceView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  const filteredIndicators = CURATED_INDICATORS.filter((ind) => {
    const matchesSearch =
      ind.ioc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || ind.type === filterType;
    const matchesRisk = filterRisk === 'ALL' || ind.riskLevel === filterRisk;

    return matchesSearch && matchesType && matchesRisk;
  });

  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Top Banner Notice */}
      <DemoBanner />

      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-[#FF9933] flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              Threat Intelligence Feeds & Corroboration
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
            Correlates incoming digital indicators against reputable open-source repositories and verified IOC feeds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>5 Feeds Synced</span>
          </span>
        </div>
      </div>

      {/* Feed Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {THREAT_FEED_SOURCES.map((source) => {
          const isSelected = selectedFeedId === source.id;
          return (
            <div
              key={source.id}
              onClick={() => setSelectedFeedId(isSelected ? null : source.id)}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/10 border-[#FF9933] ring-1 ring-[#FF9933]'
                  : 'bg-black/60 border-white/10 hover:border-white/25 backdrop-blur-md'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold text-[#FF9933] bg-[#FF9933]/10 px-2 py-0.5 rounded border border-[#FF9933]/20">
                  {source.id}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded ${
                    source.status === 'OPERATIONAL'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                  }`}
                >
                  {source.status}
                </span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">{source.name}</h3>
              <p className="text-[11px] text-slate-400 font-sans mb-3 line-clamp-2">{source.description}</p>

              <div className="pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500 block">Indicators:</span>
                  <span className="text-white font-bold">{source.indicatorsTracked.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reliability:</span>
                  <span className="text-emerald-400 font-bold">{source.reliability}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Provider:</span>
                  <span className="text-slate-300 truncate block">{source.provider}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sync:</span>
                  <span className="text-slate-300 truncate block">{source.lastSync}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Indicators Corroboration Table / Cards */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
              CORROBORATED IOC INDEX
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
              Curated Threat Indicators
            </h3>
          </div>

          {/* Search and Filters: full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IOC, domain, tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9933] sm:w-56"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
              >
                <option value="ALL">All Types</option>
                <option value="URL">URL</option>
                <option value="DOMAIN">DOMAIN</option>
                <option value="IP">IP</option>
              </select>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
              >
                <option value="ALL">All Risks</option>
                <option value="CONFIRMED_MALICIOUS">Malicious</option>
                <option value="HIGH_RISK">High Risk</option>
                <option value="SUSPICIOUS">Suspicious</option>
                <option value="LOW_RISK">Low Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile View: Clean Touch Cards (< sm) */}
        <div className="sm:hidden space-y-2.5">
          {filteredIndicators.map((ind, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px]">
                  {ind.type}
                </span>
                <RiskBadge level={ind.riskLevel} size="sm" />
              </div>
              <div className="font-mono text-white text-xs break-all">
                {ind.ioc}
              </div>
              <div className="text-slate-400 text-[11px] font-sans">
                {ind.category}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500">
                <span className="truncate max-w-[170px]">{ind.source}</span>
                <span className="text-emerald-400 font-bold flex-shrink-0">{ind.confidence}% Conf</span>
              </div>
            </div>
          ))}
          {filteredIndicators.length === 0 && (
            <div className="p-4 text-center text-slate-500 text-xs italic">
              No matching indicators found.
            </div>
          )}
        </div>

        {/* Desktop Table (sm:) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Indicator of Compromise (IOC)</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3">Threat Category</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Source Repository</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {filteredIndicators.map((ind, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="py-2.5 px-3 font-mono text-white max-w-xs truncate">
                    {ind.ioc}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px]">
                      {ind.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <RiskBadge level={ind.riskLevel} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{ind.category}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{ind.confidence}%</td>
                  <td className="py-2.5 px-3 text-slate-400">{ind.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
