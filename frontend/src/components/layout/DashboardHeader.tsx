import React, { useState } from 'react';
import { Search, Bell, User, Shield, Menu, CheckCircle2, Terminal } from 'lucide-react';
import { DemoBanner } from '../common/DemoBanner';

interface DashboardHeaderProps {
  onSearchGlobal?: (query: string) => void;
  onMobileMenuToggle?: () => void;
  currentViewTitle: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onSearchGlobal,
  onMobileMenuToggle,
  currentViewTitle,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchGlobal && searchVal.trim()) {
      onSearchGlobal(searchVal.trim());
    }
  };

  return (
    <header className="h-16 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 font-mono select-none sticky top-0 z-30">
      {/* Left: Mobile Toggle & View Title */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="text-left">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
            WORKSTATION // SOC INTERFACE
          </span>
          <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
            {currentViewTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Global Search Input */}
      <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Global search: Enter URL, domain, or IOC..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#FF9933] transition-colors"
          />
        </div>
      </form>

      {/* Right: Demo Telemetry Badge, Notification, Profile */}
      <div className="flex items-center gap-3">
        {/* Demonstration Indicator */}
        <div className="hidden lg:block">
          <DemoBanner compact />
        </div>

        {/* Notifications Icon with popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#FF9933] absolute top-1.5 right-1.5 ring-2 ring-black" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl p-3 z-50 text-left text-xs font-mono space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-bold text-white uppercase text-[11px]">System Alerts (2)</span>
                <span className="text-[10px] text-slate-500">Live Telemetry</span>
              </div>
              <div className="space-y-1.5">
                <div className="p-2 rounded bg-white/5 border border-white/10 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold text-[10px]">THREAT CORRELATION</span>
                    <span className="text-[9px] text-slate-500">5m ago</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">New banking phishing cluster detected targeting sovereign portals.</p>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/10 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-[10px]">FEED SYNC OK</span>
                    <span className="text-[9px] text-slate-500">12m ago</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">URLhaus & PhishTank threat indicators synchronised successfully.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#FF9933]">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden xl:block text-left text-[11px]">
            <span className="font-bold text-white block leading-tight">Analyst 01</span>
            <span className="text-[9px] text-emerald-400">SOC Level 3</span>
          </div>
        </div>
      </div>
    </header>
  );
};

