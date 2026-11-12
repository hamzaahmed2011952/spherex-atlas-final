import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SplitSquareVertical,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ArrowLeftRight,
  Info,
  Sparkles,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  createSyntheticFitsBuffer,
  parseFitsBuffer,
  renderFitsToCanvas,
  computeImageDifference,
  ImageDiffResult,
  SyntheticDatasetType,
} from '../../services/fitsEngine';
import { FitsImageHDU } from '../../types/astronomy';

interface ComparisonPair {
  id: string;
  name: string;
  targetCategory: 'proper_motion' | 'pulsation' | 'dust_occultation' | 'cross_band';
  labelA: string;
  labelB: string;
  typeA: SyntheticDatasetType;
  typeB: SyntheticDatasetType;
  scientificContextEn: string;
  scientificContextAr: string;
}

const COMPARISON_PAIRS: ComparisonPair[] = [
  {
    id: 'pair-barnard',
    name: "Barnard's Star (10.3\"/yr Proper Motion)",
    targetCategory: 'proper_motion',
    labelA: "Barnard's Star (Epoch 2020.5)",
    labelB: "Barnard's Star (Epoch 2024.5)",
    typeA: 'barnard_star_epoch1',
    typeB: 'barnard_star_epoch2',
    scientificContextEn:
      'Synthetic benchmark modeling a dipolar PSF residual: a flux deficit at the 2020 position alongside a positive flux excess at the 2024 position, illustrating candidate spatial displacement (+10.3 arcsec/yr) rather than intrinsic photometric variability.',
    scientificContextAr:
      'نموذج اصطناعي مرجعي يوضح نمطاً ثنائي القطب للحركة الذاتية: عجز في التدفق بموقع 2020 وفائض موجب بموقع 2024، كنموذج لإزاحة مكانية مرشحة بدلاً من تغير سطوعي.',
  },
  {
    id: 'pair-wise0855',
    name: 'WISE 0855 (Coldest Sub-Brown Dwarf)',
    targetCategory: 'proper_motion',
    labelA: 'WISE J0855-0714 (Epoch 2021.2)',
    labelB: 'WISE J0855-0714 (Epoch 2024.2)',
    typeA: 'wise0855_epoch1',
    typeB: 'wise0855_epoch2',
    scientificContextEn:
      'Synthetic simulation of sub-brown dwarf with T ~ 250 K exhibiting westward proper motion (8.19 arcsec/yr). Difference subtraction highlights the displacement between consecutive 3-year epochs against stationary background field stars.',
    scientificContextAr:
      'محاكاة اصطناعية لقزم شبه بني بحرارة 250 كلفن يُظهر حركة ذاتية غربية (8.19 ثانية قوسية/سنة). يُبرز الطرح الإزاحة عبر فترة 3 سنوات مقارنة بنجوم الخلفية الثابتة.',
  },
  {
    id: 'pair-r-draconis',
    name: 'R Draconis (Extreme Mira Variable)',
    targetCategory: 'pulsation',
    labelA: 'R Draconis (Mira Maximum Phase)',
    labelB: 'R Draconis (Mira Minimum Phase)',
    typeA: 'r_draconis_max',
    typeB: 'r_draconis_min',
    scientificContextEn:
      'Demonstrates synthetic modeling of time-domain stellar pulsation. The difference map exhibits a single, symmetric central residual peak with zero spatial dipole, consistent with simulated candidate flux variability with zero proper motion.',
    scientificContextAr:
      'يوضح محاكاة اصطناعية للنبض النجمي عبر الزمن. تُظهر خريطة الطرح ذروة متبقية مركزية متناظرة أحادية دون إزاحة مكانية ثنائية القطب، بما يتسق مع تغير ضوئي مرشح دون حركة ذاتية.',
  },
  {
    id: 'pair-rw-aurigae',
    name: 'RW Aurigae (Accretion & Dust Occultation)',
    targetCategory: 'dust_occultation',
    labelA: 'RW Aurigae (Normal Bright State)',
    labelB: 'RW Aurigae (Circumstellar Dust Dimming)',
    typeA: 'rw_aurigae_bright',
    typeB: 'rw_aurigae_dim',
    scientificContextEn:
      'Circumstellar dust streamer occultation. The difference image reveals substantial flux attenuation (3.8x decrease) caused by opaque tidal dust streams obscuring the central T Tauri star without positional shift.',
    scientificContextAr:
      'احتجاب بأشرطة الغبار المحيطة بالنجم. تُظهر صورة الطرح انخفاضاً كبيراً في التدفق (3.8 أضعاف) ناتجاً عن غبار المد والجزر المعتم الذي يحجب النجم الشاب دون تغير موضعه.',
  },
  {
    id: 'pair-epsilon-indi',
    name: 'Epsilon Indi B (Binary Brown Dwarf)',
    targetCategory: 'proper_motion',
    labelA: 'Epsilon Indi B (Epoch 2020.8)',
    labelB: 'Epsilon Indi B (Epoch 2024.8)',
    typeA: 'epsilon_indi_epoch1',
    typeB: 'epsilon_indi_epoch2',
    scientificContextEn:
      'Nearby T-dwarf binary brown dwarf system. Multi-epoch subtraction isolates its 4.70 arcsec/yr proper motion displacement vector over a 4-year baseline.',
    scientificContextAr:
      'نظام ثنائي من الأقزام البنية القريبة. يعزل طرح الصور عبر الحقب إزاحة حركته الذاتية البالغة 4.70 ثانية قوسية/سنة عبر 4 سنوات.',
  },
  {
    id: 'pair-ices-deep',
    name: 'Cross-Band: Orion Ice (3.05 µm) vs COSMOS NIR',
    targetCategory: 'cross_band',
    labelA: 'Orion KL Ice Band (3.05 µm)',
    labelB: 'COSMOS Deep NIR (2.0 µm)',
    typeA: 'orion_ice',
    typeB: 'cosmos_nir',
    scientificContextEn:
      'Cross-wavelength band comparison highlighting dense interstellar water ice absorption and filamentary nebulosity in Orion against the diffuse extragalactic background light in COSMOS.',
    scientificContextAr:
      'مقارنة متعددة الأطوال الموجية تبرز امتصاص جليد الماء والسدم الخيطية في الجبار مقابل الضوء الخلفي خارج المجري في حقل كوزموس.',
  },
];

export const ImageComparison: React.FC = () => {
  const { t, language } = useApp();

  const [selectedPairId, setSelectedPairId] = useState<string>('pair-barnard');
  const [mode, setMode] = useState<'difference' | 'curtain' | 'sideBySide' | 'blend'>('difference');
  const [curtainPos, setCurtainPos] = useState<number>(50); // percentage [0, 100]
  const [blendOpacity, setBlendOpacity] = useState<number>(50);
  const [syncZoom, setSyncZoom] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [imageA, setImageA] = useState<FitsImageHDU | null>(null);
  const [imageB, setImageB] = useState<FitsImageHDU | null>(null);
  const [diffResult, setDiffResult] = useState<ImageDiffResult | null>(null);

  const canvasARef = useRef<HTMLCanvasElement | null>(null);
  const canvasBRef = useRef<HTMLCanvasElement | null>(null);
  const curtainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePair = COMPARISON_PAIRS.find((p) => p.id === selectedPairId) || COMPARISON_PAIRS[0];

  // Load active comparison datasets
  useEffect(() => {
    try {
      const bufA = createSyntheticFitsBuffer(activePair.typeA);
      const parsedA = parseFitsBuffer(bufA, {
        dataStatus: 'SIMULATED DEMO DATA',
        isSimulatedOrDemo: true,
        provenance: 'SPHEREx ATLAS Synthetic Comparison Pair (Demo)',
      });
      setImageA(parsedA);

      const bufB = createSyntheticFitsBuffer(activePair.typeB);
      const parsedB = parseFitsBuffer(bufB, {
        dataStatus: 'SIMULATED DEMO DATA',
        isSimulatedOrDemo: true,
        provenance: 'SPHEREx ATLAS Synthetic Comparison Pair (Demo)',
      });
      setImageB(parsedB);

      // Compute astronomical image difference
      const diff = computeImageDifference(parsedA, parsedB);
      setDiffResult(diff);
    } catch (e) {
      console.error('Failed to load comparison dataset pair:', e);
    }
  }, [activePair]);

  // Render individual canvases
  useEffect(() => {
    if (imageA && canvasARef.current) {
      renderFitsToCanvas(imageA, canvasARef.current, imageA.min, imageA.max * 0.9, 'asinh', 'inferno');
    }
    if (imageB && canvasBRef.current) {
      renderFitsToCanvas(imageB, canvasBRef.current, imageB.min, imageB.max * 0.9, 'asinh', 'inferno');
    }
  }, [imageA, imageB]);

  // Render Difference Canvas
  useEffect(() => {
    if (diffResult && diffCanvasRef.current) {
      const hdu = diffResult.diffHdu;
      renderFitsToCanvas(hdu, diffCanvasRef.current, hdu.min * 0.8, hdu.max * 0.8, 'linear', 'coolwarm');
    }
  }, [diffResult]);

  // Render Curtain / Blend Canvas
  useEffect(() => {
    const canvas = curtainCanvasRef.current;
    if (!canvas || !imageA || !imageB || !canvasARef.current || !canvasBRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 480;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (mode === 'curtain') {
      ctx.drawImage(canvasARef.current, 0, 0, width, height);

      const splitX = (curtainPos / 100) * width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, width - splitX, height);
      ctx.clip();
      ctx.drawImage(canvasBRef.current, 0, 0, width, height);
      ctx.restore();

      // Divider line
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();
    } else if (mode === 'blend') {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(canvasARef.current, 0, 0, width, height);

      ctx.globalAlpha = blendOpacity / 100;
      ctx.drawImage(canvasBRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  }, [mode, curtainPos, blendOpacity, imageA, imageB]);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-[#090E20] border border-cyan-950/60 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <SplitSquareVertical size={22} className="text-cyan-400" />
            <span>{t('comparisonTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Astronomical image subtraction (I_diff = I_A - I_B), statistical residual metrics, and time-domain change detection.
          </p>
        </div>

        {/* Pair & Mode Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Pair Dropdown */}
          <select
            value={selectedPairId}
            onChange={(e) => setSelectedPairId(e.target.value)}
            className="bg-[#0E1528] border border-cyan-700/60 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
          >
            {COMPARISON_PAIRS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setMode('difference')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'difference' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Difference Map
            </button>
            <button
              onClick={() => setMode('curtain')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'curtain' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Curtain
            </button>
            <button
              onClick={() => setMode('sideBySide')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'sideBySide' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setMode('blend')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'blend' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Blend
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#060914] border border-slate-800/80 shadow-2xl space-y-4">
        {mode === 'difference' ? (
          /* Difference Imaging Subtraction View */
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-2 px-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Image Subtraction Residual:</span>
                <span className="text-slate-300">I_diff = [{activePair.labelA}] - [{activePair.labelB}]</span>
              </div>
              <span className="text-slate-400">Palette: Coolwarm (Blue = Negative Deficit, Red = Positive Excess)</span>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-black overflow-hidden shadow-2xl flex items-center justify-center min-h-[420px] w-full max-w-2xl">
              <canvas
                ref={diffCanvasRef}
                className="max-h-[420px] w-auto image-rendering-pixelated rounded-lg shadow-inner"
              />

              {/* Overlaid Candidate Centroids */}
              {diffResult && diffResult.candidateCentroids.map((cand, idx) => (
                <div
                  key={idx}
                  className="absolute pointer-events-none flex flex-col items-center"
                  style={{
                    left: `${(cand.x / 256) * 100}%`,
                    top: `${(1 - cand.y / 256) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-cyan-300 border border-cyan-800 whitespace-nowrap mt-1">
                    {cand.type === 'moving_candidate' ? 'Δ Pos (>5σ)' : 'Δ Flux'}
                  </span>
                </div>
              ))}
            </div>

            {/* Statistical Difference Metrics Card */}
            {diffResult && (
              <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-[#090E22] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Mean Residual (Δμ)</span>
                  <span className="text-white font-bold">{diffResult.meanDiff.toFixed(2)} MJy/sr</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090E22] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">RMS Diff (σ_Δ)</span>
                  <span className="text-cyan-400 font-bold">{diffResult.rmsDiff.toFixed(2)} MJy/sr</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090E22] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Peak Difference</span>
                  <span className="text-amber-400 font-bold">{diffResult.maxDiff.toFixed(1)} MJy/sr</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090E22] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Change Pixels (&gt;3.5σ)</span>
                  <span className="text-emerald-400 font-bold">{diffResult.candidatePixelsCount} px</span>
                </div>
              </div>
            )}
          </div>
        ) : mode === 'sideBySide' ? (
          /* Side-by-Side Dual View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 flex flex-col items-center">
              <div className="w-full flex justify-between text-xs font-mono text-cyan-400 mb-2">
                <span>EPOCH A: {activePair.labelA}</span>
                <span className="text-slate-400">Inferno Palette</span>
              </div>
              <canvas
                ref={canvasARef}
                className="max-h-[380px] w-auto rounded-lg border border-slate-900 image-rendering-pixelated"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 flex flex-col items-center">
              <div className="w-full flex justify-between text-xs font-mono text-amber-400 mb-2">
                <span>EPOCH B: {activePair.labelB}</span>
                <span className="text-slate-400">Inferno Palette</span>
              </div>
              <canvas
                ref={canvasBRef}
                className="max-h-[380px] w-auto rounded-lg border border-slate-900 image-rendering-pixelated"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>
          </div>
        ) : (
          /* Curtain or Blend Unified Canvas View */
          <div className="flex flex-col items-center justify-center space-y-4">
            <canvas ref={canvasARef} className="hidden" />
            <canvas ref={canvasBRef} className="hidden" />

            <div className="relative rounded-xl border border-slate-800 overflow-hidden shadow-2xl bg-black">
              <canvas
                ref={curtainCanvasRef}
                className="max-h-[440px] w-auto image-rendering-pixelated cursor-ew-resize"
              />

              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-cyan-400 font-mono text-[11px] border border-cyan-900/50">
                Left: {activePair.labelA}
              </div>
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-amber-400 font-mono text-[11px] border border-amber-900/50">
                Right: {activePair.labelB}
              </div>
            </div>

            {/* Slider Controls */}
            <div className="w-full max-w-md p-3 rounded-xl bg-[#0A0F22] border border-slate-800 space-y-2">
              {mode === 'curtain' ? (
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Curtain Split Position</span>
                    <span className="text-cyan-400 font-bold">{curtainPos}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={curtainPos}
                    onChange={(e) => setCurtainPos(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Overlay Blend Opacity</span>
                    <span className="text-cyan-400 font-bold">{blendOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={blendOpacity}
                    onChange={(e) => setBlendOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scientific Change Classification Dossier */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" />
            <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
              Scientific Change Classification &amp; Temporal Analysis
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-[#090E20] border border-cyan-900/40 text-xs text-slate-300 font-mono leading-relaxed space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-bold">
                PROVENANCE: {diffResult?.diffHdu?.isSimulatedOrDemo ? 'SIMULATED DEMO DATA' : diffResult?.diffHdu?.dataStatus || 'SIMULATED DEMO DATA'}
              </span>
              {diffResult && (
                <span className="text-cyan-300">
                  Candidate Pixels (&gt;3σ): {diffResult.candidatePixelsCount}
                </span>
              )}
            </div>
            {diffResult?.compatibility?.warnings && diffResult.compatibility.warnings.length > 0 && (
              <div className="p-2.5 rounded bg-amber-950/50 border border-amber-800/70 text-amber-200 text-[11px] space-y-1">
                <div className="font-bold">Compatibility Warnings:</div>
                {diffResult.compatibility.warnings.map((w, idx) => (
                  <div key={idx}>• {w}</div>
                ))}
              </div>
            )}
            {diffResult && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>Mean Δ: <span className="text-white">{diffResult.meanDiff.toExponential(3)}</span></div>
                <div>RMS Δ: <span className="text-white">{diffResult.rmsDiff.toExponential(3)}</span></div>
                <div>Max |Δ|: <span className="text-white">{diffResult.maxDiff.toExponential(3)}</span></div>
              </div>
            )}
            <p className="text-slate-400 text-[11px] pt-1">
              Note: Pixel-by-pixel subtraction identifies statistical candidate detections only, not confirmed astrophysical discoveries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
