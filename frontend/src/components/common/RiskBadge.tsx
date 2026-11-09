import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, XCircle, HelpCircle } from 'lucide-react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const configs: Record<
    RiskLevel,
    {
      label: string;
      bg: string;
      text: string;
      border: string;
      dot: string;
      icon: React.ElementType;
    }
  > = {
    LOW_RISK: {
      label: 'Low Risk',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-700/60',
      dot: 'bg-emerald-500',
      icon: ShieldCheck,
    },
    SUSPICIOUS: {
      label: 'Suspicious',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-700/60',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
    },
    HIGH_RISK: {
      label: 'High Risk',
      bg: 'bg-orange-950/60',
      text: 'text-orange-400',
      border: 'border-orange-700/60',
      dot: 'bg-orange-500',
      icon: ShieldAlert,
    },
    CRITICAL_RISK: {
      label: 'Critical Risk',
      bg: 'bg-rose-950/70',
      text: 'text-rose-400',
      border: 'border-rose-700/70',
      dot: 'bg-rose-500',
      icon: ShieldAlert,
    },
    CONFIRMED_MALICIOUS: {
      label: 'Confirmed Malicious',
      bg: 'bg-rose-950/70',
      text: 'text-rose-400',
      border: 'border-rose-700/70',
      dot: 'bg-rose-500',
      icon: XCircle,
    },
    INCONCLUSIVE: {
      label: 'Inconclusive',
      bg: 'bg-black/60',
      text: 'text-slate-400',
      border: 'border-white/15',
      dot: 'bg-slate-400',
      icon: HelpCircle,
    },
  };

  const config = configs[level] || configs.INCONCLUSIVE;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[9px] sm:text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] sm:text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-xs sm:text-sm px-2.5 sm:px-3.5 py-1 sm:py-1.5 gap-1.5 sm:gap-2 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-medium border uppercase tracking-wider whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="opacity-80 font-mono text-[10px] sm:text-[11px] ml-0.5">
          ({score}/100)
        </span>
      )}
    </span>
  );
};
