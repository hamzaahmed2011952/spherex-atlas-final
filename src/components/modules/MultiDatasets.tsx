import React from 'react';
import { useApp } from '../../context/AppContext';
import { ARCHIVE_DATASETS } from '../../data/missionData';
import {
  Database,
  ExternalLink,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const MultiDatasets: React.FC = () => {
  const { t, language } = useApp();

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-[#090E20] border border-cyan-950/60">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Database size={22} className="text-cyan-400" />
          <span>{t('datasetsTitle')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {t('datasetsSubtitle')}
        </p>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ARCHIVE_DATASETS.map((ds) => (
          <div
            key={ds.id}
            className="p-5 rounded-2xl bg-[#090E22] border border-slate-800/80 hover:border-cyan-800/60 shadow-xl flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    ds.accessStatus === 'Publicly Available'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : ds.accessStatus === 'Cross-Calibrated'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {ds.accessStatus}
                </span>

                <span className="text-[11px] font-mono text-slate-400">
                  DOI: {ds.doiCitation}
                </span>
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                {ds.name}
              </h2>

              <p className="text-xs font-mono text-cyan-400 mb-3">
                {ds.provider}
              </p>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {language === 'ar' ? ds.descriptionAr : ds.descriptionEn}
              </p>

              <div className="space-y-1.5 text-xs font-mono bg-[#060914] p-3 rounded-xl border border-slate-800/80 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('productType')}:</span>
                  <span className="text-slate-200">{ds.productType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('formatSpec')}:</span>
                  <span className="text-slate-200">{ds.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('coverageArea')}:</span>
                  <span className="text-slate-200">{ds.coverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wavelength:</span>
                  <span className="text-cyan-300 font-bold">{ds.wavelengthRange}</span>
                </div>
              </div>
            </div>

            <a
              href={ds.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{t('openOfficialArchive')}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
