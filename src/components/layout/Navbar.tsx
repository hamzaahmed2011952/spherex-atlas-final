import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Telescope,
  Languages,
  Search,
  Sparkles,
  BookmarkCheck,
  FileText,
  Satellite,
  Menu,
  X,
} from 'lucide-react';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const { language, setLanguage, t, activeModule, setActiveModule, selectedTarget, setSelectedTarget } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const filteredTargets = searchQuery.trim()
    ? TARGETS_CATALOG.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.canonicalName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSearchTarget = (target: any) => {
    setSelectedTarget(target);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setActiveModule('targets');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080C18]/90 backdrop-blur-md border-b border-cyan-950/40 text-slate-100 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
            aria-label="Toggle Navigation"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div
            onClick={() => setActiveModule('mission')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-violet-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)] group-hover:border-cyan-300 transition-all">
              <Telescope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider text-base text-white group-hover:text-cyan-300 transition-colors">
                  SPHEREx <span className="text-cyan-400 font-extrabold">ATLAS</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 rounded">
                  NASA MIDEX
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Target Search */}
        <div className="relative flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder={t('searchOnlinePlaceholder')}
              className="w-full bg-[#0E1528] border border-slate-800 rounded-lg pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          {showSearchDropdown && filteredTargets.length > 0 && (
            <div className="absolute top-full mt-1.5 w-full bg-[#0D1426] border border-slate-700/80 rounded-lg shadow-2xl py-1 z-50 max-h-60 overflow-y-auto">
              {filteredTargets.map((tgt) => (
                <button
                  key={tgt.id}
                  onClick={() => handleSelectSearchTarget(tgt)}
                  className="w-full text-left rtl:text-right px-3 py-2 text-xs hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 flex items-center justify-between border-b border-slate-800/40 last:border-none"
                >
                  <div>
                    <span className="font-medium text-white">{tgt.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      RA: {tgt.raHms} | Dec: {tgt.decDms}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {tgt.category.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Target Chip, Language & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Target indicator */}
          <button
            onClick={() => setActiveModule('targets')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0F172A] border border-cyan-900/50 text-xs text-cyan-300 hover:border-cyan-400 transition-colors"
            title="Active Astronomical Target"
          >
            <Satellite size={13} className="text-cyan-400 animate-pulse" />
            <span className="max-w-[120px] truncate font-mono text-[11px]">
              {selectedTarget.name.split('/')[0]}
            </span>
          </button>

          {/* Quick AI button */}
          <button
            onClick={() => setActiveModule('assistant')}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeModule === 'assistant'
                ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : 'bg-violet-950/50 border border-violet-800/60 text-violet-300 hover:bg-violet-900/60 hover:text-white'
            }`}
            title={t('navAssistant')}
          >
            <Sparkles size={14} />
            <span className="hidden md:inline">AI Assistant</span>
          </button>

          {/* Reports generator quick launch */}
          <button
            onClick={() => setActiveModule('reports')}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeModule === 'reports'
                ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-cyan-300'
            }`}
            title={t('navReports')}
          >
            <FileText size={14} />
            <span className="hidden md:inline">{t('navReports')}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-400 transition-all"
            title="Switch Language (English / العربية)"
          >
            <Languages size={14} className="text-cyan-400" />
            <span>{t('languageToggle')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
