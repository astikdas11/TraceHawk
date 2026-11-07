import React, { useState } from 'react';
import {
  Database,
  Search,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Filter,
  Layers,
  ArrowUpRight,
  Info
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
    category: 'Banking Impersonation & Credential Harvest',
    riskLevel: 'CONFIRMED_MALICIOUS',
    confidence: 99,
    firstSeen: '2026-11-07 14:15 IST',
    tags: ['sbi', 'kyc-fraud', 'phishing', 'in-banking'],
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
    tags: ['power-cut', 'urgent-extortion', 'upi-bait'],
  },
  {
    ioc: 'https://netflix-billing-resolve.xyz/account',
    type: 'URL',
    source: 'PhishTank Collective Feed',
    category: 'Subscription Billing Credential Phish',
    riskLevel: 'HIGH_RISK',
    confidence: 94,
    firstSeen: '2026-11-07 11:15 IST',
    tags: ['netflix', 'credit-card-harvest', 'xyz-domain'],
  },
  {
    ioc: 'amazon-task-review-jobs.org',
    type: 'DOMAIN',
    source: 'CIRCL MISP OSINT Stream',
    category: 'Advance-Fee Task Scam / Telegram Recruitment',
    riskLevel: 'HIGH_RISK',
    confidence: 91,
    firstSeen: '2026-11-07 09:50 IST',
    tags: ['job-fraud', 'part-time-scam', 'telegram'],
  },
  {
    ioc: '194.26.29.112',
    type: 'IP',
    source: 'AbuseIPDB Global Blocklist',
    category: 'Port Scanner & Web Vulnerability Probe',
    riskLevel: 'SUSPICIOUS',
    confidence: 78,
    firstSeen: '2026-11-07 08:30 IST',
    tags: ['recon', 'scanner', 'masscan'],
  },
  {
    ioc: 'https://onlinesbi.sbi',
    type: 'URL',
    source: 'Sovereign Certificate Registry',
    category: 'Legitimate Sovereign Banking Infrastructure',
    riskLevel: 'LOW_RISK',
    confidence: 100,
    firstSeen: '2026-11-01 00:00 IST',
    tags: ['verified-bank', 'digicert-ev', 'legitimate'],
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
    <div className="space-y-6 text-left font-mono">
      {/* Top Banner Notice */}
      <DemoBanner />

      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-[#FF9933]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Threat Intelligence Feeds & Corroboration Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans max-w-2xl">
            Correlates incoming digital indicators against reputable open-source threat repositories, academic corpora, and verified IOC feeds.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>5 Feeds Synced</span>
          </span>
        </div>
      </div>

      {/* Feed Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {THREAT_FEED_SOURCES.map((source) => {
          const isSelected = selectedFeedId === source.id;
          return (
            <div
              key={source.id}
              onClick={() => setSelectedFeedId(isSelected ? null : source.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    source.status === 'OPERATIONAL'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                  }`}
                >
                  {source.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{source.name}</h3>
              <p className="text-[11px] text-slate-400 font-sans mb-3">{source.description}</p>

              <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
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
                  <span className="text-slate-500 block">Sync Frequency:</span>
                  <span className="text-slate-300">{source.lastSync}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Indicators Corroboration Table */}
      <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              CORROBORATED IOC INDEX
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Curated Threat Indicators
            </h3>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IOC, domain, tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9933] w-48 sm:w-56"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
            >
              <option value="ALL">All Types</option>
              <option value="URL">URL</option>
              <option value="DOMAIN">DOMAIN</option>
              <option value="IP">IP</option>
            </select>

            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CONFIRMED_MALICIOUS">Confirmed Malicious</option>
              <option value="HIGH_RISK">High Risk</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="LOW_RISK">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Indicator of Compromise (IOC)</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Primary Source</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Observed Risk</th>
                <th className="py-2.5 px-3">Tags</th>
                <th className="py-2.5 px-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[11px]">
              {filteredIndicators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No threat indicators match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredIndicators.map((ind, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-white font-bold max-w-xs truncate">
                      {ind.ioc}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold">
                        {ind.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">
                      {ind.source}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans max-w-xs truncate">
                      {ind.category}
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={ind.riskLevel} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {ind.tags.slice(0, 2).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-white">{ind.confidence}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

