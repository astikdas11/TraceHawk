import React from 'react';
import {
  LayoutDashboard,
  Search,
  MessageSquareWarning,
  Globe2,
  Lock,
  Database,
  History,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Home
} from 'lucide-react';
import { HawkShieldLogo } from '../brand/HawkShieldLogo';

export type DashboardViewId = 
  | 'overview'
  | 'url'
  | 'message'
  | 'domain'
  | 'tls'
  | 'threat-intel'
  | 'history'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentView: DashboardViewId;
  onSelectView: (view: DashboardViewId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onBackToLanding: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  onBackToLanding,
}) => {
  const navItems = [
    { id: 'overview' as DashboardViewId, label: 'Overview', icon: LayoutDashboard },
    { id: 'url' as DashboardViewId, label: 'URL Investigation', icon: Search },
    { id: 'message' as DashboardViewId, label: 'Message Analysis', icon: MessageSquareWarning },
    { id: 'domain' as DashboardViewId, label: 'Domain Intelligence', icon: Globe2 },
    { id: 'tls' as DashboardViewId, label: 'TLS Intelligence', icon: Lock },
    { id: 'threat-intel' as DashboardViewId, label: 'Threat Intelligence', icon: Database },
    { id: 'history' as DashboardViewId, label: 'Investigation History', icon: History },
    { id: 'reports' as DashboardViewId, label: 'Reports', icon: FileText },
    { id: 'settings' as DashboardViewId, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-black/80 backdrop-blur-md border-r border-white/10 transition-all duration-300 flex flex-col font-mono select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Header / Branding */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        {!isCollapsed ? (
          <button
            onClick={onBackToLanding}
            className="flex items-center text-left focus:outline-none cursor-pointer"
          >
            <HawkShieldLogo size="sm" showTagline={false} />
          </button>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#FF9933] border border-white/10">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Core Modules
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all font-medium cursor-pointer ${
                isActive
                  ? 'bg-white/15 text-white border-l-2 border-[#FF9933] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#FF9933]' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-white/10 space-y-2 flex-shrink-0">
        <button
          onClick={onBackToLanding}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Back to Landing Page"
        >
          <Home className="w-4 h-4 flex-shrink-0 text-slate-400" />
          {!isCollapsed && <span>Public Landing</span>}
        </button>

        {!isCollapsed && (
          <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-slate-500 text-left">
            <span className="text-slate-400 font-bold block">TRACEHAWK // v1.0</span>
            <span>SOC Workstation</span>
          </div>
        )}
      </div>
    </aside>
  );
};

