import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppModule } from '../../types/astronomy';
import {
  LayoutDashboard,
  Compass,
  FileCode2,
  Crosshair,
  Activity,
  Clock,
  SplitSquareVertical,
  Database,
  Sparkles,
  FolderKanban,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemConfig {
  id: AppModule;
  labelKey: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeModule, setActiveModule, t, language } = useApp();

  const navItems: NavItemConfig[] = [
    {
      id: 'mission',
      labelKey: 'navMission',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'sky',
      labelKey: 'navSky',
      icon: <Compass size={18} />,
      badge: '3D',
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    },
    {
      id: 'fits',
      labelKey: 'navFits',
      icon: <FileCode2 size={18} />,
      badge: 'FITS',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    {
      id: 'targets',
      labelKey: 'navTargets',
      icon: <Crosshair size={18} />,
    },
    {
      id: 'spectra',
      labelKey: 'navSpectra',
      icon: <Activity size={18} />,
      badge: '102λ',
      badgeColor: 'bg-blue-950 text-blue-400 border-blue-800',
    },
    {
      id: 'timeline',
      labelKey: 'navTimeline',
      icon: <Clock size={18} />,
    },
    {
      id: 'comparison',
      labelKey: 'navComparison',
      icon: <SplitSquareVertical size={18} />,
    },
    {
      id: 'datasets',
      labelKey: 'navDatasets',
      icon: <Database size={18} />,
      badge: 'IRSA',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
    },
    {
      id: 'assistant',
      labelKey: 'navAssistant',
      icon: <Sparkles size={18} />,
      badge: 'AI',
      badgeColor: 'bg-violet-950 text-violet-300 border-violet-800',
    },
    {
      id: 'workspace',
      labelKey: 'navWorkspace',
      icon: <FolderKanban size={18} />,
    },
    {
      id: 'reports',
      labelKey: 'navReports',
      icon: <FileCheck2 size={18} />,
    },
  ];

  const handleSelect = (modId: AppModule) => {
    setActiveModule(modId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[53px] left-0 rtl:left-auto rtl:right-0 h-screen md:h-[calc(100vh-53px)] w-64 bg-[#090D1C] border-r rtl:border-r-0 rtl:border-l border-slate-800/80 z-50 transition-transform duration-300 flex flex-col justify-between overflow-y-auto ${
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full rtl:translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3">
          {/* Section Label */}
          <div className="px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-slate-500 font-semibold">
            Scientific Exploration Modules
          </div>

          {/* Navigation links */}
          <nav className="space-y-1 mt-1">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.15)] font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`transition-colors ${
                        isActive
                          ? 'text-cyan-400'
                          : 'text-slate-400 group-hover:text-cyan-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{t(item.labelKey)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive ? (
                      language === 'ar' ? (
                        <ChevronLeft size={14} className="text-cyan-400" />
                      ) : (
                        <ChevronRight size={14} className="text-cyan-400" />
                      )
                    ) : null}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Mission Spec Pill */}
        <div className="p-3 border-t border-slate-800/60 bg-[#070A14]">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between items-center text-slate-400 font-mono text-[10px]">
              <span>ORBIT</span>
              <span className="text-cyan-400 font-bold">700 km SSPO</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 font-mono text-[10px]">
              <span>BANDS</span>
              <span className="text-cyan-400 font-bold">102 (0.75-5 µm)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 font-mono text-[10px]">
              <span>PIXEL</span>
              <span className="text-cyan-400 font-bold">6.2" / pixel</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
