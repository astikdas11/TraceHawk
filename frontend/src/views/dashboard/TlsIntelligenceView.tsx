import React, { useState } from 'react';
import {
  Lock,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Clock,
  Layers,
  History,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { MOCK_TLS_RECORDS } from '../../data/mockDnsTlsData';
import { TlsAnalysisRecord } from '../../types';

interface TlsIntelligenceViewProps {
  initialDomain?: string;
  onInvestigateUrl: (url: string) => void;
}

export const TlsIntelligenceView: React.FC<TlsIntelligenceViewProps> = ({
  initialDomain = 'sbi-kyc-verify-portal.in',
  onInvestigateUrl,
}) => {
  const [domainInput, setDomainInput] = useState(initialDomain);
  const [isAuditing, setIsAuditing] = useState(false);
  const [tlsData, setTlsData] = useState<TlsAnalysisRecord>(
    MOCK_TLS_RECORDS['sbi-kyc-verify-portal.in'] || MOCK_TLS_RECORDS['onlinesbi.sbi']
  );

  const handleAudit = (overrideDomain?: string) => {
    const target = (overrideDomain || domainInput).trim();
    if (!target) return;

    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);

      if (target.includes('onlinesbi.sbi') || target.includes('sbi.co.in')) {
        setTlsData(MOCK_TLS_RECORDS['onlinesbi.sbi']);
      } else {
        setTlsData({
          domain: target,
          validityStatus: 'ACTIVE',
          issuer: "Let's Encrypt Authority E6",
          issuerOrg: 'Let’s Encrypt',
          validationType: 'DV',
          validFrom: '2026-08-25',
          validTo: '2026-11-23',
          daysRemaining: 14,
          totalDays: 90,
          protocol: 'TLSv1.3',
          cipherSuite: 'TLS_AES_128_GCM_SHA256 (ECDHE-RSA)',
          signatureAlgorithm: 'sha256WithRSAEncryption',
          publicKeyBits: 2048,
          keyStrength: 'ACCEPTABLE',
          hostnameMatch: true,
          sanList: [target],
          ocspStapled: false,
          sctCount: 2,
          warnings: [
            'Ephemeral certificate: Remaining validity < 30 days (14 days remaining).',
            'Domain Validation only (DV): Zero organizational or corporate identity verification.',
          ],
        });
      }
      setDomainInput(target);
    }, 600);
  };

  const percentElapsed = Math.min(
    100,
    Math.max(0, Math.round(((tlsData.totalDays - tlsData.daysRemaining) / tlsData.totalDays) * 100))
  );

  return (
    <div className="space-y-6 text-left font-mono">
      {/* Module Title */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Module 04 // TLS & Digital Certificate Intelligence
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Socket-level X.509 ASN.1 certificate inspection, issuing Certificate Authority auditing, and Certificate Transparency (RFC 6962).
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* Target Domain Input Card */}
      <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#FF9933]" />
          <span>Inspect Destination TLS Socket:</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="e.g. onlinesbi.sbi or sbi-kyc-verify-portal.in"
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933]"
          />
          <button
            onClick={() => handleAudit()}
            disabled={isAuditing}
            className="px-6 py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold text-xs uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {isAuditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Handshaking...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Audit TLS Certificate</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase mr-1">Presets:</span>
          <button
            onClick={() => handleAudit('sbi-kyc-verify-portal.in')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white"
          >
            sbi-kyc-verify-portal.in (Ephemeral DV Phish)
          </button>
          <button
            onClick={() => handleAudit('onlinesbi.sbi')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white"
          >
            onlinesbi.sbi (Extended Validation Clean)
          </button>
        </div>
      </div>

      {/* Core Certificate Grid */}
      {tlsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block">1. X.509 VALIDITY</span>
              <span className="text-emerald-400 font-bold text-sm block">ACTIVE & VALID</span>
              <span className="text-[11px] text-slate-400">{tlsData.domain}</span>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block">2. ISSUER VALIDATION</span>
              <span className={`font-bold text-sm block ${tlsData.validationType === 'EV' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {tlsData.validationType} ({tlsData.validationType === 'EV' ? 'Extended Validation' : 'Domain Validation'})
              </span>
              <span className="text-[11px] text-slate-400 truncate block">{tlsData.issuer}</span>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block">3. PROTOCOL & CIPHER</span>
              <span className="text-white font-bold text-sm block">{tlsData.protocol}</span>
              <span className="text-[11px] text-slate-400 truncate block">{tlsData.cipherSuite}</span>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block">4. KEY STRENGTH</span>
              <span className="text-emerald-400 font-bold text-sm block">
                {tlsData.keyStrength} ({tlsData.publicKeyBits}-bit)
              </span>
              <span className="text-[11px] text-slate-400">{tlsData.signatureAlgorithm}</span>
            </div>
          </div>

          {/* Expiration Timeline Progress Bar */}
          <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Certificate Expiration Lifecycle Monitoring</span>
              </span>
              <div className="text-xs text-slate-400">
                Expires on: <strong className="text-white">{tlsData.validTo}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Elapsed: {percentElapsed}% of lifespan</span>
                <span className={`font-bold ${tlsData.daysRemaining < 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {tlsData.daysRemaining} days remaining
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    tlsData.daysRemaining < 30 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentElapsed}%` }}
                />
              </div>
            </div>
          </div>

          {/* Subject Alternative Names & Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* SANs */}
            <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Subject Alternative Names (SANs)</span>
              </span>
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1 max-h-36 overflow-y-auto">
                {tlsData.sanList.map((san, i) => (
                  <div key={i} className="text-slate-300 font-mono text-[11px] truncate">
                    • {san}
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings or Validations */}
            <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Observed Cryptographic Warnings</span>
              </span>
              {tlsData.warnings.length > 0 ? (
                <div className="space-y-2">
                  {tlsData.warnings.map((w, i) => (
                    <div key={i} className="p-2.5 rounded bg-amber-950/20 border border-amber-900/60 text-amber-300 text-xs">
                      {w}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No cryptographic anomalies or ephemeral risks detected.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

