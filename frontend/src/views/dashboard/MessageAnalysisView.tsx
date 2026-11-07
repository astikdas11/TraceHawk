import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Shield,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  Building,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { RiskBadge } from '../../components/common/RiskBadge';
import { ThreatEvidencePanel } from '../../components/common/ThreatEvidencePanel';
import { RiskLevel, ThreatEvidence } from '../../types';

interface MessageAnalysisViewProps {
  onInvestigateUrl: (url: string) => void;
}

export const MessageAnalysisView: React.FC<MessageAnalysisViewProps> = ({
  onInvestigateUrl,
}) => {
  const [messageText, setMessageText] = useState(
    'Dear SBI User, your YONO mobile banking access has been suspended today due to pending PAN KYC. Update immediately within 24 hours at http://sbi-kyc-verify-portal.in to avoid ₹5,000 penalty.'
  );
  const [senderInfo, setSenderInfo] = useState('VM-SBIBNK');
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [auditResult, setAuditResult] = useState<{
    id: string;
    riskLevel: RiskLevel;
    fraudScore: number;
    urgencyScore: number;
    impersonatedEntity: string;
    extractedUrls: string[];
    extractedPhones: string[];
    extractedEmails: string[];
    suspiciousKeywords: string[];
    evidenceList: ThreatEvidence[];
    explanation: string;
    recommendedActions: string[];
  }>({
    id: 'TH-MSG-7489',
    riskLevel: 'CONFIRMED_MALICIOUS',
    fraudScore: 94,
    urgencyScore: 90,
    impersonatedEntity: 'State Bank of India (YONO / Sovereign Banking)',
    extractedUrls: ['http://sbi-kyc-verify-portal.in'],
    extractedPhones: [],
    extractedEmails: [],
    suspiciousKeywords: ['suspended today', 'immediately', 'within 24 hours', 'penalty', 'pan kyc'],
    evidenceList: [
      {
        id: 'MSG-01',
        title: 'Institutional Impersonation (State Bank of India)',
        category: 'Spoofing',
        severity: 'confirmed_malicious',
        evidence: 'Message text mimics State Bank of India YONO mobile banking communications without verifiable cryptographic sender origin.',
        source: 'NLP Entity Matcher',
        confidence: 'High',
      },
      {
        id: 'MSG-02',
        title: 'Artificial Countdown & Penalty Coercion',
        category: 'Urgency Manipulation',
        severity: 'high_risk',
        evidence: 'Imposes an artificial "within 24 hours" deadline coupled with threat of ₹5,000 regulatory penalty.',
        source: 'Linguistic Heuristic',
        confidence: 'High',
      },
      {
        id: 'MSG-03',
        title: 'Confidential Tax Identifier (PAN) Solicitation',
        category: 'Credential Harvesting',
        severity: 'confirmed_malicious',
        evidence: 'Solicits submission of sovereign PAN credentials via an unverified third-party domain.',
        source: 'Credential Pattern Matcher',
        confidence: 'High',
      },
    ],
    explanation:
      'The audited message exhibits high-confidence markers of financial credential theft. It fabricates an imminent suspension from State Bank of India to panic the recipient into visiting an unverified portal (http://sbi-kyc-verify-portal.in) that collects sensitive personal credentials.',
    recommendedActions: [
      'Do NOT click any embedded links or disclose personal banking credentials.',
      'Never share OTPs, UPI security PINs, or card CVVs with any caller or SMS sender.',
      'Report suspicious financial cyber fraud to 1930 or the National Cyber Crime Reporting Portal (cybercrime.gov.in).',
      'Block the sender identifier on your mobile messaging client.',
    ],
  });

  const handleAudit = () => {
    if (!messageText.trim()) return;

    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);

      const lower = messageText.toLowerCase();
      const urls = messageText.match(/https?:\/\/[^\s]+/g) || [];
      const phones = messageText.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/g) || [];
      const emails = messageText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];

      if (lower.includes('electricity') || lower.includes('power')) {
        setAuditResult({
          id: 'TH-MSG-7490',
          riskLevel: 'CONFIRMED_MALICIOUS',
          fraudScore: 92,
          urgencyScore: 88,
          impersonatedEntity: 'State Electricity Distribution Board',
          extractedUrls: urls,
          extractedPhones: phones.length > 0 ? phones : ['+91-9876543210'],
          extractedEmails: emails,
          suspiciousKeywords: ['disconnected tonight', 'power cut', 'immediately contact'],
          evidenceList: [
            {
              id: 'MSG-UTL-01',
              title: 'Utility Disconnection Extortion Lure',
              category: 'Extortion Bait',
              severity: 'confirmed_malicious',
              evidence: 'Threatens power disconnection tonight at 9:30 PM to pressure consumer into dialing private numbers.',
              source: 'NLP Pattern Engine',
              confidence: 'High',
            },
          ],
          explanation:
            'Classic electricity bill cutoff extortion campaign. Malicious actors impersonate regional power utility officers and demand immediate payment via unauthorized UPI numbers.',
          recommendedActions: [
            'Do NOT call the phone number provided in the message.',
            'Verify utility bills exclusively through official electricity distribution board websites or consumer apps.',
          ],
        });
      } else if (lower.includes('amazon') || lower.includes('job') || lower.includes('earn')) {
        setAuditResult({
          id: 'TH-MSG-7491',
          riskLevel: 'HIGH_RISK',
          fraudScore: 86,
          urgencyScore: 60,
          impersonatedEntity: 'Amazon Merchant Operations (Recruitment Spoof)',
          extractedUrls: urls,
          extractedPhones: phones,
          extractedEmails: emails,
          suspiciousKeywords: ['earn rs', 'per day from home', 'security deposit', 'part-time'],
          evidenceList: [
            {
              id: 'MSG-JOB-01',
              title: 'Advance-Fee Recruitment Fraud Lure',
              category: 'Advance Fee Fraud',
              severity: 'high_risk',
              evidence: 'Promises unrealistic daily income (₹3,500 - ₹8,000) for reviewing e-commerce products while soliciting initial refundable deposits.',
              source: 'Financial Solicitation Heuristic',
              confidence: 'High',
            },
          ],
          explanation:
            'Advance-fee part-time task scam. Victim is drawn into Telegram groups with small initial payouts, then coerced into transferring substantial sums to unlock "commissions".',
          recommendedActions: [
            'Never transfer security deposits to activate job offers or work assignments.',
            'Report fraudulent Telegram accounts and recruitment messages to consumer protection portals.',
          ],
        });
      } else {
        setAuditResult({
          id: 'TH-MSG-7492',
          riskLevel: urls.length > 0 ? 'SUSPICIOUS' : 'LOW_RISK',
          fraudScore: urls.length > 0 ? 65 : 20,
          urgencyScore: 40,
          impersonatedEntity: 'Unclassified Communication',
          extractedUrls: urls,
          extractedPhones: phones,
          extractedEmails: emails,
          suspiciousKeywords: [],
          evidenceList: [
            {
              id: 'MSG-GEN-01',
              title: 'General Communication Audit',
              category: 'Linguistic Scan',
              severity: 'low',
              evidence: 'No critical banking panic, utility cut-off, or credential harvest patterns detected.',
              source: 'Heuristic NLP Model',
              confidence: 'Moderate',
            },
          ],
          explanation:
            'The evaluated message does not contain high-probability threat triggers. Review any embedded links independently before interacting.',
          recommendedActions: [
            'Maintain vigilance regarding unexpected payment or verification requests.',
          ],
        });
      }
    }, 600);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setMessageText(text);
    } catch (e) {
      console.error('Clipboard paste failed:', e);
    }
  };

  const handleClear = () => {
    setMessageText('');
    setSenderInfo('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6 text-left font-mono">
      {/* Module Title */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#FF9933] border border-white/15">
            <MessageSquareWarning className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Module 02 // AI Scam, Phishing & Message Forensics
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Heuristic analysis for deceptive SMS, WhatsApp extortion, electricity bill cut-offs, and advance-fee recruitment scams.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />

      {/* Strict Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-start gap-3 text-xs">
        <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] block">
            Zero-Secret Policy & Privacy Guardrail
          </span>
          <p className="text-slate-400 font-sans leading-relaxed">
            TRACEHAWK never requires passwords, OTPs, PINs, or private keys. Do not input live confidential credentials. Submit only suspicious communication texts for heuristic evaluation.
          </p>
        </div>
      </div>

      {/* Split Input & Analysis Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input, Presets, Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>1. Sender ID, Phone or Header:</span>
              </label>
              <input
                type="text"
                value={senderInfo}
                onChange={(e) => setSenderInfo(e.target.value)}
                placeholder="e.g. VM-SBIBNK or +91-9876543210"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#FF9933]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquareWarning className="w-3.5 h-3.5 text-[#FF9933]" />
                  <span>2. Raw Message Text Content:</span>
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    onClick={handlePaste}
                    className="text-slate-400 hover:text-white uppercase"
                  >
                    Paste
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-slate-500 hover:text-slate-300 uppercase"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Paste suspicious SMS, WhatsApp message, email body, or job offer here..."
                className="w-full p-3 rounded-lg bg-white/5 border border-white/15 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-[#FF9933]"
              />
            </div>

            {/* Presets */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Realistic Threat Scenarios:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSenderInfo('VM-SBIBNK');
                    setMessageText(
                      'Dear SBI User, your YONO mobile banking access has been suspended today due to pending PAN KYC. Update immediately within 24 hours at http://sbi-kyc-verify-portal.in to avoid ₹5,000 penalty.'
                    );
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white"
                >
                  SBI KYC Panic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSenderInfo('AD-WBPSED');
                    setMessageText(
                      'Dear consumer, your electricity power will be disconnected tonight at 09:30 PM from the power sub-station because your previous month bill was not updated. Please immediately contact our electricity officer at +919876543210.'
                    );
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white"
                >
                  Electricity Cutoff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSenderInfo('Amazon-Recruit-HR');
                    setMessageText(
                      'Congratulations! You have been selected for Amazon Part-Time Data Reviewer role. Earn ₹3,500 to ₹8,000 per day from home working just 1 hour. No experience required. To activate your merchant workstation, transfer initial refundable security deposit of ₹1,000 via UPI.'
                    );
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-slate-300 hover:text-white"
                >
                  Telegram Task Scam
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className="w-full py-2.5 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#FF9933]/10 transition-all disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Linguistic Semantics...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Analyse Message Semantics</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Heuristic Results, Extracted Artifacts, and Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {auditResult && (
            <div className="space-y-4">
              {/* Verdict Card */}
              <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      SEMANTIC HEURISTIC VERDICT // {auditResult.id}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <RiskBadge level={auditResult.riskLevel} size="md" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">FRAUD PROBABILITY</span>
                      <span className="text-xl font-black text-rose-400">{auditResult.fraudScore}%</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">URGENCY SCORE</span>
                      <span className="text-xl font-black text-amber-400">{auditResult.urgencyScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Impersonated Entity Alert */}
                {auditResult.impersonatedEntity && (
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 flex items-start gap-2.5">
                    <Building className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5 font-sans">
                      <span className="text-rose-300 font-bold uppercase tracking-wide text-[11px] block font-mono">
                        Institutional Target Impersonation Detected
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        Message mimics official communications of <strong className="text-white underline decoration-rose-500">{auditResult.impersonatedEntity}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Explanation */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Forensic Assessment:
                  </span>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 font-sans leading-relaxed">
                    {auditResult.explanation}
                  </div>
                </div>
              </div>

              {/* Extracted Artifacts (URLs, Phones, Emails) */}
              <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Extracted Indicators of Compromise
                </span>

                {auditResult.extractedUrls.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
                      <span>Embedded URL Lures ({auditResult.extractedUrls.length}):</span>
                    </span>
                    {auditResult.extractedUrls.map((url, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-black/40 border border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-rose-300 font-mono break-all truncate sm:max-w-md">{url}</span>
                        <button
                          onClick={() => onInvestigateUrl(url)}
                          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                        >
                          <span>Deep-Audit URL</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {auditResult.extractedPhones.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Extracted Contact Numbers:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {auditResult.extractedPhones.map((ph, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-blue-300 text-xs border border-white/10">
                          {ph}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Corroborated Evidence Panel */}
              <ThreatEvidencePanel evidenceList={auditResult.evidenceList} />

              {/* Recommended Actions */}
              <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Recommended Response Actions
                </span>
                <div className="space-y-1.5">
                  {auditResult.recommendedActions.map((act, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

