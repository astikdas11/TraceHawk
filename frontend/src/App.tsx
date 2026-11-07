import React, { useState } from 'react';
import { LandingPage } from './views/LandingPage';
import { OverviewView } from './views/dashboard/OverviewView';
import { UrlInvestigationView } from './views/dashboard/UrlInvestigationView';
import { MessageAnalysisView } from './views/dashboard/MessageAnalysisView';
import { DomainIntelligenceView } from './views/dashboard/DomainIntelligenceView';
import { TlsIntelligenceView } from './views/dashboard/TlsIntelligenceView';
import { ThreatIntelligenceView } from './views/dashboard/ThreatIntelligenceView';
import { InvestigationHistoryView } from './views/dashboard/InvestigationHistoryView';
import { ReportsView } from './views/dashboard/ReportsView';
import { SettingsView } from './views/dashboard/SettingsView';
import { Sidebar, DashboardViewId } from './components/layout/Sidebar';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { AnimatedFlagBackground } from './components/brand/AnimatedFlagBackground';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>('landing');
  const [currentDashboardView, setCurrentDashboardView] = useState<DashboardViewId>('overview');
  const [activeTarget, setActiveTarget] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [flagAnimationEnabled, setFlagAnimationEnabled] = useState<boolean>(true);

  // Deep-link from Landing Page to Dashboard
  const handleLaunchDashboard = (initialView?: string, initialQuery?: string) => {
    setCurrentPage('dashboard');
    if (initialView) {
      setCurrentDashboardView(initialView as DashboardViewId);
    } else {
      setCurrentDashboardView('overview');
    }
    if (initialQuery) {
      setActiveTarget(initialQuery);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Internal Dashboard Navigation
  const handleNavigateDashboard = (view: DashboardViewId, target?: string) => {
    setCurrentDashboardView(view);
    if (target) {
      setActiveTarget(target);
    }
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGlobalSearch = (query: string) => {
    if (!query) return;
    if (query.startsWith('http://') || query.startsWith('https://')) {
      handleNavigateDashboard('url', query);
    } else if (query.includes('.') && !query.includes(' ')) {
      handleNavigateDashboard('domain', query);
    } else {
      handleNavigateDashboard('url', query);
    }
  };

  const getViewTitle = (view: DashboardViewId): string => {
    switch (view) {
      case 'overview':
        return 'Enterprise Threat Telemetry Overview';
      case 'url':
        return 'Intelligent URL Lexical Forensics';
      case 'message':
        return 'Phishing & Scam Message Analysis';
      case 'domain':
        return 'Authoritative Domain & DNS Intelligence';
      case 'tls':
        return 'X.509 Certificate Chain & Cryptographic Audit';
      case 'threat-intel':
        return 'Threat Intelligence Feeds & Corroboration';
      case 'history':
        return 'Forensic Investigation Audit Trail';
      case 'reports':
        return 'Forensic Intelligence Dossier Report';
      case 'settings':
        return 'Workstation Parameters & Backend Setup';
      default:
        return 'SOC Workstation';
    }
  };

  return (
    <div className="min-h-screen text-[#F4F5F2] relative overflow-x-hidden selection:bg-[#FF9933]/30 selection:text-white">
      {/* Animated Blurred Indian National Flag Colors Background */}
      {flagAnimationEnabled && <AnimatedFlagBackground />}

      {currentPage === 'landing' ? (
        <LandingPage onLaunchDashboard={handleLaunchDashboard} />
      ) : (
        <div className="relative z-10 flex min-h-screen">
          {/* Desktop Left Sidebar */}
          <div className="hidden md:block">
            <Sidebar
              currentView={currentDashboardView}
              onSelectView={(v) => handleNavigateDashboard(v)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onBackToLanding={handleBackToLanding}
            />
          </div>

          {/* Mobile Sidebar Overlay Drawer */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-black/95 backdrop-blur-xl h-full shadow-2xl flex flex-col z-10 border-r border-white/10 animate-in slide-in-from-left duration-200">
                <Sidebar
                  currentView={currentDashboardView}
                  onSelectView={(v) => handleNavigateDashboard(v)}
                  onBackToLanding={handleBackToLanding}
                  isMobile={true}
                  onClose={() => setIsMobileSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Main Dashboard Content Area */}
          <div
            className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
              isSidebarCollapsed ? 'md:ml-18' : 'md:ml-64'
            }`}
          >
            <DashboardHeader
              currentViewTitle={getViewTitle(currentDashboardView)}
              onSearchGlobal={handleGlobalSearch}
              onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
            />

            <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
              {currentDashboardView === 'overview' && (
                <OverviewView onNavigate={handleNavigateDashboard} />
              )}
              {currentDashboardView === 'url' && (
                <UrlInvestigationView
                  initialUrl={activeTarget || 'http://sbi-kyc-verify-portal.in'}
                  onNavigateToTls={(domain) => handleNavigateDashboard('tls', domain)}
                />
              )}
              {currentDashboardView === 'message' && (
                <MessageAnalysisView
                  onInvestigateUrl={(url) => handleNavigateDashboard('url', url)}
                />
              )}
              {currentDashboardView === 'domain' && (
                <DomainIntelligenceView
                  initialDomain={activeTarget || 'sbi-kyc-verify-portal.in'}
                  onInvestigateUrl={(url) => handleNavigateDashboard('url', url)}
                />
              )}
              {currentDashboardView === 'tls' && (
                <TlsIntelligenceView
                  initialDomain={activeTarget || 'sbi-kyc-verify-portal.in'}
                  onInvestigateUrl={(url) => handleNavigateDashboard('url', url)}
                />
              )}
              {currentDashboardView === 'threat-intel' && (
                <ThreatIntelligenceView />
              )}
              {currentDashboardView === 'history' && (
                <InvestigationHistoryView onNavigate={handleNavigateDashboard} />
              )}
              {currentDashboardView === 'reports' && (
                <ReportsView />
              )}
              {currentDashboardView === 'settings' && (
                <SettingsView
                  flagAnimationEnabled={flagAnimationEnabled}
                  onToggleFlagAnimation={setFlagAnimationEnabled}
                />
              )}
            </main>

            {/* Subdued SOC Footer */}
            <footer className="py-4 px-4 sm:px-6 pb-20 md:pb-4 border-t border-white/10 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-black/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933]" />
                <span className="text-slate-400 font-bold">TRACEHAWK // Hawk Shield</span>
                <span>•</span>
                <span>Enterprise SOC Workstation</span>
              </div>
              <div className="text-slate-500 text-[10px] text-center sm:text-right">
                Rigorous Evidence-Based Cyber Intelligence // No Fabrication
              </div>
            </footer>

            {/* Mobile Bottom Navigation Bar (Phone View) */}
            <MobileBottomNav
              currentView={currentDashboardView}
              onSelectView={(v) => handleNavigateDashboard(v)}
              onOpenMenu={() => setIsMobileSidebarOpen(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
