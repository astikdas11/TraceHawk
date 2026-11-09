import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Code,
  Save,
  Monitor
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { API_BASE_URL } from '../../services/api';

interface SettingsViewProps {
  flagAnimationEnabled?: boolean;
  onToggleFlagAnimation?: (enabled: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  flagAnimationEnabled = true,
  onToggleFlagAnimation
}) => {
  const [apiUrl, setApiUrl] = useState<string>(API_BASE_URL);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [refreshInterval, setRefreshInterval] = useState<string>('30s');
  const [riskThreshold, setRiskThreshold] = useState<number>(75);
  const [compactDensity, setCompactDensity] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleTestConnection = async () => {
    const cleanApiUrl = apiUrl.trim().replace(/\/+$/, '');
    if (!cleanApiUrl) {
      setConnectionStatus('disconnected');
      setStatusMessage('Please enter a valid backend API URL before testing connectivity.');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    setStatusMessage('Pinging backend endpoint...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${cleanApiUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setConnectionStatus('connected');
        setStatusMessage('Connection established. FastAPI threat intelligence engine is online.');
      } else {
        setConnectionStatus('disconnected');
        setStatusMessage(`Backend reachable but returned HTTP status ${res.status}.`);
      }
    } catch {
      setConnectionStatus('disconnected');
      setStatusMessage('FastAPI backend offline or unreachable at this address. Frontend is currently running in standalone Demonstration Mode.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-left font-mono">
      {/* Demo Banner */}
      <DemoBanner />

      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-[#FF9933] flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              Workstation Settings & Backend
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
            Configure backend API connectivity for Python FastAPI and tune display parameters.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68a2e] text-black font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors self-start sm:self-auto min-h-[44px] sm:min-h-0"
        >
          <Save className="w-4 h-4" />
          <span>{savedSuccess ? 'Settings Saved' : 'Save Preferences'}</span>
        </button>
      </div>

      {/* Backend API Configuration Panel */}
      <div className="p-4 sm:p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Server className="w-4 h-4 text-[#FF9933] flex-shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            FastAPI Intelligence Backend Endpoint
          </h3>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          The frontend is architected to communicate seamlessly with your upcoming Python FastAPI backend and custom ML model. When ready, run your backend on the host below.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider block">
              API Base URL:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={API_BASE_URL}
                className="flex-1 px-3 py-2.5 sm:py-2 rounded-lg bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9933]"
              />
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {/* Connection Status Output */}
          {connectionStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg border text-xs font-sans ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {connectionStatus === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span className="font-bold font-mono">
                  {connectionStatus === 'connected' ? 'BACKEND CONNECTED' : 'BACKEND OFFLINE (STANDALONE DEMO)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">{statusMessage}</p>
            </div>
          )}
        </div>

        {/* API Contract Documentation */}
        <div className="p-3 sm:p-4 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Code className="w-4 h-4 text-[#FF9933] flex-shrink-0" />
            <span>Target Backend API Contract:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
            <div className="p-2.5 rounded bg-black/40 border border-white/10">
              <span className="text-emerald-400 font-bold">POST</span> /api/v1/investigate/url
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Accepts URL string, returns ML classification & lexical indicators.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/10">
              <span className="text-emerald-400 font-bold">POST</span> /api/v1/investigate/message
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Accepts message text, returns extracted IOCs & urgency score.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/10">
              <span className="text-sky-400 font-bold">GET</span> /api/v1/intelligence/domain?name=...
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Returns WHOIS registry data & DNS zone records.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/10">
              <span className="text-sky-400 font-bold">GET</span> /api/v1/intelligence/tls?domain=...
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Returns X.509 certificate chain, cipher suite & validity.</span>
            </div>
          </div>
        </div>
      </div>

      {/* SOC Workstation Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Interface Preferences */}
        <div className="p-4 sm:p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Monitor className="w-4 h-4 text-[#FF9933] flex-shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Visual & Display Preferences
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Flag Animation Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-bold text-white block">Tricolour Background</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-sans block line-clamp-1">
                  Ambient moving flag gradient
                </span>
              </div>
              <button
                onClick={() => onToggleFlagAnimation && onToggleFlagAnimation(!flagAnimationEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  flagAnimationEnabled ? 'bg-[#138808]' : 'bg-slate-700'
                }`}
                aria-label="Toggle animated background"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    flagAnimationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Density Toggle */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <div className="min-w-0">
                <span className="font-bold text-white block">Compact Display Density</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-sans block line-clamp-1">
                  Maximize viewport data display
                </span>
              </div>
              <button
                onClick={() => setCompactDensity(!compactDensity)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  compactDensity ? 'bg-[#FF9933]' : 'bg-slate-700'
                }`}
                aria-label="Toggle compact density"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    compactDensity ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry & Sensitivity */}
        <div className="p-4 sm:p-6 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Sliders className="w-4 h-4 text-[#FF9933] flex-shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Detection Sensitivity & Telemetry
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Risk Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-bold text-white">High-Risk Trigger Threshold</span>
                <span className="font-bold text-[#FF9933]">{riskThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(Number(e.target.value))}
                className="w-full accent-[#FF9933] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-sans block">
                Incidents scoring above {riskThreshold}% trigger automated High-Risk escalation.
              </span>
            </div>

            {/* Refresh Interval */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white block">Auto-Refresh</span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Feed polling rate
                </span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
              >
                <option value="15s">15 Seconds</option>
                <option value="30s">30 Seconds</option>
                <option value="60s">60 Seconds</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
