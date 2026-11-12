import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AstroTarget } from '../../types/astronomy';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';
import {
  Crosshair,
  Search,
  Bookmark,
  BookmarkCheck,
  FileCode2,
  Activity,
  Sparkles,
  ExternalLink,
  Layers,
  Compass,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const TargetIntelligence: React.FC = () => {
  const {
    t,
    language,
    selectedTarget,
    setSelectedTarget,
    savedResearch,
    toggleSaveTarget,
    setActiveModule,
    setArchiveObservations,
    setArchiveSearchMeta,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlineQuery, setOnlineQuery] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolverResult, setResolverResult] = useState<any | null>(null);
  const [resolverError, setResolverError] = useState<string | null>(null);
  const [archiveSearching, setArchiveSearching] = useState<boolean>(false);
  const [resolvedArchiveResult, setResolvedArchiveResult] = useState<any | null>(null);
  const resolveAbortRef = React.useRef<AbortController | null>(null);

  const isSaved = savedResearch.savedTargets.includes(selectedTarget.id);

  const filteredTargets = TARGETS_CATALOG.filter((tgt) => {
    if (categoryFilter === 'all') return true;
    return tgt.category === categoryFilter;
  });

  // Call server-side CDS Sesame / SIMBAD resolver
  const handleResolveOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onlineQuery.trim()) return;

    if (resolveAbortRef.current) {
      resolveAbortRef.current.abort();
    }
    const controller = new AbortController();
    resolveAbortRef.current = controller;

    setIsResolving(true);
    setResolverError(null);
    setResolverResult(null);
    setResolvedArchiveResult(null);

    try {
      const res = await fetch(
        `/api/astronomy/resolve?target=${encodeURIComponent(onlineQuery.trim())}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (res.ok && data.found) {
        setResolverResult(data);

        // Check if already in catalog or create new target
        const existing = TARGETS_CATALOG.find((t) =>
          t.name.toLowerCase().includes(data.target.toLowerCase()) ||
          t.canonicalName.toLowerCase().includes(data.target.toLowerCase())
        );

        if (existing) {
          setSelectedTarget(existing);
        } else {
          // Construct live resolved target
          const dynamicTarget: AstroTarget = {
            id: `target-resolved-${Date.now()}`,
            name: data.target,
            canonicalName: data.canonicalName || data.target,
            category: 'stellar_laboratory',
            ra: data.ra,
            dec: data.dec,
            raHms: data.raHms,
            decDms: data.decDms,
            spectralType: data.objectType || 'Astronomical Object',
            descriptionEn: `Astronomical object resolved via ${data.provenance || data.source}. Measured coordinates: RA ${data.raHms}, Dec ${data.decDms}.`,
            descriptionAr: `جرم فلكي تم تحليله عبر ${data.provenance || data.source}. الإحداثيات المقاسة: RA ${data.raHms}، Dec ${data.decDms}.`,
            spherexRelevanceEn: 'Subject to all-sky spectrophotometric survey pass observations across 102 channels.',
            spherexRelevanceAr: 'يخضع لمسح سفيريكس الشامل عبر 102 قناة طيفية ضوئية.',
            keyMolecules: [],
            sourceCatalog: data.source || 'CDS Sesame / SIMBAD',
          };
          setSelectedTarget(dynamicTarget);
        }
      } else {
        setResolverError(data.error || 'Failed to resolve astronomical object.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setResolverError('Network or server error while querying astronomical name resolver.');
    } finally {
      if (resolveAbortRef.current === controller) {
        setIsResolving(false);
      }
    }
  };

  const handleSearchArchiveAtResolved = async () => {
    if (!resolverResult) return;
    setArchiveSearching(true);
    setResolvedArchiveResult(null);
    try {
      const res = await fetch('/api/archive/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ra: resolverResult.ra,
          dec: resolverResult.dec,
          fov: 0.5,
          targetName: resolverResult.target,
        }),
      });
      const data = await res.json();
      setResolvedArchiveResult(data);
      if (res.ok) {
        const obsList = Array.isArray(data.observations) ? data.observations : [];
        setArchiveObservations(obsList);
        setArchiveSearchMeta({
          spherexAvailable: Boolean(data.spherexAvailable),
          dataStatus: data.dataStatus || (obsList.length > 0 ? 'REAL ARCHIVE DATA' : 'UNAVAILABLE DATA'),
          source: data.source || 'NASA/IPAC IRSA TAP (spherex.obscore)',
          notice: data.notice || '',
          ra: resolverResult.ra,
          dec: resolverResult.dec,
          radiusDeg: data.radiusDeg ?? 0.5,
          queryTimeMs: data.queryTimeMs,
        });
      }
    } catch (err: any) {
      setResolvedArchiveResult({
        dataStatus: 'UNAVAILABLE DATA',
        count: 0,
        notice: err.message || 'Failed to query SPHEREx archive',
      });
    } finally {
      setArchiveSearching(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-[#090E20] border border-cyan-950/60">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Crosshair size={22} className="text-cyan-400" />
          <span>{t('targetsTitle')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {t('targetsSubtitle')}
        </p>

        {/* Live CDS Sesame Resolver Form */}
        <form onSubmit={handleResolveOnline} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={onlineQuery}
              onChange={(e) => setOnlineQuery(e.target.value)}
              placeholder={t('searchOnlinePlaceholder')}
              className="w-full bg-[#0E1528] border border-slate-700/80 rounded-lg pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={isResolving}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
          >
            {isResolving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('resolvingTarget')}</span>
              </>
            ) : (
              <span>{t('resolveAction')}</span>
            )}
          </button>
        </form>

        {resolverError && (
          <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-mono">
            <AlertCircle size={14} />
            <span>{resolverError}</span>
          </div>
        )}

        {resolverResult && (
          <div className="mt-3 p-3 rounded-lg bg-[#0C1226] border border-cyan-900/60 space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>
                  Resolved "{resolverResult.target}" via {resolverResult.source} — RA: {resolverResult.raHms}, Dec: {resolverResult.decDms}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/70 text-[10px] font-bold">
                {resolverResult.dataStatus || 'EXTERNAL CATALOG DATA'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSearchArchiveAtResolved}
                disabled={archiveSearching}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1.5"
              >
                {archiveSearching ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Searching SPHEREx Archive...</span>
                  </>
                ) : (
                  <>
                    <Search size={12} />
                    <span>Search SPHEREx Archive at Resolved Coordinates</span>
                  </>
                )}
              </button>
              {resolvedArchiveResult && (
                <span
                  className={`text-[11px] font-bold ${
                    resolvedArchiveResult.count > 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {resolvedArchiveResult.dataStatus || (resolvedArchiveResult.count > 0 ? 'REAL ARCHIVE DATA' : 'UNAVAILABLE DATA')}:{' '}
                  {resolvedArchiveResult.count ?? 0} SPHEREx observations
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Target Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (1 col): Catalog Target List with category filters */}
        <div className="space-y-3">
          {/* Categories Pill Bar */}
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-[#0B1022] border border-slate-800">
            {[
              { id: 'all', label: t('filterAll') },
              { id: 'ice_target', label: t('filterIces') },
              { id: 'deep_field', label: t('filterDeep') },
              { id: 'starburst_galaxy', label: t('filterStarburst') },
              { id: 'exoplanet_host', label: t('filterExoplanet') },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Targets List */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredTargets.map((tgt) => {
              const isSelected = selectedTarget.id === tgt.id;
              return (
                <div
                  key={tgt.id}
                  onClick={() => setSelectedTarget(tgt)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0E1730] border-cyan-500/80 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                      : 'bg-[#090D1C] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {tgt.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tgt.spectralType?.split(' ')[0]}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white line-clamp-1">
                    {tgt.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-1 flex justify-between">
                    <span>RA: {tgt.raHms || `${tgt.ra.toFixed(2)}°`}</span>
                    <span>Dec: {tgt.decDms || `${tgt.dec.toFixed(2)}°`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 cols): Selected Target Scientific Dossier */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-[#090E22] border border-cyan-900/40 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Target Header & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                  {selectedTarget.category.replace('_', ' ')} • {selectedTarget.sourceCatalog}
                </span>
                <h2 className="text-2xl font-extrabold text-white">
                  {selectedTarget.name}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Canonical ID: {selectedTarget.canonicalName}
                </p>
              </div>

              <button
                onClick={() => toggleSaveTarget(selectedTarget.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isSaved
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400 hover:text-cyan-400'
                }`}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                <span>{isSaved ? t('savedToWorkspace') : t('saveToWorkspace')}</span>
              </button>
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#060914] border border-slate-800/80 font-mono text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Right Ascension (J2000)</span>
                <span className="text-white font-bold">{selectedTarget.raHms || `${selectedTarget.ra.toFixed(3)}°`}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Declination (J2000)</span>
                <span className="text-white font-bold">{selectedTarget.decDms || `${selectedTarget.dec.toFixed(3)}°`}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Galactic Longitude (l)</span>
                <span className="text-cyan-400">{selectedTarget.l !== undefined ? `${selectedTarget.l.toFixed(2)}°` : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Galactic Latitude (b)</span>
                <span className="text-cyan-400">{selectedTarget.b !== undefined ? `${selectedTarget.b.toFixed(2)}°` : '—'}</span>
              </div>
            </div>

            {/* Astrophysical Description & Science Relevance */}
            <div className="space-y-3 mb-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Astrophysical Characteristics
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {language === 'ar' ? selectedTarget.descriptionAr : selectedTarget.descriptionEn}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  SPHEREx Mission Relevance
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {language === 'ar' ? selectedTarget.spherexRelevanceAr : selectedTarget.spherexRelevanceEn}
                </p>
              </div>
            </div>

            {/* Key Molecules & Photometry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#060914] border border-slate-800/80 mb-5">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  {t('keyInfraredMolecules')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTarget.keyMolecules && selectedTarget.keyMolecules.length > 0 ? (
                    selectedTarget.keyMolecules.map((mol, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60"
                      >
                        {mol}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs italic font-mono">
                      Spectral features unverified / unavailable in external record
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  {t('photometricMagnitudes')}
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {selectedTarget.apparentMagnitude ? (
                    <>
                      {selectedTarget.apparentMagnitude.j && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          J: <strong className="text-white">{selectedTarget.apparentMagnitude.j}</strong>
                        </span>
                      )}
                      {selectedTarget.apparentMagnitude.h && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          H: <strong className="text-white">{selectedTarget.apparentMagnitude.h}</strong>
                        </span>
                      )}
                      {selectedTarget.apparentMagnitude.ks && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Ks: <strong className="text-white">{selectedTarget.apparentMagnitude.ks}</strong>
                        </span>
                      )}
                      {selectedTarget.apparentMagnitude.w1 && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          W1(3.4µm): <strong className="text-cyan-400">{selectedTarget.apparentMagnitude.w1}</strong>
                        </span>
                      )}
                      {selectedTarget.apparentMagnitude.w2 && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          W2(4.6µm): <strong className="text-cyan-400">{selectedTarget.apparentMagnitude.w2}</strong>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">Cross-match in progress</span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Tool Launchers for this target */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveModule('fits')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
              >
                <FileCode2 size={16} />
                <span>{t('viewInFitsLab')}</span>
              </button>

              <button
                onClick={() => setActiveModule('spectra')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
              >
                <Activity size={16} />
                <span>{t('viewInSpectra')}</span>
              </button>

              <button
                onClick={() => setActiveModule('assistant')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-950 hover:bg-violet-900 text-violet-300 border border-violet-800 text-xs font-bold transition-all"
              >
                <Sparkles size={16} />
                <span>Ask AI About Target</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
