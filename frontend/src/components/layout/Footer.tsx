import React from 'react';
import { HawkShieldLogo } from '../brand/HawkShieldLogo';
import { Shield, Lock, Terminal, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black/80 backdrop-blur-md border-t border-white/10 font-mono text-xs text-left relative z-10 select-none">
      {/* Subtle Indian Tricolour Top Accent Ribbon */}
      <div className="h-0.5 w-full grid grid-cols-3">
        <div className="bg-[#FF9933]" />
        <div className="bg-[#FFFFFF]" />
        <div className="bg-[#138808]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3 md:col-span-1">
            <HawkShieldLogo size="md" showTagline={true} />
            <p className="text-slate-400 font-sans text-xs leading-relaxed mt-2">
              An intelligent cybersecurity intelligence platform built for technical evidence extraction, phishing identification, and digital trust verification.
            </p>
          </div>

          {/* Col 2: Platform Modules */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              Core Intelligence
            </span>
            <ul className="space-y-1.5 text-slate-400 font-sans text-xs">
              <li><span className="hover:text-white transition-colors cursor-pointer">URL Threat Forensics</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Message & Phish Analysis</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Domain & DNS Intelligence</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">TLS/SSL Cryptography</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Feed Correlation</span></li>
            </ul>
          </div>

          {/* Col 3: Principles & Frameworks */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              Forensic Principles
            </span>
            <ul className="space-y-1.5 text-slate-400 font-sans text-xs">
              <li><span className="hover:text-white transition-colors cursor-pointer">HTTPS Fallacy Guardrail</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Absence of Feed Match Rule</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">NIST SP 800-52r2 Guidelines</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">RFC 6962 Certificate Transparency</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Evidence-Grounded Reporting</span></li>
            </ul>
          </div>

          {/* Col 4: Project Status & Demonstration Disclaimer */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              Platform Status
            </span>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-400 space-y-1 font-sans">
              <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Frontend UI Active</span>
              </div>
              <p className="text-[10px] leading-tight text-slate-500">
                Machine learning model and Python FastAPI backend will be linked directly to modular UI hooks.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} TRACEHAWK // Hawk Shield. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>GovTech Security Platform</span>
            <span>•</span>
            <span className="text-[#FF9933]">Vigilance & Integrity</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

