import React, { useState } from 'react';
import {
  Lock,
  Search,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Clock,
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
            'Domain Validation only (DV): Zero organizational identity verification.',
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
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Module Title */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15 flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-white uppercase tracking-wide truncate">
              Module 04 // TLS & Digital Certificate Intelligence
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-sans line-clamp-1 sm:line-clamp-none">
              Socket-level X.509 certificate inspection, CA auditing, and Certificate Transparency.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* Target Domain Input Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
          <span>Inspect Destination TLS Socket:</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="e.g. onlinesbi.sbi or sbi-kyc-verify-portal.in"
            className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933]"
          />
          <button
            onClick={() => handleAudit()}
            disabled={isAuditing}
            className="px-5 py-2.5 sm:py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold text-xs uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
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
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
          >
            sbi-kyc-verify-portal.in (DV Phish)
          </button>
          <button
            onClick={() => handleAudit('onlinesbi.sbi')}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white active:scale-95 transition-transform"
          >
            onlinesbi.sbi (EV Clean)
          </button>
        </div>
      </div>

      {/* Core Certificate Grid: 2 cols on mobile, 4 on desktop */}
      {tlsData && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">1. X.509 VALIDITY</span>
              <span className="text-emerald-400 font-bold text-xs sm:text-sm block">VALID</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">{tlsData.domain}</span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">2. ISSUER TYPE</span>
              <span className={`font-bold text-xs sm:text-sm block truncate ${tlsData.validationType === 'EV' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {tlsData.validationType} ({tlsData.validationType === 'EV' ? 'EV' : 'DV'})
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">{tlsData.issuer}</span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">3. PROTOCOL</span>
              <span className="text-white font-bold text-xs sm:text-sm block truncate">{tlsData.protocol}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">{tlsData.cipherSuite}</span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">4. KEY STRENGTH</span>
              <span className="text-emerald-400 font-bold text-xs sm:text-sm block truncate">
                {tlsData.keyStrength} ({tlsData.publicKeyBits}b)
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">{tlsData.signatureAlgorithm}</span>
            </div>
          </div>

          {/* Expiration Timeline Progress Bar */}
          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Certificate Expiration Lifecycle</span>
              </span>
              <div className="text-[11px] sm:text-xs text-slate-400">
                Expires: <strong className="text-white">{tlsData.validTo}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="text-slate-400">Elapsed: {percentElapsed}%</span>
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
            <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
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
            <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Observed Cryptographic Warnings</span>
              </span>
              {tlsData.warnings.length > 0 ? (
                <div className="space-y-2">
                  {tlsData.warnings.map((w, i) => (
                    <div key={i} className="p-2.5 rounded bg-amber-950/20 border border-amber-900/60 text-amber-300 text-xs leading-snug">
                      {w}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
