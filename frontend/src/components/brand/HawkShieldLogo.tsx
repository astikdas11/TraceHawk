import React from 'react';

interface HawkShieldLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const HawkShieldLogo: React.FC<HawkShieldLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Hawk Shield Emblem */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center flex-shrink-0`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        >
          {/* Outer Protective Shield Geometry */}
          <path
            d="M24 4L6 11V23.5C6 33.8 13.7 42.4 24 44.5C34.3 42.4 42 33.8 42 23.5V11L24 4Z"
            fill="#0a0a0a"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />

          {/* Saffron Crown / Top Edge Accent */}
          <path
            d="M14 9.5L24 5.5L34 9.5"
            stroke="#FF9933"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Geometric Hawk Head & Eye Matrix */}
          {/* Hawk Brow & Crown */}
          <path
            d="M17 17L24 13L31 17L27 21L24 19L21 21L17 17Z"
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth="1"
          />

          {/* Hawk Beak Sharp Apex */}
          <path
            d="M21 21L24 29L27 21L24 19L21 21Z"
            fill="#F4F5F2"
            stroke="#000000"
            strokeWidth="0.8"
          />

          {/* Left Vigilant Eye - Saffron Accent */}
          <circle cx="20.5" cy="18.5" r="1.5" fill="#FF9933" />
          <circle cx="20.5" cy="18.5" r="0.6" fill="#000000" />

          {/* Right Vigilant Eye - Green Accent */}
          <circle cx="27.5" cy="18.5" r="1.5" fill="#138808" />
          <circle cx="27.5" cy="18.5" r="0.6" fill="#000000" />

          {/* Lower Shield Circuit Traces - India Green */}
          <path
            d="M16 27L20 31M32 27L28 31M24 33V39"
            stroke="#138808"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Central Anchor Point */}
          <circle cx="24" cy="33" r="1.5" fill="#138808" stroke="#F4F5F2" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Brand Typographic Identity */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-wider text-white uppercase ${textSizes[size]}`}>
            TRACE<span className="text-[#FF9933]">HAWK</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 font-semibold border border-white/10 uppercase">
            SHIELD
          </span>
        </div>
        {showTagline && (
          <span className={`font-mono text-slate-400 font-medium tracking-tight mt-1 ${taglineSizes[size]}`}>
            See the Threat. Trace the Source.
          </span>
        )}
      </div>
    </div>
  );
};

