import React, { useState, useEffect, useRef } from 'react';
import {
  Globe2,
  Search,
  Server,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Copy,
  Check,
  Info,
  Layers,
  FileText,
  Activity,
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { investigateDomain } from '../../services/api';
import {
  DomainInvestigationResponse,
  DnsRecordModel,
  DomainFindingItem,
  SoaRecordData,
} from '../../types/domainInvestigation';

interface DomainIntelligenceViewProps {
  initialDomain?: string;
  onInvestigateUrl: (url: string) => void;
}

export const DomainIntelligenceView: React.FC<DomainIntelligenceViewProps> = ({
  initialDomain = 'github.com',
  onInvestigateUrl,
}) => {
  const [domainInput, setDomainInput] = useState<string>(initialDomain);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [investigationResult, setInvestigationResult] =
    useState<DomainInvestigationResponse | null>(null);

  // Active filter tab for DNS records
  const [selectedRecordTab, setSelectedRecordTab] = useState<string>('ALL');
  const [copiedFingerprint, setCopiedFingerprint] = useState<boolean>(false);

  // Concurrency, race-condition, and unmount guards
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const handleDomainSearch = async (overrideDomain?: string) => {
    const rawTarget = overrideDomain !== undefined ? overrideDomain : domainInput;
    const target = rawTarget.trim();

    if (!target) {
      setErrorMessage('Please enter a target domain name to investigate.');
      return;
    }

    // 1. Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Increment monotonic request identifier
    const currentRequestId = ++activeRequestIdRef.current;

    // 3. Clear previous investigation results immediately to prevent stale data
    setInvestigationResult(null);
    setErrorMessage(null);
    setIsSearching(true);

    try {
      const data = await investigateDomain(target, controller.signal);

      // 4. Drop response if unmounted or if a newer request was dispatched
      if (!isMountedRef.current || currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      setInvestigationResult(data);
      setDomainInput(data.domain);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Request was aborted due to new search; ignore safely
      }
      if (isMountedRef.current && currentRequestId === activeRequestIdRef.current) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during domain investigation.';
        setErrorMessage(errorMsg);
        // setInvestigationResult is already null, preventing old results from appearing
      }
    } finally {
      if (isMountedRef.current && currentRequestId === activeRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // Perform initial investigation on mount if initialDomain is supplied
  useEffect(() => {
    isMountedRef.current = true;
    if (initialDomain) {
      handleDomainSearch(initialDomain);
    }
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialDomain]);

  const handleCopyFingerprint = (fp: string) => {
    if (!fp || fp === 'UNAVAILABLE' || fp === 'Unavailable') return;
    navigator.clipboard.writeText(fp);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  // DNS Record Filtering
  const getFilteredDnsRecords = (records: DnsRecordModel[]): DnsRecordModel[] => {
    if (selectedRecordTab === 'ALL') return records;
    if (selectedRecordTab === 'A_AAAA') {
      return records.filter((r) => r.type === 'A' || r.type === 'AAAA');
    }
    return records.filter((r) => r.type === selectedRecordTab);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return {
          badge: 'bg-emerald-950/70 border-emerald-600/80 text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'COMPLETE',
        };
      case 'PARTIAL':
        return {
          badge: 'bg-amber-950/70 border-amber-600/80 text-amber-400',
          dot: 'bg-amber-500',
          label: 'PARTIAL',
        };
      case 'FAILED':
      default:
        return {
          badge: 'bg-rose-950/70 border-rose-600/80 text-rose-400',
          dot: 'bg-rose-500',
          label: 'FAILED',
        };
    }
  };

  const getFindingSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return {
          badge: 'bg-rose-950/70 border-rose-800 text-rose-300',
          card: 'bg-rose-950/20 border-rose-900/60',
          icon: ShieldAlert,
          iconColor: 'text-rose-400',
        };
      case 'medium':
        return {
          badge: 'bg-amber-950/70 border-amber-800 text-amber-300',
          card: 'bg-amber-950/20 border-amber-900/60',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'low':
        return {
          badge: 'bg-sky-950/70 border-sky-800 text-sky-300',
          card: 'bg-sky-950/15 border-sky-900/40',
          icon: Info,
          iconColor: 'text-sky-400',
        };
      case 'info':
      default:
        return {
          badge: 'bg-slate-900 border-slate-700 text-slate-300',
          card: 'bg-black/40 border-white/10',
          icon: ShieldCheck,
          iconColor: 'text-emerald-400',
        };
    }
  };

  const RECORD_FILTER_TABS = [
    { id: 'ALL', label: 'All Records' },
    { id: 'A_AAAA', label: 'A / AAAA' },
    { id: 'CNAME', label: 'CNAME' },
    { id: 'MX', label: 'MX (Mail)' },
    { id: 'NS', label: 'NS (Nameservers)' },
    { id: 'TXT', label: 'TXT' },
    { id: 'SOA', label: 'SOA' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Module Title Header */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15 flex-shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white uppercase tracking-wide truncate">
              Module 03 // Authoritative Domain & DNS Intelligence
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-sans line-clamp-1 sm:line-clamp-none">
              Configured DNS zone querying, cryptographic TLS forensics, SPF/DMARC auditing, and deterministic evidence synthesis.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* Domain Search & Input Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
          <span>Investigate Target FQDN:</span>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDomainSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            disabled={isSearching}
            placeholder="e.g. github.com, münchen.de, or cloudflare.com"
            className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 sm:py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold text-xs uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Investigating...</span>
              </>
            ) : (
              <>
                <Globe2 className="w-4 h-4" />
                <span>Investigate Domain</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => handleDomainSearch('github.com')}
            disabled={isSearching}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            github.com (Complete)
          </button>
          <button
            type="button"
            onClick={() => handleDomainSearch('münchen.de')}
            disabled={isSearching}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            münchen.de (IDN / Punycode)
          </button>
          <button
            type="button"
            onClick={() => handleDomainSearch('nonexistent-nxdomain-telemetry-test.xyz')}
            disabled={isSearching}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            nxdomain-test.xyz (NXDOMAIN)
          </button>
        </div>
      </div>

      {/* Loading Skeleton Indicator */}
      {isSearching && (
        <div className="p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-[#FF9933] animate-spin" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Executing Domain Intelligence Orchestration
            </span>
            <p className="text-[11px] text-slate-400 font-sans max-w-md">
              Querying authoritative DNS zone records, performing cryptographic TLS handshake on port 443, and synthesizing threat evidence...
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 flex items-start justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider block text-rose-200">
                Investigation Disallowed / Failed
              </span>
              <p className="mt-1 font-mono text-[11px] text-rose-300/90 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-900/70 text-[10px] uppercase text-rose-200 border border-rose-700/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Investigation Results Display */}
      {investigationResult && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Dossier: Investigation Identity & Metadata */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    INVESTIGATION DOSSIER
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-400 text-[10px] font-mono">
                    {investigationResult.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate flex items-center gap-2">
                  <span>{investigationResult.domain}</span>
                  {investigationResult.isIdn && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/80 border border-sky-700 text-sky-300 font-normal">
                      IDN Active
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                {(() => {
                  const style = getStatusBadgeStyle(investigationResult.status);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.badge}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span>{style.label}</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* IDN Representation Card (shown when isIdn === true) */}
            {investigationResult.isIdn && (
              <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/50 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Internationalized Domain Name (IDNA2008 Dual Representation):</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase block">Unicode Display Format</span>
                    <span className="text-white font-bold">{investigationResult.unicodeDomain}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase block">Wire / DNS ASCII Punycode</span>
                    <span className="text-sky-300 font-mono">{investigationResult.normalizedDomain}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Neutral Explanation Banner for PARTIAL Status */}
            {investigationResult.status === 'PARTIAL' && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/50 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Partial Telemetry Collected: </span>
                  One of the investigation vectors returned negative or unavailable telemetry (e.g. port 443 TLS unavailable, or DNS returned NXDOMAIN/NODATA). Partial results are standard for non-web infrastructure and do not denote application error or malicious intent.
                </div>
              </div>
            )}

            {/* Parameter Summary Grid: 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">REGISTRAR</span>
                <span className="text-white font-bold truncate block">
                  {investigationResult.dnsIntelligence.registrar &&
                  investigationResult.dnsIntelligence.registrar !== 'UNAVAILABLE'
                    ? investigationResult.dnsIntelligence.registrar
                    : 'Unavailable'}
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">DOMAIN AGE</span>
                <span className="text-slate-200 font-bold block truncate">
                  {investigationResult.dnsIntelligence.ageDays >= 0
                    ? `${investigationResult.dnsIntelligence.ageDays} days`
                    : 'Unavailable'}
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">RESOLVED IP(S)</span>
                <span className="text-slate-300 font-mono truncate block">
                  {investigationResult.dnsIntelligence.ipAddress &&
                  investigationResult.dnsIntelligence.ipAddress !== 'UNAVAILABLE'
                    ? investigationResult.dnsIntelligence.ipAddress
                    : 'Unavailable'}
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">AUTONOMOUS SYSTEM</span>
                <span className="text-slate-300 truncate block">
                  {investigationResult.dnsIntelligence.asn &&
                  investigationResult.dnsIntelligence.asn !== 'UNAVAILABLE'
                    ? investigationResult.dnsIntelligence.asn
                    : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Synthesized Domain Evidence & Findings */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
                <span>Synthesized Security Evidence ({investigationResult.evidenceList.length})</span>
              </span>
              {/* Severity Counts */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {Object.entries(investigationResult.findingsSummary).map(([sev, count]) => (
                  <span
                    key={sev}
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
                  >
                    <span className="uppercase text-slate-500 mr-1">{sev}:</span>
                    <span className="font-bold text-white">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {investigationResult.evidenceList.length === 0 ? (
              <div className="p-4 rounded-lg bg-black/30 border border-white/5 text-center text-xs text-slate-400 font-sans">
                No findings were returned by the backend for this investigation.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {investigationResult.evidenceList.map((finding: DomainFindingItem, idx: number) => {
                  const style = getFindingSeverityStyle(finding.severity);
                  const IconComponent = style.icon;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-slate-300 space-y-1.5 ${style.card}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-3.5 h-3.5 flex-shrink-0 ${style.iconColor}`} />
                          <span className="font-bold text-white text-[12px]">{finding.title}</span>
                          <span className="px-1.5 py-0.2 rounded bg-black/50 border border-white/10 text-[9px] text-slate-400 font-mono">
                            {finding.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`px-2 py-0.5 rounded uppercase font-bold border ${style.badge}`}>
                            {finding.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">
                            Confidence: {finding.confidence}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300/90 leading-relaxed font-sans">
                        {finding.description}
                      </p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 border-t border-white/5">
                        <span>Source: {finding.source}</span>
                        <span>•</span>
                        <span>Category: {finding.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Authoritative DNS Zone Records & Email Authentication */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>
                  Authoritative DNS Zone Records ({investigationResult.dnsIntelligence.dnsRecords.length})
                </span>
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500 uppercase">Collection:</span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold">
                  {investigationResult.dnsIntelligence.collectionStatus}
                </span>
              </div>
            </div>

            {/* Email Authentication Safeguards (SPF & DMARC) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* SPF Summary */}
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-[11px] uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#FF9933]" />
                    <span>Sender Policy Framework (SPF)</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      investigationResult.dnsIntelligence.hasSpf
                        ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-400'
                        : 'bg-amber-950/70 border border-amber-700 text-amber-400'
                    }`}
                  >
                    {investigationResult.dnsIntelligence.hasSpf ? 'Configured' : 'Missing'}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/5 font-mono text-[10px] text-slate-300 break-all">
                  {investigationResult.dnsIntelligence.spfRecord || 'No TXT record starting with v=spf1 observed.'}
                </div>
              </div>

              {/* DMARC Summary */}
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-[11px] uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>DMARC Enforcement Policy</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      investigationResult.dnsIntelligence.hasDmarc
                        ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-400'
                        : 'bg-amber-950/70 border border-amber-700 text-amber-400'
                    }`}
                  >
                    {investigationResult.dnsIntelligence.hasDmarc
                      ? `Policy: ${investigationResult.dnsIntelligence.dmarcPolicy || 'none'}`
                      : 'Missing'}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/5 font-mono text-[10px] text-slate-300 break-all">
                  {investigationResult.dnsIntelligence.dmarcRecord || 'No _dmarc TXT record observed.'}
                </div>
              </div>
            </div>

            {/* Structured SOA Details Card (when SOA data exists and SOA tab or ALL is viewed) */}
            {investigationResult.dnsIntelligence.soa && (
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#FF9933]" />
                  <span>Start of Authority (SOA) Zone Parameters</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {(() => {
                    const soa = investigationResult.dnsIntelligence.soa as SoaRecordData;
                    return (
                      <>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Primary Master (MNAME)</span>
                          <span className="text-white font-mono truncate block">{soa.mname || 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Hostmaster (RNAME)</span>
                          <span className="text-white font-mono truncate block">{soa.rname || 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Zone Serial</span>
                          <span className="text-slate-200 font-mono block">{soa.serial != null ? soa.serial : 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Refresh Interval</span>
                          <span className="text-slate-300 block">{soa.refresh != null ? `${soa.refresh}s` : 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Retry Interval</span>
                          <span className="text-slate-300 block">{soa.retry != null ? `${soa.retry}s` : 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Expire Limit</span>
                          <span className="text-slate-300 block">{soa.expire != null ? `${soa.expire}s` : 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Minimum TTL</span>
                          <span className="text-slate-300 block">{soa.minimum != null ? `${soa.minimum}s` : 'Unavailable'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/50 border border-white/5">
                          <span className="text-[9px] text-slate-500 uppercase block">Zone TTL</span>
                          <span className="text-slate-300 block">{soa.ttl != null ? `${soa.ttl}s` : 'Unavailable'}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Record Filter Tabs (including CNAME, SOA, A/AAAA, MX, NS, TXT) */}
            <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-white/10 text-xs">
              <span className="text-[10px] text-slate-500 uppercase mr-1">Filter Records:</span>
              {RECORD_FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRecordTab(tab.id)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    selectedRecordTab === tab.id
                      ? 'bg-[#FF9933] text-black font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* DNS Records Table */}
            {(() => {
              const records = getFilteredDnsRecords(
                investigationResult.dnsIntelligence.dnsRecords
              );

              if (records.length === 0) {
                return (
                  <div className="py-6 px-4 rounded-lg bg-black/30 border border-white/5 text-center text-xs text-slate-400 italic">
                    No {selectedRecordTab === 'ALL' ? '' : selectedRecordTab} DNS records published or returned for this domain.
                  </div>
                );
              }

              return (
                <div>
                  {/* Mobile Cards (< sm) */}
                  <div className="sm:hidden space-y-2">
                    {records.map((rec, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1 text-xs"
                      >
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
                            Observation: {rec.flag}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (sm:) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Resolved Target / Value</th>
                          <th className="py-2 px-3">TTL</th>
                          <th className="py-2 px-3">Observation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[11px]">
                        {records.map((rec, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px]">
                                {rec.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-white max-w-md break-all">
                              {rec.value}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                              {rec.ttl}s
                            </td>
                            <td className="py-2.5 px-3 text-amber-300">
                              {rec.flag || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 3: Cryptographic TLS Certificate Forensics */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Port 443 TLS Certificate Forensics</span>
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500 uppercase">Validity Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    investigationResult.tlsIntelligence.validityStatus === 'ACTIVE'
                      ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-400'
                      : investigationResult.tlsIntelligence.validityStatus === 'EXPIRED'
                      ? 'bg-rose-950/70 border border-rose-700 text-rose-400'
                      : investigationResult.tlsIntelligence.validityStatus === 'UNAVAILABLE'
                      ? 'bg-slate-900 border border-slate-700 text-slate-400'
                      : 'bg-amber-950/70 border border-amber-700 text-amber-400'
                  }`}
                >
                  {investigationResult.tlsIntelligence.validityStatus || 'Unavailable'}
                </span>
              </div>
            </div>

            {investigationResult.tlsIntelligence.validityStatus === 'UNAVAILABLE' ? (
              <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Unlock className="w-4 h-4 text-slate-500" />
                  <span>Port 443 TLS Telemetry Unavailable</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                  The host did not respond with a TLS handshake on HTTPS port 443 (connection refused, timed out, or unresolvable). Non-web endpoints (such as email servers, DNS relays, or backend APIs) frequently do not serve web certificates on port 443. This is neutral technical telemetry, not an indicator of malice.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Certificate Parameters Grid with Neutral Fallbacks for Missing Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {/* Subject */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">CERTIFICATE SUBJECT</span>
                    <span className="text-white font-mono text-[11px] break-all block">
                      {investigationResult.tlsIntelligence.subject &&
                      investigationResult.tlsIntelligence.subject !== 'UNAVAILABLE'
                        ? investigationResult.tlsIntelligence.subject
                        : 'Unavailable'}
                    </span>
                  </div>

                  {/* Issuer */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">ISSUING AUTHORITY (CA)</span>
                    <span className="text-white font-mono text-[11px] break-all block">
                      {investigationResult.tlsIntelligence.issuer &&
                      investigationResult.tlsIntelligence.issuer !== 'UNAVAILABLE'
                        ? investigationResult.tlsIntelligence.issuer
                        : 'Unavailable'}
                    </span>
                  </div>

                  {/* Protocol & Cipher Suite */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">CIPHER SUITE & PROTOCOL</span>
                    <span className="text-emerald-400 font-mono text-[11px] block">
                      {investigationResult.tlsIntelligence.protocol &&
                      investigationResult.tlsIntelligence.protocol !== 'UNAVAILABLE' &&
                      investigationResult.tlsIntelligence.protocol !== 'UNKNOWN'
                        ? investigationResult.tlsIntelligence.protocol
                        : 'Unavailable'}
                      {' // '}
                      {investigationResult.tlsIntelligence.cipherSuite &&
                      investigationResult.tlsIntelligence.cipherSuite !== 'UNAVAILABLE' &&
                      investigationResult.tlsIntelligence.cipherSuite !== 'UNKNOWN'
                        ? investigationResult.tlsIntelligence.cipherSuite
                        : 'Unavailable'}
                    </span>
                  </div>

                  {/* Lifecycle Validity Dates & Days Remaining */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">LIFECYCLE VALIDITY</span>
                    <span className="text-white text-[11px] block">
                      {investigationResult.tlsIntelligence.validFrom &&
                      investigationResult.tlsIntelligence.validFrom !== 'UNAVAILABLE' &&
                      investigationResult.tlsIntelligence.validTo &&
                      investigationResult.tlsIntelligence.validTo !== 'UNAVAILABLE'
                        ? `${investigationResult.tlsIntelligence.validFrom} to ${investigationResult.tlsIntelligence.validTo}`
                        : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Remaining:{' '}
                      {investigationResult.tlsIntelligence.daysRemaining != null &&
                      investigationResult.tlsIntelligence.validityStatus !== 'UNAVAILABLE'
                        ? `${investigationResult.tlsIntelligence.daysRemaining} days`
                        : 'Unavailable'}
                      {investigationResult.tlsIntelligence.totalDays > 0
                        ? ` (Total: ${investigationResult.tlsIntelligence.totalDays}d)`
                        : ''}
                    </span>
                  </div>

                  {/* Key Strength & Signature Algorithm */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">KEY STRENGTH & ALGORITHM</span>
                    <span className="text-white text-[11px] block">
                      {investigationResult.tlsIntelligence.keyStrength &&
                      investigationResult.tlsIntelligence.keyStrength !== 'UNAVAILABLE'
                        ? `${
                            investigationResult.tlsIntelligence.publicKeyBits > 0
                              ? `${investigationResult.tlsIntelligence.publicKeyBits} bits (`
                              : ''
                          }${investigationResult.tlsIntelligence.keyStrength}${
                            investigationResult.tlsIntelligence.publicKeyBits > 0 ? ')' : ''
                          }`
                        : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {investigationResult.tlsIntelligence.signatureAlgorithm &&
                      investigationResult.tlsIntelligence.signatureAlgorithm !== 'UNAVAILABLE' &&
                      investigationResult.tlsIntelligence.signatureAlgorithm !== 'UNKNOWN'
                        ? investigationResult.tlsIntelligence.signatureAlgorithm
                        : 'Unavailable'}
                    </span>
                  </div>

                  {/* Chain & Hostname Verification */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">CHAIN & HOSTNAME VERIFICATION</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-slate-200 font-bold">
                        Chain:{' '}
                        {investigationResult.tlsIntelligence.chainVerificationStatus &&
                        investigationResult.tlsIntelligence.chainVerificationStatus !== 'UNAVAILABLE'
                          ? investigationResult.tlsIntelligence.chainVerificationStatus
                          : 'Unavailable'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-slate-200 font-bold">
                        Host:{' '}
                        {investigationResult.tlsIntelligence.hostnameVerificationStatus &&
                        investigationResult.tlsIntelligence.hostnameVerificationStatus !== 'UNAVAILABLE'
                          ? investigationResult.tlsIntelligence.hostnameVerificationStatus
                          : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SHA-256 Fingerprint */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase">
                      SHA-256 Certificate Fingerprint
                    </span>
                    {investigationResult.tlsIntelligence.sha256Fingerprint &&
                      investigationResult.tlsIntelligence.sha256Fingerprint !== 'UNAVAILABLE' &&
                      investigationResult.tlsIntelligence.sha256Fingerprint !== 'Unavailable' && (
                        <button
                          onClick={() =>
                            handleCopyFingerprint(
                              investigationResult.tlsIntelligence.sha256Fingerprint
                            )
                          }
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedFingerprint ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                  </div>
                  <div className="font-mono text-[10px] text-slate-300 break-all select-all">
                    {investigationResult.tlsIntelligence.sha256Fingerprint &&
                    investigationResult.tlsIntelligence.sha256Fingerprint !== 'UNAVAILABLE'
                      ? investigationResult.tlsIntelligence.sha256Fingerprint
                      : 'Unavailable'}
                  </div>
                </div>

                {/* Subject Alternative Names (SANs) */}
                <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                  <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">
                    Subject Alternative Names (
                    {investigationResult.tlsIntelligence.sanList
                      ? investigationResult.tlsIntelligence.sanList.length
                      : 0}
                    )
                  </span>
                  {investigationResult.tlsIntelligence.sanList &&
                  investigationResult.tlsIntelligence.sanList.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {investigationResult.tlsIntelligence.sanList.map((san, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300"
                        >
                          {san}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">
                      No Subject Alternative Names published.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
