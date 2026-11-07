import React from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert, XCircle } from 'lucide-react';
import { ThreatEvidence } from '../../types';

interface ThreatEvidencePanelProps {
  evidenceList: ThreatEvidence[];
  title?: string;
  className?: string;
}

export const ThreatEvidencePanel: React.FC<ThreatEvidencePanelProps> = ({
  evidenceList,
  title = 'Corroborated Technical Evidence',
  className = '',
}) => {
  if (!evidenceList || evidenceList.length === 0) {
    return (
      <div className="p-4 sm:p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-center font-mono text-xs text-slate-500">
        No anomalous threat indicators observed for this artifact.
      </div>
    );
  }

  const getSeverityStyle = (severity: ThreatEvidence['severity']) => {
    switch (severity) {
      case 'confirmed_malicious':
        return {
          card: 'bg-rose-950/20 border-rose-900/60',
          text: 'text-rose-400',
          badge: 'bg-rose-950/70 border-rose-800 text-rose-300',
          icon: XCircle,
        };
      case 'high_risk':
        return {
          card: 'bg-orange-950/20 border-orange-900/60',
          text: 'text-orange-400',
          badge: 'bg-orange-950/70 border-orange-800 text-orange-300',
          icon: ShieldAlert,
        };
      case 'suspicious':
        return {
          card: 'bg-amber-950/20 border-amber-900/60',
          text: 'text-amber-400',
          badge: 'bg-amber-950/70 border-amber-800 text-amber-300',
          icon: AlertTriangle,
        };
      case 'low':
      default:
        return {
          card: 'bg-emerald-950/15 border-emerald-900/40',
          text: 'text-emerald-400',
          badge: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
          icon: ShieldCheck,
        };
    }
  };

  return (
    <div className={`space-y-3 font-mono text-left ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 pb-1">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF9933] flex-shrink-0" />
          <span>{title} ({evidenceList.length})</span>
        </span>
        <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase">
          Empirical Observation Only
        </span>
      </div>

      <div className="space-y-2.5">
        {evidenceList.map((item) => {
          const style = getSeverityStyle(item.severity);
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              className={`p-3 sm:p-3.5 rounded-lg border text-xs transition-colors ${style.card}`}
            >
              <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-1.5 pb-1.5">
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${style.text} flex-shrink-0 mt-0.5`} />
                  <span className="font-bold text-white tracking-tight leading-snug">{item.title}</span>
                </div>
                <div className="flex items-center gap-1.5 self-start xs:self-auto flex-shrink-0">
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded border uppercase whitespace-nowrap ${style.badge}`}>
                    {item.severity.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 px-1.5 sm:px-2 py-0.5 rounded bg-black/40 border border-white/10 whitespace-nowrap">
                    {item.category}
                  </span>
                </div>
              </div>

              <p className="text-slate-300 font-sans leading-relaxed text-xs mt-1">
                {item.evidence}
              </p>

              <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-[10px] text-slate-500">
                <span>
                  Source: <strong className="text-slate-400">{item.source}</strong> ({item.confidence})
                </span>
                {item.recommendedAction && (
                  <span className="text-amber-400 font-medium">
                    Action: {item.recommendedAction}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
