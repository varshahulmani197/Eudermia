import React, { useState } from 'react';
import {
  Sparkles,
  Scan,
  CalendarDays,
  Search,
  LineChart,
  BotMessageSquare,
  Sliders,
  Settings,
  Menu,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { SystemHealthStatus } from '../types/skinAnalysis.ts';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  systemHealth: SystemHealthStatus | null;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  systemHealth,
  onOpenSettings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'analysis', label: 'Skin Analysis', icon: Scan },
    { id: 'routine', label: 'Skincare Routine', icon: CalendarDays },
    { id: 'products', label: 'Product Explorer', icon: Search },
    { id: 'progress', label: 'Progress Tracker', icon: LineChart },
    { id: 'assistant', label: 'AI Skincare Advisor', icon: BotMessageSquare },
    { id: 'simulation', label: 'Before/After', icon: Sliders },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  const isYouCamReady = systemHealth?.config?.youcamConfigured ?? false;
  const isGeminiReady = systemHealth?.config?.geminiConfigured ?? false;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E6554] to-[#344538] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif-heading text-xl font-bold tracking-tight text-stone-900">
                  Eudermia
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  v2.1
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">AI Skincare Diagnostic Companion</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#4E6554] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-stone-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Status indicator & Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isYouCamReady
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to view API Configuration and Secrets status"
            >
              {isYouCamReady ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{isYouCamReady ? 'YouCam v2.1 Live' : 'API Key Setup'}</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="Settings"
              title="Settings & Diagnostics"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FAF8F5] px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="mb-2 pb-2 border-b border-stone-200">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                API Diagnostics
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  isYouCamReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isYouCamReady ? 'YouCam Connected' : 'YOUCAM_API_KEY Missing'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Gemini Advisor: {isGeminiReady ? 'Active' : 'Unconfigured'}
            </p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#4E6554] text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
