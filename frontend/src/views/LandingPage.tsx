import React, { useState } from 'react';
import {
  ArrowRight,
  Shield,
  Search,
  Lock,
  MessageSquareWarning,
  Globe2,
  Database,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Cpu,
  Layers,
  ChevronRight,
  Terminal,
  FileText
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HawkShieldLogo } from '../components/brand/HawkShieldLogo';
import { RiskBadge } from '../components/common/RiskBadge';

interface LandingPageProps {
  onLaunchDashboard: (initialView?: string, initialQuery?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDashboard }) => {
  const [heroUrlInput, setHeroUrlInput] = useState('http://sbi-kyc-verify-portal.in');

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroUrlInput.trim()) {
      onLaunchDashboard('url', heroUrlInput.trim());
    }
  };

  const featureCards = [
    {
      title: 'Intelligent URL Investigation',
      desc: 'Deep lexical and syntactic URL forensics, Shannon entropy measurement, punycode/IDN detection, and homoglyph spoofing analysis.',
      icon: Search,
      badge: 'Lexical Forensics',
      accent: 'border-l-4 border-[#FF9933]',
    },
    {
      title: 'Phishing & Scam Analysis',
      desc: 'Heuristic analysis for deceptive SMS, WhatsApp extortion, utility cut-offs, and social engineering lures with keyword extraction.',
      icon: MessageSquareWarning,
      badge: 'NLP Heuristics',
      accent: 'border-l-4 border-amber-500',
    },
    {
      title: 'TLS & Certificate Intelligence',
      desc: 'Socket-level X.509 handshake inspection, root CA chain verification, ephemeral DV abuse detection, and Certificate Transparency SCT logging.',
      icon: Lock,
      badge: 'RFC 6962 / X.509',
      accent: 'border-l-4 border-cyan-500',
    },
    {
      title: 'Threat Intelligence Correlation',
      desc: 'Corroboration with public threat intelligence feeds (URLhaus, PhishTank, PhiUSIIL, AbuseIPDB) to identify confirmed indicators of compromise.',
      icon: Database,
      badge: 'Multi-Feed Telemetry',
      accent: 'border-l-4 border-indigo-500',
    },
    {
      title: 'Evidence-Based Risk Assessment',
      desc: 'Explicit classification into Low Risk, Suspicious, High Risk, Confirmed Malicious, or Inconclusive with transparent empirical findings.',
      icon: Shield,
      badge: 'Transparent Verdicts',
      accent: 'border-l-4 border-emerald-500',
    },
    {
      title: 'Verifiable Investigation Reports',
      desc: 'Comprehensive executive and technical forensic reports ready for export, structured for enterprise SOC response and compliance.',
      icon: FileCheck2,
      badge: 'GovTech Standard',
      accent: 'border-l-4 border-[#138808]',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Submit Suspicious Digital Activity',
      desc: 'Enter suspicious URLs, domains, SMS panic texts, or payment messages into the Hawk Shield analysis engine.',
    },
    {
      step: '02',
      title: 'Analyse Technical Evidence',
      desc: 'Inspect lexical structure, DNS bindings, SSL/TLS certificate chains, and linguistic urgency triggers.',
    },
    {
      step: '03',
      title: 'Correlate Threat Intelligence',
      desc: 'Cross-reference indicators against live verified threat intelligence databases and known hostile infrastructure.',
    },
    {
      step: '04',
      title: 'Generate Clear Investigation Report',
      desc: 'Receive an explainable security assessment backed strictly by collected evidence with actionable response guidance.',
    },
  ];

  return (
    <div className="relative min-h-screen text-slate-200">
      <Navbar onLaunchDashboard={() => onLaunchDashboard('overview')} />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Sovereign Brand Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
                <span className="text-slate-300 font-bold uppercase tracking-wider">
                  Hawk Shield // Vigilance & Protection
                </span>
                <span className="text-[#138808] font-bold">•</span>
                <span className="text-emerald-400 font-bold text-[11px]">SOC READY</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  See the Threat.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]">
                    Trace the Source.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300 font-sans leading-relaxed max-w-2xl pt-2">
                  An intelligent cybersecurity investigation platform designed to analyse suspicious URLs,
                  identify potential threats, correlate digital evidence, and make security intelligence easier to understand.
                </p>
              </div>

              {/* Interactive Hero URL Investigation Bar */}
              <form onSubmit={handleHeroSubmit} className="pt-2">
                <div className="p-2 rounded-xl bg-black/75 border border-white/15 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl">
                  <div className="flex-1 relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      value={heroUrlInput}
                      onChange={(e) => setHeroUrlInput(e.target.value)}
                      placeholder="Enter suspicious URL or domain (e.g. sbi-kyc-verify-portal.in)..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-transparent text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all flex-shrink-0"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">Quick Test:</span>
                  <button
                    type="button"
                    onClick={() => setHeroUrlInput('http://sbi-kyc-verify-portal.in')}
                    className="hover:text-[#FF9933] transition-colors underline decoration-dotted"
                  >
                    SBI KYC Phish Lure
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setHeroUrlInput('https://onlinesbi.sbi')}
                    className="hover:text-emerald-400 transition-colors underline decoration-dotted"
                  >
                    Official onlinesbi.sbi
                  </button>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs">
                <button
                  onClick={() => onLaunchDashboard('overview')}
                  className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-wider flex items-center gap-2 border border-white/15 backdrop-blur-md cursor-pointer transition-all"
                >
                  <Shield className="w-4 h-4 text-[#FF9933]" />
                  <span>Open SOC Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('features');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 font-medium uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Explore Platform
                </button>
              </div>
            </div>

            {/* Right Visual: Hawk Shield SOC Preview Interface (5 Cols) */}
            <div className="lg:col-span-5 relative">
              {/* Outer Glow & Subtle Tricolour Accents */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FF9933]/20 via-transparent to-[#138808]/20 blur-xl opacity-70" />

              <div className="relative rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md shadow-2xl overflow-hidden text-left font-mono text-xs">
                {/* Visual Window Header */}
                <div className="px-4 py-3 bg-white/10 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-[10px] text-slate-400 ml-2 font-bold uppercase">
                      HAWK SHIELD // LIVE FORENSICS
                    </span>
                  </div>
                  <RiskBadge level="CONFIRMED_MALICIOUS" size="sm" showIcon={false} />
                </div>

                {/* Simulated URL Inspection Preview */}
                <div className="p-5 space-y-4">
                  {/* Target URL */}
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">
                      AUDITED TARGET IDENTIFIER
                    </span>
                    <span className="text-rose-400 font-bold text-xs break-all block">
                      http://sbi-kyc-verify-portal.in
                    </span>
                  </div>

                  {/* Indicators Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">LEXICAL ENTROPY</span>
                      <span className="text-amber-400 font-bold">4.18 bits (High)</span>
                    </div>
                    <div className="p-2.5 rounded bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">TLS VALIDITY</span>
                      <span className="text-rose-400 font-bold">DV Ephemeral (14d)</span>
                    </div>
                    <div className="p-2.5 rounded bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">THREAT FEED MATCH</span>
                      <span className="text-rose-400 font-bold">URLhaus #8492019</span>
                    </div>
                    <div className="p-2.5 rounded bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">TARGET BRAND</span>
                      <span className="text-white font-bold">State Bank of India</span>
                    </div>
                  </div>

                  {/* Evidence Alert Box */}
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px] uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Empirical Security Finding</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                      Linguistic banking impersonation coupled with automated ephemeral encryption. Listed on verified IOC repositories.
                    </p>
                  </div>

                  {/* Deep Audit Button */}
                  <button
                    onClick={() => onLaunchDashboard('url', 'http://sbi-kyc-verify-portal.in')}
                    className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Inspect Full Evidence Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM CAPABILITIES SECTION */}
      <section id="features" className="py-20 bg-black/60 backdrop-blur-md border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="space-y-2 mb-12">
            <span className="text-xs font-mono font-bold text-[#FF9933] uppercase tracking-wider block">
              Core Capabilities // Hawk Shield
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Evidence-Based Web Threat Intelligence
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl font-sans">
              Unlike simplistic blackboxes that output unverified ratings, TRACEHAWK deconstructs technical evidence across network layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all text-left space-y-3 ${feat.accent}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-lg bg-white/10 text-white">
                      <Icon className="w-5 h-5 text-[#FF9933]" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400 uppercase font-bold">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">{feat.title}</h3>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="space-y-2 mb-12">
            <span className="text-xs font-mono font-bold text-[#138808] uppercase tracking-wider block">
              Investigation Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How TRACEHAWK Operates
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl font-sans">
              A systematic 4-step investigation lifecycle engineered for rapid security verification and non-repudiation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 relative space-y-3"
              >
                <span className="text-2xl font-mono font-black text-[#FF9933] block">
                  {st.step}
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight">{st.title}</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DIGITAL TRUST MATTERS / CORE PRINCIPLES */}
      <section id="platform" className="py-20 bg-black/60 backdrop-blur-md border-y border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono font-bold text-[#FF9933] uppercase tracking-wider block">
                Foundational Forensic Principles
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Why Technical Ground Truth Matters
              </h2>
              <p className="text-sm text-slate-300 font-sans leading-relaxed">
                Modern deception exploits human trust in visual symbols like the green padlock and familiar institutional branding.
                TRACEHAWK enforces strict forensic guardrails:
              </p>

              <div className="space-y-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                  <span className="text-[#FF9933] font-bold uppercase text-[11px] block">
                    1. The HTTPS Fallacy Principle
                  </span>
                  <p className="text-slate-400 font-sans text-xs">
                    "A valid HTTPS certificate does not establish website legitimacy. Over 80% of active phishing websites deploy valid automated DV certificates."
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                  <span className="text-emerald-400 font-bold uppercase text-[11px] block">
                    2. The Threat Feed Fallacy Principle
                  </span>
                  <p className="text-slate-400 font-sans text-xs">
                    "The absence of a known threat-intelligence match does not establish safety. Zero-day campaigns precede feed listing by 24 to 72 hours."
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="p-6 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 space-y-4 font-mono text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">
                  Demonstration Security Benchmark (Telemetry)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-black/50 border border-white/10">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Queries Audited</span>
                    <span className="text-xl font-bold text-white mt-1 block">1,060</span>
                    <span className="text-[10px] text-slate-500">Benchmark Corpus</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-black/50 border border-white/10">
                    <span className="text-[10px] text-slate-500 uppercase block">Malicious Identifications</span>
                    <span className="text-xl font-bold text-rose-400 mt-1 block">230</span>
                    <span className="text-[10px] text-rose-500/80">Confirmed Hostile</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-black/50 border border-white/10">
                    <span className="text-[10px] text-slate-500 uppercase block">Threat Feeds Correlated</span>
                    <span className="text-xl font-bold text-[#FF9933] mt-1 block">5 Feeds</span>
                    <span className="text-[10px] text-slate-500">URLhaus, PhishTank, etc.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-black/50 border border-white/10">
                    <span className="text-[10px] text-slate-500 uppercase block">Verification Precision</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">99.4%</span>
                    <span className="text-[10px] text-slate-500">Corroborated Telemetry</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 italic border-t border-white/10 pt-3">
                  Notice: Statistics reflect benchmark demonstration sets. Live metrics connect via backend API.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 relative z-10 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#FF9933]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Investigate Digital Deception?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-sans">
            Launch the TRACEHAWK workstation to test URL structures, audit TLS certificates, evaluate suspicious messages, and inspect threat correlation telemetry.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 font-mono text-xs">
            <button
              onClick={() => onLaunchDashboard('overview')}
              className="px-6 py-3 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FF9933]/20 transition-all"
            >
              <span>Launch Workstation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onLaunchDashboard('url')}
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider border border-white/15 cursor-pointer transition-colors"
            >
              Investigate a URL Directly
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

