import React, { useState, useEffect } from 'react';
import { HawkShieldLogo } from '../brand/HawkShieldLogo';
import { ArrowRight, Shield, Terminal, Menu, X, ExternalLink } from 'lucide-react';

interface NavbarProps {
  onLaunchDashboard: () => void;
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLaunchDashboard,
  onNavigateSection,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Platform', id: 'platform' },
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Intelligence', id: 'intelligence' },
    { label: 'About', id: 'about' },
  ];

  const handleLinkClick = (id: string) => {
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-mono text-xs ${
        isScrolled
          ? 'bg-black/75 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3'
          : 'bg-transparent border-b border-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="cursor-pointer text-left focus:outline-none"
        >
          <HawkShieldLogo size="md" showTagline={false} />
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className="text-slate-300 hover:text-white transition-colors uppercase tracking-wider font-medium cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onLaunchDashboard}
            className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={onLaunchDashboard}
            className="px-4 py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68524] text-black font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm shadow-[#FF9933]/20 transition-all"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-white/10 border border-white/10 text-slate-200 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-5 space-y-4 shadow-xl">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="text-left text-slate-300 hover:text-white py-1.5 uppercase font-medium"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchDashboard();
              }}
              className="w-full py-2.5 rounded-lg bg-[#FF9933] text-black font-bold uppercase text-center"
            >
              Launch Dashboard
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

