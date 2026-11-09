import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Shield,
  AlertTriangle,
  Layers,
  Database,
  Loader2,
} from 'lucide-react';
import { RiskBadge } from '../../components/common/RiskBadge';
import { DemoBanner } from '../../components/common/DemoBanner';
import { ThreatEvidencePanel } from '../../components/common/ThreatEvidencePanel';
import { RiskLevel, ThreatEvidence } from '../../types';
import { investigateUrl } from '../../services/api';

interface UrlInvestigationViewProps {
  initialUrl?: string;
  onNavigateToTls?: (domain: string) => void;
}

interface ActiveResultState {
  id: string;
  url: string;
  normalisedUrl: string;
  domain: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskLabel?: string;
  category: string;
  shannonEntropy: number;
  subdomainDepth: number;
  isPunycode: boolean;
  isIpHosname: boolean;
  evidenceList: ThreatEvidence[];
  explanation: string;
  warnings: string[];
  isLive: boolean;
}

export const UrlInvestigationView: React.FC<UrlInvestigationViewProps> = ({
  initialUrl = 'http://sbi-kyc-verify-portal.in',
  onNavigateToTls,
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLiveResult, setIsLiveResult] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<ActiveResultState | null>(null);

  // Concurrency, race-condition, and unmount guards
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const validateUrl = (str: string): boolean => {
    if (!str.trim()) {
      setValidationError('Please enter a target URL or domain name.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleAnalyze = async (targetOverride?: string) => {
    const rawTarget = targetOverride !== undefined ? targetOverride : urlInput;
    const target = rawTarget.trim();
    if (!validateUrl(target)) return;

    // 1. Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Increment monotonic request identifier to prevent race conditions
    const currentRequestId = ++activeRequestIdRef.current;

    setIsAnalyzing(true);
    setValidationError(null);
    if (targetOverride !== undefined) {
      setUrlInput(target);
    }

    try {
      const data = await investigateUrl(target, 'standard', controller.signal);

      // 3. Drop response if unmounted or if a newer request was dispatched
      if (!isMountedRef.current || currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      // 4. Map verified backend response fields strictly without fabrication
      setActiveResult({
        id: data.id,
        url: data.url,
        normalisedUrl: data.normalisedUrl || data.normalized_url,
        domain: data.domain,
        riskLevel: data.riskLevel as RiskLevel,
        riskScore: data.riskScore,
        riskLabel: data.riskLabel || data.risk_label,
        category: data.category,
        shannonEntropy: data.shannonEntropy,
        subdomainDepth: data.subdomainDepth,
        isPunycode: data.isPunycode,
        isIpHosname: data.isIpHosname,
        evidenceList: (data.evidenceList || []).map((ev) => ({
          id: ev.id,
          title: ev.title,
          category: ev.category,
          severity: (ev.severity?.toLowerCase() === 'confirmed_malicious'
            ? 'confirmed_malicious'
            : ev.severity?.toLowerCase() === 'high_risk'
            ? 'high_risk'
            : ev.severity?.toLowerCase() === 'suspicious'
            ? 'suspicious'
            : 'low') as ThreatEvidence['severity'],
          evidence: ev.evidence,
          source: ev.source,
          confidence: ev.confidence,
        })),
        explanation: data.explanation,
        warnings: data.warnings || [],
        isLive: true,
      });
      setIsLiveResult(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Request was aborted due to new search; ignore safely
      }
      if (isMountedRef.current && currentRequestId === activeRequestIdRef.current) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during URL investigation.';
        setValidationError(errorMsg);
      }
    } finally {
      if (isMountedRef.current && currentRequestId === activeRequestIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  // Trigger initial live investigation on mount if initialUrl is provided
  useEffect(() => {
    isMountedRef.current = true;
    if (initialUrl) {
      handleAnalyze(initialUrl);
    }
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialUrl]);

  const handleClear = () => {
    setUrlInput('');
    setValidationError(null);
    setActiveResult(null);
    setIsLiveResult(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Module Title */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15 flex-shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white uppercase tracking-wide truncate">
              Module 01 // Intelligent URL & Domain Forensics
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-sans line-clamp-1 sm:line-clamp-none">
              Lexical analysis, canonical Tier 1 feature extraction, and frozen ML inference.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Status Banner */}
      <DemoBanner isLiveInference={isLiveResult} />

      {/* URL Input Form Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex flex-col xs:flex-row xs:items-center justify-between gap-1">
            <span>Target URL or Domain to Investigate:</span>
            <span className="text-[10px] text-slate-500 font-normal">HTTP / HTTPS / FQDN</span>
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setValidationError(null);
              }}
              disabled={isAnalyzing}
              placeholder="e.g. http://sbi-kyc-verify-portal.in"
              className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933] transition-colors disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-[#FF9933]/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyse URL</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isAnalyzing}
                className="px-3.5 py-2.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs uppercase transition-colors cursor-pointer disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </form>
          {validationError && (
            <p className="text-rose-400 text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        {/* Quick Benchmark Preset Buttons */}
        <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Benchmark Presets:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => handleAnalyze('http://sbi-kyc-verify-portal.in')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
            >
              SBI KYC (Phish)
            </button>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => handleAnalyze('http://electricity-bill-pay-portal.online')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
            >
              Electricity Bill (Extortion)
            </button>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => handleAnalyze('https://onlinesbi.sbi')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
            >
              onlinesbi.sbi (Clean)
            </button>
          </div>
        </div>
      </div>

      {/* Loading State Skeleton */}
      {isAnalyzing && (
        <div className="p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-[#FF9933] animate-spin" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Executing Production ML URL Forensics
            </span>
            <p className="text-[11px] text-slate-400 font-sans max-w-md">
              Extracting 19 canonical Tier 1 lexical features and evaluating against the frozen Random Forest classifier...
            </p>
          </div>
        </div>
      )}

      {/* Empty State Prompt */}
      {!activeResult && !isAnalyzing && (
        <div className="p-8 sm:p-12 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-center space-y-2 font-mono">
          <Shield className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">
            Enter a target URL or domain above and click <span className="text-[#FF9933] font-bold">"Analyse URL"</span>, or choose a benchmark preset.
          </p>
          <p className="text-[10px] text-slate-500">
            Evaluates lexical features against the frozen Tier 1 production ML model with calibrated decision thresholds.
          </p>
        </div>
      )}

      {/* Forensic Results Workspace */}
      {activeResult && (
        <div className="space-y-4 sm:space-y-6">
          {/* Card 1: Executive Verdict & Classification */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider block">
                  INVESTIGATION AUDIT // {activeResult.id}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase mt-0.5 truncate">
                  {activeResult.category}
                </h3>
              </div>
              <div className="self-start xs:self-auto flex-shrink-0">
                <RiskBadge level={activeResult.riskLevel} score={activeResult.riskScore} size="md" />
              </div>
            </div>

            {/* AI Forensic Explanation */}
            <div className="p-3 sm:p-3.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 font-sans leading-relaxed">
              <strong className="font-mono text-[#FF9933] block text-[11px] uppercase pb-1">
                Forensic Investigation Summary:
              </strong>
              {activeResult.explanation}
            </div>

            {/* Core Technical Parameter Grid: 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs">
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">TARGET DOMAIN</span>
                <span className="text-white font-bold truncate block">{activeResult.domain}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">RESOLVED ASN</span>
                <span className="text-slate-400 italic truncate block">Not available from this investigation</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">SHANNON ENTROPY</span>
                <span className="text-amber-400 font-bold block">{activeResult.shannonEntropy} bits</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">TLS VALIDITY</span>
                <span className="text-slate-400 italic truncate block">Not available from this investigation</span>
              </div>
            </div>
          </div>

          {/* Card 2: Technical Indicators & Threat Feed Correlation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Syntactic & Lexical Indicators (6 cols) */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>URL Syntactic & Lexical Markers</span>
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 sm:p-2.5 rounded bg-white/5 border border-white/10">
                  <span className="text-slate-400">Punycode / Homoglyph:</span>
                  <span className={activeResult.isPunycode ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {activeResult.isPunycode ? 'DETECTED (Spoof Risk)' : 'Standard ASCII'}
                  </span>
                </div>
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 sm:p-2.5 rounded bg-white/5 border border-white/10">
                  <span className="text-slate-400">Raw IP Hostname:</span>
                  <span className={activeResult.isIpHosname ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {activeResult.isIpHosname ? 'YES (Evasion)' : 'No (FQDN Resolved)'}
                  </span>
                </div>
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 sm:p-2.5 rounded bg-white/5 border border-white/10">
                  <span className="text-slate-400">Subdomain Depth:</span>
                  <span className="text-slate-300 font-bold">{activeResult.subdomainDepth} levels</span>
                </div>
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 sm:p-2.5 rounded bg-white/5 border border-white/10">
                  <span className="text-slate-400">Redirect Hops:</span>
                  <span className="text-slate-400 italic">Not available from this investigation</span>
                </div>
              </div>
            </div>

            {/* Threat Feed & Model Advisories (6 cols) */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Threat Feed & Model Advisories</span>
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2 sm:p-2.5 rounded bg-white/5 border border-white/10">
                  <span className="text-slate-400">Threat Feed Matches:</span>
                  <span className="text-slate-400 italic">Not available from this investigation</span>
                </div>

                {activeResult.warnings && activeResult.warnings.length > 0 ? (
                  activeResult.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="p-2 sm:p-2.5 rounded bg-amber-950/20 border border-amber-900/60 text-amber-300 text-xs flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] sm:text-xs leading-relaxed">{warning}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 italic">
                    No operational advisories recorded for this artifact.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Corroborated Evidence Panel */}
          <ThreatEvidencePanel evidenceList={activeResult.evidenceList} />
        </div>
      )}
    </div>
  );
};
