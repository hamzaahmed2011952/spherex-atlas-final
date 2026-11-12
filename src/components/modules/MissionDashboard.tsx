import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Telescope,
  Atom,
  Sparkles,
  Droplets,
  Radio,
  CheckCircle2,
  ExternalLink,
  Compass,
  FileCode2,
  Activity,
  ArrowRight,
  Database,
  Layers,
  Cpu,
} from 'lucide-react';
import { SPHEREX_SPECS, DETECTOR_ARRAYS, OBSERVATIONS_TIMELINE } from '../../data/missionData';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';
import { SPECTRAL_DATASETS } from '../../data/spectraData';

export const MissionDashboard: React.FC = () => {
  const { t, language, setActiveModule, setSelectedTarget, savedResearch } = useApp();

  const completedObservations = OBSERVATIONS_TIMELINE.filter((o) => o.status === 'Completed').length;
  const savedTargetsCount = savedResearch.savedTargets.length;
  const notesCount = savedResearch.notes.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Hero: SPHEREx Mission Command Center */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1226] via-[#0E1733] to-[#121B3B] border border-cyan-900/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4">
            <Radio size={14} className="animate-pulse" />
            <span>NASA ASTROPHYSICS MIDEX MISSION • 102 SPECTROPHOTOMETRIC BANDS</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            SPHEREx ATLAS
          </h1>
          <p className="text-sm md:text-lg text-cyan-200/90 font-medium mt-1 mb-4">
            {language === 'ar'
              ? 'منصة الذكاء والاستكشاف الفلكي لطيف الكون تحت الأحمر'
              : 'Explore the Infrared Universe with High-Precision Spectrophotometry'}
          </p>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl mb-6">
            {t('missionSummary')}
          </p>

          {/* Quick Tool Launchers */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveModule('sky')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
            >
              <Compass size={16} />
              <span>{t('navSky')}</span>
              <ArrowRight size={14} className="rtl:rotate-180" />
            </button>

            <button
              onClick={() => setActiveModule('fits')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition-all"
            >
              <FileCode2 size={16} />
              <span>{t('navFits')}</span>
            </button>

            <button
              onClick={() => setActiveModule('spectra')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              <Activity size={16} />
              <span>{t('navSpectra')}</span>
            </button>

            <button
              onClick={() => setActiveModule('assistant')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-950/70 hover:bg-violet-900 text-violet-300 border border-violet-700/60 text-xs font-semibold transition-all"
            >
              <Sparkles size={16} />
              <span>{t('navAssistant')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Scientific Workspace Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#0B1020] border border-slate-800/80 hover:border-cyan-900/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{t('statTargetsAvailable')}</span>
            <Telescope size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {TARGETS_CATALOG.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {savedTargetsCount} saved in personal workspace
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1020] border border-slate-800/80 hover:border-cyan-900/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{t('statSpectraMapped')}</span>
            <Activity size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            102 <span className="text-sm font-normal text-slate-400">Channels</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {SPECTRAL_DATASETS.length} calibrated reference datasets
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1020] border border-slate-800/80 hover:border-cyan-900/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{t('statObservationsLogged')}</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {completedObservations} / {OBSERVATIONS_TIMELINE.length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Survey 1 & Deep Calibration completed</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1020] border border-slate-800/80 hover:border-cyan-900/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Personal Research Notes</span>
            <Database size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {notesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Persisted in active browser session
          </p>
        </div>
      </div>

      {/* 3 Core Scientific Pillars */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Atom size={18} className="text-cyan-400" />
          <span>SPHEREx Science Pillars</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1 */}
          <div className="p-5 rounded-xl bg-[#0C1224] border border-cyan-900/30 hover:border-cyan-500/50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
              <Atom size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1">
              {t('pillarCosmicInflation')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('pillarCosmicInflationDesc')}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-cyan-400">
              <span>Goal: Non-Gaussianity</span>
              <span className="font-bold">f_NL &lt; 1</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 rounded-xl bg-[#0C1224] border border-violet-900/30 hover:border-violet-500/50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-700/50 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-105 transition-transform">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1">
              {t('pillarGalaxyEvolution')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('pillarGalaxyEvolutionDesc')}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-violet-400">
              <span>Epoch: Reionization</span>
              <span className="font-bold">EBL Fluctuations</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-5 rounded-xl bg-[#0C1224] border border-blue-900/30 hover:border-blue-500/50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-700/50 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
              <Droplets size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1">
              {t('pillarInterstellarIces')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('pillarInterstellarIcesDesc')}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-blue-400">
              <span>Molecules: H2O, CO2, CO</span>
              <span className="font-bold">3.05 & 4.27 µm</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Linear Variable Filter (LVF) Detector Arrays Hardware Spec */}
      <div className="p-5 rounded-xl bg-[#0A0F1E] border border-slate-800/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              {t('specHardware')}
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            6 × Hawaii-2RG (2048 × 2048) Focal Plane Assemblies
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DETECTOR_ARRAYS.map((arr) => (
            <div
              key={arr.array}
              className="p-3.5 rounded-lg bg-[#0F162B] border border-slate-800 hover:border-cyan-800/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  ARRAY {arr.array}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {arr.range}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-2">
                <span>{arr.channels} Channels</span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">{arr.resolution}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {language === 'ar' ? arr.scienceFocusAr : arr.scienceFocusEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Targets Quick Access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Telescope size={18} className="text-cyan-400" />
            <span>{t('activeResearchTargets')}</span>
          </h2>
          <button
            onClick={() => setActiveModule('targets')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
          >
            <span>View All Targets</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TARGETS_CATALOG.slice(0, 4).map((tgt) => (
            <div
              key={tgt.id}
              onClick={() => {
                setSelectedTarget(tgt);
                setActiveModule('targets');
              }}
              className="group cursor-pointer rounded-xl bg-[#0B1022] border border-slate-800 hover:border-cyan-500/50 p-4 transition-all hover:-translate-y-0.5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700">
                    {tgt.category.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {tgt.spectralType?.split(' ')[0]}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {tgt.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  RA: {tgt.raHms}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Dec: {tgt.decDms}
                </p>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                  {language === 'ar' ? tgt.descriptionAr : tgt.descriptionEn}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-medium">
                <span>Inspect Target</span>
                <ArrowRight size={14} className="rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
