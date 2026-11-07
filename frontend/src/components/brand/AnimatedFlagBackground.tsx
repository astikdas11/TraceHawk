import React from 'react';

export const AnimatedFlagBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Underlying Soft Flag Base Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #FF9933 0%, #FF851A 25%, #FFFFFF 48%, #FFFFFF 52%, #138808 75%, #0E6805 100%)',
        }}
      />

      {/* 2. Layered Continuous Undulating Wavy Flag Canvas (Blurred for fluid liquid/fabric wave look) */}
      <div
        className="absolute -inset-[5%] w-[110%] h-[110%] pointer-events-none overflow-hidden"
        style={{
          filter: 'blur(30px)',
          transform: 'translateZ(0)',
        }}
      >
        {/* WAVE LAYER 1: Deep Saffron Waves (Top to Center) */}
        <div className="absolute top-0 left-0 right-0 h-[52%] overflow-hidden anim-wave-undulate-1">
          <div className="w-[200%] h-full flex anim-wave-forward-slow">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L1440,0 L1440,160 C1260,260 1100,80 880,210 C660,340 480,120 260,240 C140,290 60,190 0,220 Z"
                fill="url(#saffronWaveGrad1)"
              />
              <defs>
                <linearGradient id="saffronWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9933" />
                  <stop offset="50%" stopColor="#FF7700" />
                  <stop offset="100%" stopColor="#FFA23A" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L1440,0 L1440,160 C1260,260 1100,80 880,210 C660,340 480,120 260,240 C140,290 60,190 0,220 Z"
                fill="url(#saffronWaveGrad1Repeat)"
              />
              <defs>
                <linearGradient id="saffronWaveGrad1Repeat" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9933" />
                  <stop offset="50%" stopColor="#FF7700" />
                  <stop offset="100%" stopColor="#FFA23A" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* WAVE LAYER 2: Secondary Amber/Saffron Fluid Wave Ribbon */}
        <div className="absolute top-[8%] left-0 right-0 h-[42%] overflow-hidden opacity-85 anim-wave-undulate-2">
          <div className="w-[200%] h-full flex anim-wave-backward-slow">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 280"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L1440,0 L1440,140 C1300,60 1140,220 920,120 C700,20 540,180 320,100 C180,40 80,160 0,110 Z"
                fill="#FF9933"
                fillOpacity="0.8"
              />
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 280"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L1440,0 L1440,140 C1300,60 1140,220 920,120 C700,20 540,180 320,100 C180,40 80,160 0,110 Z"
                fill="#FF9933"
                fillOpacity="0.8"
              />
            </svg>
          </div>
        </div>

        {/* WAVE LAYER 3: White Fluid Ribbon Wave (Middle Crests) */}
        <div className="absolute top-[28%] left-0 right-0 h-[44%] overflow-hidden anim-wave-undulate-3">
          <div className="w-[200%] h-full flex anim-wave-backward-mid">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 260"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,130 C200,60 420,200 680,120 C940,40 1120,210 1340,110 C1380,90 1420,110 1440,120 L1440,200 C1240,260 1020,140 760,220 C500,300 280,120 0,210 Z"
                fill="#FFFFFF"
                fillOpacity="0.95"
              />
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 260"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,130 C200,60 420,200 680,120 C940,40 1120,210 1340,110 C1380,90 1420,110 1440,120 L1440,200 C1240,260 1020,140 760,220 C500,300 280,120 0,210 Z"
                fill="#FFFFFF"
                fillOpacity="0.95"
              />
            </svg>
          </div>
        </div>

        {/* WAVE LAYER 4: Deep India Green Waves (Center to Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-[55%] overflow-hidden anim-wave-undulate-2">
          <div className="w-[200%] h-full flex anim-wave-forward-mid">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 340"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,140 C180,60 360,230 600,120 C840,10 1060,210 1280,100 C1360,60 1400,90 1440,110 L1440,340 L0,340 Z"
                fill="url(#greenWaveGrad1)"
              />
              <defs>
                <linearGradient id="greenWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#16A34A" />
                  <stop offset="40%" stopColor="#138808" />
                  <stop offset="100%" stopColor="#0B5704" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 340"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,140 C180,60 360,230 600,120 C840,10 1060,210 1280,100 C1360,60 1400,90 1440,110 L1440,340 L0,340 Z"
                fill="url(#greenWaveGrad1Repeat)"
              />
              <defs>
                <linearGradient id="greenWaveGrad1Repeat" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#16A34A" />
                  <stop offset="40%" stopColor="#138808" />
                  <stop offset="100%" stopColor="#0B5704" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* WAVE LAYER 5: Emerald Green Secondary Wave Undulation */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] overflow-hidden opacity-90 anim-wave-undulate-1">
          <div className="w-[200%] h-full flex anim-wave-backward-slow">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 260"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,120 C220,190 460,50 720,130 C980,210 1180,60 1440,110 L1440,260 L0,260 Z"
                fill="#138808"
                fillOpacity="0.85"
              />
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 260"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,120 C220,190 460,50 720,130 C980,210 1180,60 1440,110 L1440,260 L0,260 Z"
                fill="#138808"
                fillOpacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* WAVE LAYER 6: Liquid Silk Surface Highlight Ripples */}
        <div className="absolute inset-0 opacity-45 mix-blend-overlay anim-wave-undulate-3">
          <div className="w-[200%] h-full flex anim-wave-forward-slow">
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 600"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,180 C360,260 540,80 880,220 C1220,360 1340,140 1440,200 L1440,320 C1260,240 1080,440 760,300 C440,160 260,380 0,260 Z"
                fill="url(#silkLightGrad)"
              />
              <defs>
                <linearGradient id="silkLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>
            <svg
              className="w-1/2 h-full flex-shrink-0"
              viewBox="0 0 1440 600"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,180 C360,260 540,80 880,220 C1220,360 1340,140 1440,200 L1440,320 C1260,240 1080,440 760,300 C440,160 260,380 0,260 Z"
                fill="url(#silkLightGradRepeat)"
              />
              <defs>
                <linearGradient id="silkLightGradRepeat" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Translucent Readability Veil (Transparent Black) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(1.5px)',
        }}
      />
    </div>
  );
};
