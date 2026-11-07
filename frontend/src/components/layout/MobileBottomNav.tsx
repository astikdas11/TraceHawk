import React from 'react';
import {
  LayoutDashboard,
  Search,
  MessageSquareWarning,
  Database,
  Menu,
} from 'lucide-react';
import { DashboardViewId } from './Sidebar';

interface MobileBottomNavProps {
  currentView: DashboardViewId;
  onSelectView: (view: DashboardViewId) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenMenu,
}) => {
  const primaryTabs: Array<{ id: DashboardViewId; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'url', label: 'URL Forensics', icon: Search },
    { id: 'message', label: 'Messages', icon: MessageSquareWarning },
    { id: 'threat-intel', label: 'Intel Feeds', icon: Database },
  ];

  const isMoreActive = !primaryTabs.some((tab) => tab.id === currentView);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/10 px-1 py-1 font-mono select-none"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
                isActive
                  ? 'text-[#FF9933] font-bold'
                  : 'text-slate-400 hover:text-slate-200 active:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF9933]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[68px]">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More / All Modules Button */}
        <button
          onClick={onOpenMenu}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
            isMoreActive
              ? 'text-[#FF9933] font-bold'
              : 'text-slate-400 hover:text-slate-200 active:bg-white/5'
          }`}
        >
          <div className="relative">
            <Menu className="w-4 h-4" />
            {isMoreActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF9933] ring-2 ring-black" />
            )}
          </div>
          <span className="text-[10px] tracking-tight truncate max-w-[68px]">
            {isMoreActive ? 'Modules' : 'More'}
          </span>
        </button>
      </div>
    </nav>
  );
};

