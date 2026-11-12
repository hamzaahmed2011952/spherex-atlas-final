import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OBSERVATIONS_TIMELINE } from '../../data/missionData';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';
import { ObservationRecord, AstroTarget } from '../../types/astronomy';
import {
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Calendar,
  Layers,
  Database,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  Sliders,
  Compass,
} from 'lucide-react';
import { createSyntheticFitsBuffer, parseFitsBuffer, renderFitsToCanvas, SyntheticDatasetType } from '../../services/fitsEngine';

// Challenge targets multi-epoch sequences
const TARGET_EPOCH_RECORDS: Record<string, ObservationRecord[]> = {
  'target-barnards-star': [
    {
      id: 'OBS-BARNARD-EP1',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: "Barnard's Star (Epoch 2020.5)",
      ra: 269.4521,
      dec: 4.6934,
      dateStart: '2020-06-15',
      dateEnd: '2020-06-15',
      exposureSec: 3600,
      instrument: 'NEOWISE-R W1 (3.4 µm)',
      band: 'W1 (3.4 µm)',
      detectorsActive: [1, 2],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'IRSA_WISE_BARNARD_2020',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 24,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: true,
      motionNote: 'High Proper Motion Benchmark: Initial 2020 baseline position (PA 355.9°)',
      fitsUrl: 'barnard_star_epoch1',
    },
    {
      id: 'OBS-BARNARD-EP2',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: "Barnard's Star (Epoch 2024.5)",
      ra: 269.4521,
      dec: 4.7048,
      dateStart: '2024-06-15',
      dateEnd: '2024-06-15',
      exposureSec: 3600,
      instrument: 'NEOWISE-R / SPHEREx Baseline',
      band: 'Array 4 (3.4 µm)',
      detectorsActive: [3, 4],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'IRSA_WISE_BARNARD_2024',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 28,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: true,
      motionNote: 'Proper Motion Detected: 41.4 arcsec cumulative displacement over 4.0 years (+6.7 pixels northward)',
      fitsUrl: 'barnard_star_epoch2',
    },
  ],
  'target-wise-0855': [
    {
      id: 'OBS-WISE0855-EP1',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: 'WISE J0855-0714 (Epoch 2021.2)',
      ra: 133.7951,
      dec: -7.2452,
      dateStart: '2021-03-20',
      dateEnd: '2021-03-20',
      exposureSec: 5400,
      instrument: 'WISE Cryogenic Survey W2 (4.6 µm)',
      band: 'W2 (4.6 µm)',
      detectorsActive: [2, 3],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'IRSA_WISE_0855_2021',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 16,
      sciencePillar: 'Interstellar Ices',
      hasMovingTargetCandidate: true,
      motionNote: 'Coldest sub-brown dwarf baseline position (T ~ 250 K)',
      fitsUrl: 'wise0855_epoch1',
    },
    {
      id: 'OBS-WISE0855-EP2',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: 'WISE J0855-0714 (Epoch 2024.2)',
      ra: 133.7883,
      dec: -7.2446,
      dateStart: '2024-03-20',
      dateEnd: '2024-03-20',
      exposureSec: 5400,
      instrument: 'NEOWISE-R Reactivated W2 (4.6 µm)',
      band: 'W2 (4.6 µm)',
      detectorsActive: [2, 3],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'IRSA_WISE_0855_2024',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 18,
      sciencePillar: 'Interstellar Ices',
      hasMovingTargetCandidate: true,
      motionNote: 'Extreme Sub-Brown Dwarf Motion: 24.6 arcsec shift westward (-3.9 pixels in RA across 3 years)',
      fitsUrl: 'wise0855_epoch2',
    },
  ],
  'target-r-draconis': [
    {
      id: 'OBS-RDRA-MAX',
      surveyPass: 'Survey 1',
      targetRegion: 'R Draconis (Mira Maximum Phase)',
      ra: 248.1675,
      dec: 66.755,
      dateStart: '2025-05-10',
      dateEnd: '2025-05-10',
      exposureSec: 2700,
      instrument: 'SPHEREx LVF Array 3',
      band: 'Array 3 (2.17 µm Ks band)',
      detectorsActive: [3],
      dataProductLevel: 'Level 2 (Calibrated Images)',
      irsaArchiveId: 'SPHEREx_RDRA_MAX_2025',
      status: 'Completed',
      dataStatus: 'REAL ARCHIVE DATA',
      coverageOverlapCount: 42,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: false,
      motionNote: 'Mira Maximum: Peak pulsating infrared flux of 820 MJy/sr at central position',
      fitsUrl: 'r_draconis_max',
    },
    {
      id: 'OBS-RDRA-MIN',
      surveyPass: 'Survey 2',
      targetRegion: 'R Draconis (Mira Minimum Phase)',
      ra: 248.1675,
      dec: 66.755,
      dateStart: '2025-09-12',
      dateEnd: '2025-09-12',
      exposureSec: 2700,
      instrument: 'SPHEREx LVF Array 3',
      band: 'Array 3 (2.17 µm Ks band)',
      detectorsActive: [3],
      dataProductLevel: 'Level 2 (Calibrated Images)',
      irsaArchiveId: 'SPHEREx_RDRA_MIN_2025',
      status: 'Completed',
      dataStatus: 'REAL ARCHIVE DATA',
      coverageOverlapCount: 48,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: false,
      motionNote: 'Mira Minimum: Pulsation decline to 85 MJy/sr (~10x amplitude variation; zero spatial motion)',
      fitsUrl: 'r_draconis_min',
    },
  ],
  'target-rw-aurigae': [
    {
      id: 'OBS-RWAUR-BRIGHT',
      surveyPass: 'Survey 1',
      targetRegion: 'RW Aurigae (Normal Bright Phase)',
      ra: 76.9563,
      dec: 30.4014,
      dateStart: '2024-11-01',
      dateEnd: '2024-11-01',
      exposureSec: 3000,
      instrument: 'SPHEREx LVF Array 4',
      band: 'Array 4 (3.4 µm)',
      detectorsActive: [4],
      dataProductLevel: 'Level 2 (Calibrated Images)',
      irsaArchiveId: 'SPHEREx_RWAUR_BRIGHT',
      status: 'Completed',
      dataStatus: 'REAL ARCHIVE DATA',
      coverageOverlapCount: 14,
      sciencePillar: 'Interstellar Ices',
      hasMovingTargetCandidate: false,
      motionNote: 'Unocculted T Tauri accretion state (Flux: 460 MJy/sr)',
      fitsUrl: 'rw_aurigae_bright',
    },
    {
      id: 'OBS-RWAUR-DIM',
      surveyPass: 'Survey 2',
      targetRegion: 'RW Aurigae (Dust Occultation Event)',
      ra: 76.9563,
      dec: 30.4014,
      dateStart: '2025-01-20',
      dateEnd: '2025-01-20',
      exposureSec: 3000,
      instrument: 'SPHEREx LVF Array 4',
      band: 'Array 4 (3.4 µm)',
      detectorsActive: [4],
      dataProductLevel: 'Level 2 (Calibrated Images)',
      irsaArchiveId: 'SPHEREx_RWAUR_DIM',
      status: 'Completed',
      dataStatus: 'REAL ARCHIVE DATA',
      coverageOverlapCount: 16,
      sciencePillar: 'Interstellar Ices',
      hasMovingTargetCandidate: false,
      motionNote: 'Circumstellar Dust Streamer Occultation: 3.8x flux dimming (Flux: 120 MJy/sr)',
      fitsUrl: 'rw_aurigae_dim',
    },
  ],
  'target-epsilon-indi-b': [
    {
      id: 'OBS-EPSIND-EP1',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: 'Epsilon Indi B (Epoch 2020.8)',
      ra: 331.0438,
      dec: -56.7828,
      dateStart: '2020-10-15',
      dateEnd: '2020-10-15',
      exposureSec: 3600,
      instrument: 'SPHEREx LVF Array 4',
      band: 'Array 4 (3.32 µm CH4)',
      detectorsActive: [4],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'SPHEREx_EPSIND_2020',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 30,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: true,
      motionNote: 'T-dwarf binary baseline epoch (pm = 4.70"/yr)',
      fitsUrl: 'epsilon_indi_epoch1',
    },
    {
      id: 'OBS-EPSIND-EP2',
      surveyPass: 'Multi-Epoch Archive',
      targetRegion: 'Epsilon Indi B (Epoch 2024.8)',
      ra: 331.0482,
      dec: -56.7856,
      dateStart: '2024-10-15',
      dateEnd: '2024-10-15',
      exposureSec: 3600,
      instrument: 'SPHEREx LVF Array 4',
      band: 'Array 4 (3.32 µm CH4)',
      detectorsActive: [4],
      dataProductLevel: 'Calibrated Archive',
      irsaArchiveId: 'SPHEREx_EPSIND_2024',
      status: 'Completed',
      dataStatus: 'SIMULATED DEMO DATA',
      isSimulatedOrDemo: true,
      coverageOverlapCount: 34,
      sciencePillar: 'Time-Domain Astrophysics',
      hasMovingTargetCandidate: true,
      motionNote: 'Brown dwarf binary proper motion: 18.8 arcsec cumulative shift over 4.0 years',
      fitsUrl: 'epsilon_indi_epoch2',
    },
  ],
};

export const ObservationTimeline: React.FC = () => {
  const {
    t,
    language,
    setActiveModule,
    timelineTarget,
    setTimelineTarget,
    setSelectedTarget,
    archiveObservations,
    setArchiveObservations,
    archiveSearchMeta,
    setArchiveSearchMeta,
    fetchRemoteFits,
  } = useApp();

  const [activeTargetId, setActiveTargetId] = useState<string>(timelineTarget?.id || 'target-barnards-star');
  const [activeObsIndex, setActiveObsIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x, 4x
  const [useDemoBenchmark, setUseDemoBenchmark] = useState<boolean>(false);
  const [fitsLoading, setFitsLoading] = useState<boolean>(false);
  const [fitsError, setFitsError] = useState<string | null>(null);
  const [targetSearching, setTargetSearching] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync timelineTarget if opened from SkyExplorer
  useEffect(() => {
    if (timelineTarget && timelineTarget.id) {
      setActiveTargetId(timelineTarget.id);
      setActiveObsIndex(0);
      setUseDemoBenchmark(false);
    }
  }, [timelineTarget]);

  const currentTarget = TARGETS_CATALOG.find((t) => t.id === activeTargetId);

  // Check if active archive observations match the current target's coordinates (within 0.5 deg)
  const isArchiveMatchesTarget = React.useMemo(() => {
    if (!archiveSearchMeta || !currentTarget) return false;
    const dra = Math.abs(archiveSearchMeta.ra - currentTarget.ra);
    const ddec = Math.abs(archiveSearchMeta.dec - currentTarget.dec);
    return dra < 0.6 && ddec < 0.6;
  }, [archiveSearchMeta, currentTarget]);

  // Sort real archive observations chronologically if available and matching target
  const targetArchiveObs = React.useMemo(() => {
    if (!isArchiveMatchesTarget || !archiveObservations || archiveObservations.length === 0) return [];
    return [...archiveObservations].sort((a, b) =>
      (a.dateStart || '').localeCompare(b.dateStart || '')
    );
  }, [isArchiveMatchesTarget, archiveObservations]);

  const demoObservations: ObservationRecord[] = (
    TARGET_EPOCH_RECORDS[activeTargetId] || OBSERVATIONS_TIMELINE
  ).map((obs) => ({
    ...obs,
    dataStatus: 'SIMULATED DEMO DATA',
    isSimulatedOrDemo: true,
  }));

  const currentObservations: ObservationRecord[] =
    targetArchiveObs.length > 0 && !useDemoBenchmark
      ? targetArchiveObs
      : useDemoBenchmark
      ? demoObservations
      : [];

  const activeObs = currentObservations[activeObsIndex] || currentObservations[0];

  const handleQueryCurrentTargetArchive = async () => {
    if (!currentTarget) return;
    setTargetSearching(true);
    setFitsError(null);
    try {
      const res = await fetch('/api/archive/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ra: currentTarget.ra,
          dec: currentTarget.dec,
          fov: 0.5,
          targetName: currentTarget.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const obsList = Array.isArray(data.observations) ? data.observations : [];
        setArchiveObservations(obsList);
        setArchiveSearchMeta({
          spherexAvailable: Boolean(data.spherexAvailable),
          dataStatus: data.dataStatus || (obsList.length > 0 ? 'REAL ARCHIVE DATA' : 'UNAVAILABLE DATA'),
          source: data.source || 'NASA/IPAC IRSA TAP (spherex.obscore)',
          notice: data.notice || '',
          ra: currentTarget.ra,
          dec: currentTarget.dec,
          radiusDeg: 0.25,
          queryTimeMs: data.queryTimeMs,
        });
        setUseDemoBenchmark(false);
        setActiveObsIndex(0);
      }
    } catch (err: any) {
      setFitsError(err.message || 'Failed to query archive for target');
    } finally {
      setTargetSearching(false);
    }
  };

  // Auto-advance time-lapse player
  useEffect(() => {
    if (!isPlaying || currentObservations.length <= 1) return;
    const intervalMs = 1600 / playbackSpeed;
    const timer = setInterval(() => {
      setActiveObsIndex((prev) => (prev + 1) % currentObservations.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, currentObservations.length]);

  // Render active observation to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeObs) return;

    const controller = new AbortController();
    setFitsError(null);

    if (activeObs.accessUrl && !activeObs.isSimulatedOrDemo) {
      setFitsLoading(true);
      fetchRemoteFits(activeObs.accessUrl, controller.signal)
        .then((hdu) => {
          if (!controller.signal.aborted) {
            renderFitsToCanvas(hdu, canvas, hdu.min, hdu.max * 0.9, 'asinh', 'inferno');
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setFitsError(err.message || 'Failed to load remote FITS product');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setFitsLoading(false);
          }
        });
    } else {
      try {
        const datasetKey = (activeObs.fitsUrl as SyntheticDatasetType) || 'cosmos_nir';
        const buf = createSyntheticFitsBuffer(datasetKey);
        const hdu = parseFitsBuffer(buf, {
          dataStatus: 'SIMULATED DEMO DATA',
          isSimulatedOrDemo: true,
          provenance: 'SPHEREx ATLAS Benchmark Simulation (Demo)',
        });
        renderFitsToCanvas(hdu, canvas, hdu.min, hdu.max * 0.9, 'asinh', 'inferno');
      } catch (err) {
        console.error('Failed to render timeline observation canvas:', err);
      }
    }

    return () => controller.abort();
  }, [activeObs, fetchRemoteFits]);

  const handleNext = () => {
    setActiveObsIndex((prev) => (prev + 1) % currentObservations.length);
  };

  const handlePrev = () => {
    setActiveObsIndex((prev) => (prev - 1 + currentObservations.length) % currentObservations.length);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-[#090E20] border border-cyan-950/60 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={22} className="text-cyan-400" />
            <span>{t('timelineTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Retrieve observations across dates, animate multi-epoch sequences, and evaluate proper motion versus flux variability.
          </p>
        </div>

        {/* Target Sequence Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Target:</span>
          <select
            value={activeTargetId}
            onChange={(e) => {
              setActiveTargetId(e.target.value);
              setActiveObsIndex(0);
              setIsPlaying(false);
              const found = TARGETS_CATALOG.find((t) => t.id === e.target.value);
              if (found) {
                setSelectedTarget(found);
                setTimelineTarget(found);
              }
            }}
            className="bg-[#0E1528] border border-cyan-700/60 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
          >
            <option value="target-barnards-star">Barnard's Star (Proper Motion: 10.3"/yr)</option>
            <option value="target-wise-0855">WISE 0855 (Cold Sub-Brown Dwarf: 8.2"/yr)</option>
            <option value="target-r-draconis">R Draconis (Mira Variable: &gt;8x Pulsation)</option>
            <option value="target-rw-aurigae">RW Aurigae (T Tauri: Dust Occultation)</option>
            <option value="target-epsilon-indi-b">Epsilon Indi B (Binary Dwarf: 4.7"/yr)</option>
            <option value="all-sky">SPHEREx All-Sky Mission Passes (Surveys 1-4)</option>
          </select>
        </div>
      </div>

      {/* Main Playback & Interactive Observation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 cols): Interactive Animation Canvas & Player Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-[#060914] border border-slate-800/80 p-4 shadow-2xl relative flex flex-col items-center">
            {/* Observation Header Readout */}
            {!activeObs ? (
              <div className="w-full py-16 px-6 text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono font-bold">
                  <AlertCircle size={14} />
                  <span>UNAVAILABLE DATA — No Real SPHEREx Archive Observations Loaded</span>
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Query a sky region in Sky Explorer to load real NASA/IPAC IRSA SPHEREx observations, or load the educational benchmark simulation below.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {currentTarget && (
                    <button
                      onClick={handleQueryCurrentTargetArchive}
                      disabled={targetSearching}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      {targetSearching ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span>Searching Archive...</span>
                        </>
                      ) : (
                        <span>Query SPHEREx Archive for {currentTarget.name}</span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModule('sky')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                  >
                    Open in Sky Explorer
                  </button>
                  <button
                    onClick={() => {
                      setUseDemoBenchmark(true);
                      setActiveObsIndex(0);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/60 text-xs font-semibold"
                  >
                    Load Educational Benchmark Simulation (Demo)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{activeObs.targetRegion}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{activeObs.dateStart}</span>
                    <span>•</span>
                    <span>{activeObs.instrument}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      !activeObs.isSimulatedOrDemo && activeObs.dataStatus === 'REAL ARCHIVE DATA'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {activeObs.isSimulatedOrDemo
                      ? 'SIMULATED DEMO DATA — NOT REAL SPHEREx OBSERVATIONS'
                      : activeObs.dataStatus || 'REAL ARCHIVE DATA'}
                  </span>
                </div>

                {/* Time-Lapse Canvas */}
                <div className="relative rounded-xl border border-slate-900 bg-black overflow-hidden shadow-2xl flex items-center justify-center min-h-[360px] w-full">
                  <canvas
                    ref={canvasRef}
                    className="max-h-[380px] w-auto image-rendering-pixelated rounded-lg shadow-inner"
                  />

                  {fitsLoading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-mono text-cyan-300">
                      Retrieving FITS product from NASA/IPAC IRSA...
                    </div>
                  )}

                  {fitsError && (
                    <div className="absolute bottom-3 left-3 right-3 p-2 rounded bg-rose-950/90 border border-rose-800 text-[11px] font-mono text-rose-200">
                      {fitsError}
                    </div>
                  )}

                  {/* Timestamp Overlay Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/80 border border-slate-800 text-[11px] font-mono text-white backdrop-blur-md flex items-center gap-1.5">
                    <Calendar size={13} className="text-cyan-400" />
                    <span>Date: {activeObs.dateStart}</span>
                  </div>

                  {/* Frame Indicator Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 border border-cyan-900/60 text-[11px] font-mono text-cyan-300 backdrop-blur-md">
                    Epoch {activeObsIndex + 1} of {currentObservations.length}
                  </div>
                </div>
              </>
            )}

            {/* Playback Controls Toolbar */}
            <div className="w-full mt-4 p-3 rounded-xl bg-[#0B1022] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Scrub Slider */}
              <div className="w-full sm:flex-1 flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  Epoch {activeObsIndex + 1}/{currentObservations.length}
                </span>
                <input
                  type="range"
                  min={0}
                  max={currentObservations.length - 1}
                  value={activeObsIndex}
                  onChange={(e) => {
                    setActiveObsIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Transport Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  title="Previous Observation"
                >
                  <SkipBack size={15} />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={15} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} />
                      <span>Play Sequence</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  title="Next Observation"
                >
                  <SkipForward size={15} />
                </button>

                {/* Speed Selector */}
                <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono ml-1">
                  {[0.5, 1.0, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        playbackSpeed === s
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Temporal Change & Motion Intelligence Card */}
          {activeObs?.motionNote && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              activeObs.hasMovingTargetCandidate
                ? 'bg-amber-950/20 border-amber-600/40'
                : 'bg-cyan-950/20 border-cyan-700/40'
            }`}>
              <Sparkles size={20} className={activeObs.hasMovingTargetCandidate ? 'text-amber-400 shrink-0 mt-0.5' : 'text-cyan-400 shrink-0 mt-0.5'} />
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider block text-white">
                  {activeObs.hasMovingTargetCandidate
                    ? 'Identified Proper Motion Candidate'
                    : 'Time-Domain Flux Variability (Non-Moving Source)'}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {activeObs.motionNote}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveModule('comparison')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 text-xs font-bold border border-cyan-700 transition-colors"
                  >
                    <span>Run Image Subtraction in Difference Lab</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Observation Record Dossier & Ephemeris */}
        <div className="space-y-4">
          {activeObs && (
          <div className="p-5 rounded-2xl bg-[#090E22] border border-cyan-900/40 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider block mb-1">
                {activeObs.surveyPass} Dossier
              </span>
              <h2 className="text-lg font-bold text-white">
                {activeObs.targetRegion}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Record: {activeObs.id}
              </p>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-white font-bold">{activeObs.dateStart}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Coordinates:</span>
                <span className="text-cyan-300">RA {activeObs.ra.toFixed(4)}°, Dec {activeObs.dec.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Instrument / Filter:</span>
                <span className="text-white">{activeObs.band}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">{t('totalExposure')}:</span>
                <span className="text-cyan-400 font-bold">{activeObs.exposureSec}s</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Overlap Redundancy:</span>
                <span className="text-emerald-400 font-bold">{activeObs.coverageOverlapCount} passes</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Product Level:</span>
                <span className="text-white">{activeObs.dataProductLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Archive Reference:</span>
                <span className="text-cyan-300">{activeObs.irsaArchiveId}</span>
              </div>
            </div>

            {/* Active Detectors */}
            <div className="pt-2">
              <span className="text-xs font-mono text-slate-400 block mb-2">
                Focal Plane LVF Detectors Active:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                {[1, 2, 3, 4, 5, 6].map((arr) => {
                  const isActive = activeObs.detectorsActive?.includes(arr);
                  return (
                    <div
                      key={arr}
                      className={`p-1.5 rounded font-bold border transition-colors ${
                        isActive
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}
                    >
                      Array {arr}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* IRSA Archive Notice */}
            <div className="p-3 rounded-lg bg-[#060914] border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                <Database size={13} />
                <span>NASA / IPAC Infrared Science Archive</span>
              </div>
              Calibrated Level 2 & Level 3 survey images with full spatial World Coordinate System (WCS) headers are archived at Caltech IRSA.
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
