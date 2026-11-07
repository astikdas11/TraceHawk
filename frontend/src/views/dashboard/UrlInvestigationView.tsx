import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Layers,
  Database,
  Loader2
} from 'lucide-react';
import { RiskBadge } from '../../components/common/RiskBadge';
import { DemoBanner } from '../../components/common/DemoBanner';
import { ThreatEvidencePanel } from '../../components/common/ThreatEvidencePanel';
import { SAMPLE_INVESTIGATIONS } from '../../data/sampleInvestigations';
import { RiskLevel, ThreatEvidence } from '../../types';

interface UrlInvestigationViewProps {
  initialUrl?: string;
  onNavigateToTls?: (domain: string) => void;
}

export const UrlInvestigationView: React.FC<UrlInvestigationViewProps> = ({
  initialUrl = 'http://sbi-kyc-verify-portal.in',
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active investigation result state
  const [activeResult, setActiveResult] = useState<{
    id: string;
    url: string;
    normalisedUrl: string;
    domain: string;
    ipAddress: string;
    asn: string;
    country: string;
    riskLevel: RiskLevel;
    riskScore: number;
    category: string;
    shannonEntropy: number;
    subdomainDepth: number;
    isPunycode: boolean;
    isIpHosname: boolean;
    tlsStatus: string;
    tlsIssuer: string;
    tlsDaysRemaining: number;
    redirectCount: number;
    threatMatches: string[];
    evidenceList: ThreatEvidence[];
    explanation: string;
  }>({
    id: 'TH-INV-98214',
    url: 'http://sbi-kyc-verify-portal.in',
    normalisedUrl: 'sbi-kyc-verify-portal.in',
    domain: 'sbi-kyc-verify-portal.in',
    ipAddress: '104.21.72.193 (Cloudflare Proxy)',
    asn: 'AS13335 (Cloudflare, Inc.)',
    country: 'United States',
    riskLevel: 'CONFIRMED_MALICIOUS',
    riskScore: 97,
    category: 'Banking Impersonation & Phishing Credential Harvest',
    shannonEntropy: 4.18,
    subdomainDepth: 2,
    isPunycode: false,
    isIpHosname: false,
    tlsStatus: 'Ephemeral DV (Automated ACME)',
    tlsIssuer: "Let's Encrypt Authority E6",
    tlsDaysRemaining: 14,
    redirectCount: 1,
    threatMatches: [
      'URLhaus Live Abuse Repository (#8492019)',
      'PhishTank Community Feed (#8491028)',
      'PhiUSIIL High Deceptive Vector Match',
    ],
    evidenceList: SAMPLE_INVESTIGATIONS[0].indicators,
    explanation:
      'The investigated URL demonstrates empirical markers of deceptive banking impersonation. It targets customers of State Bank of India using an unauthenticated domain. The host presents an ephemeral 14-day certificate and is indexed on URLhaus and PhishTank active phishing feeds.',
  });

  const validateUrl = (str: string): boolean => {
    if (!str.trim()) {
      setValidationError('Please enter a target URL or domain name.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleAnalyze = (targetOverride?: string) => {
    const target = (targetOverride || urlInput).trim();
    if (!validateUrl(target)) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      if (target.includes('onlinesbi.sbi') || target.includes('sbi.co.in')) {
        setActiveResult({
          id: 'TH-INV-98215',
          url: target,
          normalisedUrl: 'onlinesbi.sbi',
          domain: 'onlinesbi.sbi',
          ipAddress: '121.240.66.195',
          asn: 'AS4758 (NIC / Sovereign SBI)',
          country: 'India',
          riskLevel: 'LOW_RISK',
          riskScore: 4,
          category: 'Verified Sovereign Banking Infrastructure',
          shannonEntropy: 2.84,
          subdomainDepth: 1,
          isPunycode: false,
          isIpHosname: false,
          tlsStatus: 'Extended Validation (EV) Verified',
          tlsIssuer: 'DigiCert Global Root G2 / NIC CA',
          tlsDaysRemaining: 312,
          redirectCount: 0,
          threatMatches: [],
          evidenceList: SAMPLE_INVESTIGATIONS[1].indicators,
          explanation:
            'Target is verified as the official digital banking infrastructure of State Bank of India. Backed by DigiCert Extended Validation (EV) certificate, sovereign Indian ASN routing, and clean threat intelligence history.',
        });
      } else if (target.includes('electricity') || target.includes('bill')) {
        setActiveResult({
          id: 'TH-INV-98216',
          url: target,
          normalisedUrl: 'electricity-bill-pay-portal.online',
          domain: 'electricity-bill-pay-portal.online',
          ipAddress: '198.54.117.200',
          asn: 'AS22612 (Namecheap Public Hosting)',
          country: 'United States',
          riskLevel: 'CONFIRMED_MALICIOUS',
          riskScore: 92,
          category: 'Utility Cut-off Panic Extortion',
          shannonEntropy: 4.45,
          subdomainDepth: 3,
          isPunycode: false,
          isIpHosname: false,
          tlsStatus: 'cPanel Automated DV Certificate',
          tlsIssuer: 'cPanel, Inc. Certification Authority',
          tlsDaysRemaining: 22,
          redirectCount: 0,
          threatMatches: ['URLhaus Abuse Stream (#8492020)'],
          evidenceList: SAMPLE_INVESTIGATIONS[2].indicators,
          explanation:
            'Domain was registered recently (4 days ago) and is utilized in urgent SMS panic scams claiming imminent electricity disconnection. Hosts an unauthenticated payment phishing form.',
        });
      } else {
        const isSecure = target.startsWith('https://');
        setActiveResult({
          id: `TH-INV-${Math.floor(10000 + Math.random() * 90000)}`,
          url: target,
          normalisedUrl: target.replace(/^https?:\/\//, ''),
          domain: target.replace(/^https?:\/\//, '').split('/')[0],
          ipAddress: '172.67.142.99',
          asn: 'AS13335 (Cloudflare, Inc.)',
          country: 'Unknown (CDN Origin Masked)',
          riskLevel: 'SUSPICIOUS',
          riskScore: 68,
          category: 'Unverified Third-Party Digital Property',
          shannonEntropy: 3.92,
          subdomainDepth: 2,
          isPunycode: target.includes('xn--'),
          isIpHosname: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(target),
          tlsStatus: isSecure ? 'Domain Validation (DV)' : 'Unencrypted HTTP (Plaintext)',
          tlsIssuer: isSecure ? "Let's Encrypt Authority" : 'None',
          tlsDaysRemaining: isSecure ? 45 : 0,
          redirectCount: 1,
          threatMatches: ['PhiUSIIL Elevated Lexical Entropy Marker'],
          evidenceList: [
            {
              id: 'IND-GEN-01',
              title: 'Elevated Syntactic Entropy',
              category: 'Lexical Anomaly',
              severity: 'suspicious',
              evidence: `Calculated Shannon entropy of 3.92 exceeds baseline legitimate threshold (3.1).`,
              source: 'Lexical Analysis Engine',
              confidence: 'High',
            },
          ],
          explanation:
            'The evaluated URL exhibits syntactic characteristics frequently correlated with automated link generation. No active threat-feed blocks were identified, but caution is advised.',
        });
      }
      setUrlInput(target);
    }, 700);
  };

  const handleClear = () => {
    setUrlInput('');
    setValidationError(null);
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
              Lexical analysis, DNS resolution, SSL/TLS, and threat-intelligence correlation.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* URL Input Form Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3 sm:space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex flex-col xs:flex-row xs:items-center justify-between gap-1">
            <span>Target URL or Domain to Investigate:</span>
            <span className="text-[10px] text-slate-500 font-normal">HTTP / HTTPS / FQDN</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. http://sbi-kyc-verify-portal.in"
              className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933] transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAnalyze()}
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
                onClick={handleClear}
                className="px-3.5 py-2.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs uppercase transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
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
              onClick={() => handleAnalyze('http://sbi-kyc-verify-portal.in')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
            >
              SBI KYC (Phish)
            </button>
            <button
              onClick={() => handleAnalyze('http://electricity-bill-pay-portal.online')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
            >
              Electricity Bill (Extortion)
            </button>
            <button
              onClick={() => handleAnalyze('https://onlinesbi.sbi')}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
            >
              onlinesbi.sbi (Clean)
            </button>
          </div>
        </div>
      </div>

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
                <span className="text-slate-300 truncate block">{activeResult.asn}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">SHANNON ENTROPY</span>
                <span className="text-amber-400 font-bold block">{activeResult.shannonEntropy} bits</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-black/40 border border-white/10 space-y-0.5 min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">TLS VALIDITY</span>
                <span className="text-rose-400 font-bold block truncate">{activeResult.tlsStatus}</span>
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
                  <span className="text-slate-300 font-bold">{activeResult.redirectCount} hops</span>
                </div>
              </div>
            </div>

            {/* Threat Feed Matches (6 cols) */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Threat Feed Matches ({activeResult.threatMatches.length})</span>
              </span>

              {activeResult.threatMatches.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {activeResult.threatMatches.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 sm:p-2.5 rounded bg-rose-950/20 border border-rose-900/60 text-rose-300 flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2"
                    >
                      <span className="font-bold truncate text-[11px] sm:text-xs">{m}</span>
                      <span className="self-start xs:self-auto text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 uppercase flex-shrink-0">
                        Listed IOC
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 italic">
                  Zero hostile listings cataloged across active threat feeds.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Corroborated Evidence Panel */}
          <ThreatEvidencePanel evidenceList={activeResult.evidenceList} />
        </div>
      )}
    </div>
  );
};
