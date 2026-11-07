import React, { useState } from 'react';
import {
  Globe2,
  Search,
  Server,
  ShieldAlert,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { RiskBadge } from '../../components/common/RiskBadge';
import { MOCK_DNS_RECORDS } from '../../data/mockDnsTlsData';
import { RiskLevel, DnsRecordItem } from '../../types';

interface DomainIntelligenceViewProps {
  initialDomain?: string;
  onInvestigateUrl: (url: string) => void;
}

export const DomainIntelligenceView: React.FC<DomainIntelligenceViewProps> = ({
  initialDomain = 'sbi-kyc-verify-portal.in',
}) => {
  const [domainInput, setDomainInput] = useState(initialDomain);
  const [isSearching, setIsSearching] = useState(false);

  const [domainData, setDomainData] = useState<{
    domain: string;
    registrar: string;
    creationDate: string;
    expiryDate: string;
    ageDays: number;
    asn: string;
    ipAddress: string;
    country: string;
    riskLevel: RiskLevel;
    reputationScore: number;
    dnsRecords: DnsRecordItem[];
    associatedThreats: string[];
  }>({
    domain: 'sbi-kyc-verify-portal.in',
    registrar: 'NameCheap, Inc. (Privacy Guardian Protected)',
    creationDate: '2026-10-24 10:14:02 UTC',
    expiryDate: '2027-10-24 10:14:02 UTC',
    ageDays: 14,
    asn: 'AS13335 (Cloudflare, Inc. CDN Anycast)',
    ipAddress: '104.21.72.193 / 172.67.182.204',
    country: 'United States',
    riskLevel: 'CONFIRMED_MALICIOUS',
    reputationScore: 12,
    dnsRecords: MOCK_DNS_RECORDS['sbi-kyc-verify-portal.in'] || [],
    associatedThreats: [
      'Banking Phish: State Bank of India YONO mobile portal impersonation',
      'Targeted SMS payload distribution vector',
      'Cataloged in URLhaus abuse stream #8492019',
    ],
  });

  const handleDomainSearch = (overrideDomain?: string) => {
    const target = (overrideDomain || domainInput).trim();
    if (!target) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);

      if (target.includes('onlinesbi.sbi') || target.includes('sbi.co.in')) {
        setDomainData({
          domain: 'onlinesbi.sbi',
          registrar: 'National Informatics Centre / Sovereign Registry',
          creationDate: '2016-08-12 00:00:00 UTC',
          expiryDate: '2028-08-12 00:00:00 UTC',
          ageDays: 3738,
          asn: 'AS4758 (NIC / NICNET India)',
          ipAddress: '121.240.66.195',
          country: 'India',
          riskLevel: 'LOW_RISK',
          reputationScore: 98,
          dnsRecords: MOCK_DNS_RECORDS['onlinesbi.sbi'] || [],
          associatedThreats: [],
        });
      } else {
        setDomainData({
          domain: target,
          registrar: 'Public Domain Registrar Ltd.',
          creationDate: '2026-06-15 00:00:00 UTC',
          expiryDate: '2027-06-15 00:00:00 UTC',
          ageDays: 145,
          asn: 'AS13335 (Cloudflare, Inc.)',
          ipAddress: '172.67.200.11',
          country: 'United States',
          riskLevel: 'SUSPICIOUS',
          reputationScore: 48,
          dnsRecords: [
            { type: 'A', value: '172.67.200.11', ttl: 300, flag: 'Cloudflare Proxy' },
            { type: 'NS', value: 'ns1.cloudflare.com', ttl: 86400 },
            { type: 'NS', value: 'ns2.cloudflare.com', ttl: 86400 },
          ],
          associatedThreats: ['Unverified third-party registration'],
        });
      }
      setDomainInput(target);
    }, 600);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Module Title */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15 flex-shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white uppercase tracking-wide truncate">
              Module 03 // Domain & DNS Network Intelligence
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-sans line-clamp-1 sm:line-clamp-none">
              WHOIS registry parsing, authoritative DNS zone records, and autonomous system routing.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* Domain Search Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
          <span>Query Domain Telemetry:</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="e.g. sbi-kyc-verify-portal.in or onlinesbi.sbi"
            className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933]"
          />
          <button
            onClick={() => handleDomainSearch()}
            disabled={isSearching}
            className="px-5 py-2.5 sm:py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold text-xs uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying WHOIS...</span>
              </>
            ) : (
              <>
                <Globe2 className="w-4 h-4" />
                <span>Query Domain</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase mr-1">Presets:</span>
          <button
            onClick={() => handleDomainSearch('sbi-kyc-verify-portal.in')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
          >
            sbi-kyc-verify-portal.in (Phish)
          </button>
          <button
            onClick={() => handleDomainSearch('onlinesbi.sbi')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
          >
            onlinesbi.sbi (Sovereign)
          </button>
        </div>
      </div>

      {/* Domain Overview Grid */}
      {domainData && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Dossier Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4 text-xs">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
                  WHOIS REGISTRY DOSSIER
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{domainData.domain}</h3>
              </div>
              <div className="self-start xs:self-auto flex-shrink-0">
                <RiskBadge level={domainData.riskLevel} size="md" />
              </div>
            </div>

            {/* Parameter Grid: 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">REGISTRAR</span>
                <span className="text-white font-bold truncate block">{domainData.registrar}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">DOMAIN AGE</span>
                <span className={`font-bold block truncate ${domainData.ageDays < 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {domainData.ageDays} days ({domainData.ageDays < 30 ? 'New' : 'Established'})
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">ASN ROUTING</span>
                <span className="text-slate-300 truncate block">{domainData.asn}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">REPUTATION</span>
                <span className={`font-bold block ${domainData.reputationScore > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {domainData.reputationScore} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Authoritative DNS Zone Records */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>DNS Zone Records ({domainData.dnsRecords.length})</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500">Live Nameserver</span>
            </div>

            {/* Mobile DNS Card View (< sm) */}
            <div className="sm:hidden space-y-2">
              {domainData.dnsRecords.map((rec, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px]">
                      {rec.type}
                    </span>
                    <span className="text-slate-400 text-[10px]">{rec.ttl}s TTL</span>
                  </div>
                  <div className="font-mono text-white text-[11px] break-all">
                    {rec.value}
                  </div>
                  {rec.flag && (
                    <div className="text-amber-400 text-[10px] pt-0.5 border-t border-white/5">
                      Flag: {rec.flag}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop DNS Table (sm:) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Record Type</th>
                    <th className="py-2 px-3">Resolved Destination / Target Value</th>
                    <th className="py-2 px-3">TTL</th>
                    <th className="py-2 px-3">Observations / Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {domainData.dnsRecords.map((rec, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px]">
                          {rec.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white max-w-sm truncate">{rec.value}</td>
                      <td className="py-2.5 px-3 text-slate-400">{rec.ttl}s</td>
                      <td className="py-2.5 px-3 text-amber-400">{rec.flag || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Correlated Threats */}
          {domainData.associatedThreats.length > 0 && (
            <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>Correlated Hostile Activity ({domainData.associatedThreats.length})</span>
              </span>
              <div className="space-y-2 text-xs">
                {domainData.associatedThreats.map((threat, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-rose-950/20 border border-rose-900/60 text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{threat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
