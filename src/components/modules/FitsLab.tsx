import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileCode2,
  Upload,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Palette,
  Search,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  parseFitsBuffer,
  renderFitsToCanvas,
  applyStretch,
  createSyntheticFitsBuffer,
} from '../../services/fitsEngine';
import { StretchAlgorithm, ColormapPalette, FitsImageHDU } from '../../types/astronomy';

export const FitsLab: React.FC = () => {
  const { t, language, activeFitsImage, setActiveFitsImage, loadSampleFitsByName } = useApp();

  const [stretch, setStretch] = useState<StretchAlgorithm>('asinh');
  const [palette, setPalette] = useState<ColormapPalette>('inferno');
  const [minCut, setMinCut] = useState<number>(0);
  const [maxCut, setMaxCut] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(0.0);
  const [zoom, setZoom] = useState<number>(1.2);

  const [headerFilter, setHeaderFilter] = useState<string>('');
  const [inspectPixel, setInspectPixel] = useState<{
    x: number;
    y: number;
    rawVal: number;
    normVal: number;
    ra?: number;
    dec?: number;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize min/max cuts when activeFitsImage loads
  useEffect(() => {
    if (activeFitsImage) {
      // Default cuts: 0.5% percentile to 99.5%
      const dataMin = activeFitsImage.min;
      const dataMax = activeFitsImage.max;
      const range = dataMax - dataMin || 1;

      // ZScale heuristic approximation
      const defaultLow = dataMin + range * 0.02;
      const defaultHigh = dataMin + range * 0.95;

      setMinCut(Number(defaultLow.toFixed(2)));
      setMaxCut(Number(defaultHigh.toFixed(2)));
    }
  }, [activeFitsImage]);

  // Re-render canvas when image, stretch, palette, cuts, or adjustments change
  useEffect(() => {
    if (!activeFitsImage || !canvasRef.current) return;
    renderFitsToCanvas(
      activeFitsImage,
      canvasRef.current,
      minCut,
      maxCut,
      stretch,
      palette,
      contrast,
      brightness
    );
  }, [activeFitsImage, minCut, maxCut, stretch, palette, contrast, brightness]);

  // Handle custom FITS file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseFitsBuffer(buffer);
        setActiveFitsImage(parsed);
      } catch (err: any) {
        setErrorMessage(`FITS parsing error: ${err.message || 'Malformed FITS header or data'}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read local file.');
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseFitsBuffer(buffer);
        setActiveFitsImage(parsed);
      } catch (err: any) {
        setErrorMessage(`FITS parsing error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Canvas Mouse Move Inspector
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeFitsImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const screenX = Math.floor((e.clientX - rect.left) * scaleX);
    const screenY = Math.floor((e.clientY - rect.top) * scaleY);

    if (screenX >= 0 && screenX < activeFitsImage.naxis1 && screenY >= 0 && screenY < activeFitsImage.naxis2) {
      // Screen Y is flipped from FITS convention
      const fitsY = activeFitsImage.naxis2 - 1 - screenY;
      const index = fitsY * activeFitsImage.naxis1 + screenX;
      const rawVal = activeFitsImage.data[index] ?? 0;
      const normVal = applyStretch(rawVal, minCut, maxCut, stretch, contrast, brightness);

      let ra: number | undefined;
      let dec: number | undefined;

      if (activeFitsImage.wcs) {
        const dx = screenX - activeFitsImage.wcs.crpix1;
        const dy = fitsY - activeFitsImage.wcs.crpix2;
        ra = activeFitsImage.wcs.crval1 + dx * activeFitsImage.wcs.cdelt1;
        dec = activeFitsImage.wcs.crval2 + dy * activeFitsImage.wcs.cdelt2;
      }

      setInspectPixel({
        x: screenX,
        y: fitsY,
        rawVal,
        normVal,
        ra,
        dec,
      });
    }
  };

  const handleDownloadActiveFits = () => {
    if (!activeFitsImage) return;
    let buffer: ArrayBuffer;
    if (activeFitsImage.rawBuffer && activeFitsImage.rawBuffer.byteLength > 0) {
      // Preserve exact uploaded/retrieved FITS bytes
      buffer = activeFitsImage.rawBuffer;
    } else {
      // Fallback to synthesizing calibrated FITS buffer
      buffer = createSyntheticFitsBuffer('cosmos_nir');
    }
    const blob = new Blob([buffer], { type: 'application/fits' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFitsImage.name.replace(/\s+/g, '_')}.fits`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCards = activeFitsImage
    ? activeFitsImage.headerCards.filter((c) =>
        c.key.toLowerCase().includes(headerFilter.toLowerCase()) ||
        String(c.value).toLowerCase().includes(headerFilter.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Dataset Selection Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-[#090E20] border border-cyan-950/60">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode2 size={22} className="text-cyan-400" />
            <span>{t('fitsLabTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('fitsLabSubtitle')}
          </p>
        </div>

        {/* Action buttons: Upload & Sample buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".fits,.fit,.fts"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Upload size={14} />
            <span>{t('uploadFits')}</span>
          </button>

          {/* Sample Selectors */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => loadSampleFitsByName('cosmos_nir')}
              className="px-2.5 py-1 rounded text-slate-300 hover:text-cyan-400 transition-colors"
            >
              COSMOS IR
            </button>
            <button
              onClick={() => loadSampleFitsByName('orion_ice')}
              className="px-2.5 py-1 rounded text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Orion Ice (3.05µm)
            </button>
            <button
              onClick={() => loadSampleFitsByName('nep_deep')}
              className="px-2.5 py-1 rounded text-slate-300 hover:text-cyan-400 transition-colors"
            >
              NEP Deep Stack
            </button>
          </div>

          <button
            onClick={handleDownloadActiveFits}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            title={t('downloadFits')}
          >
            <Download size={14} />
            <span className="hidden sm:inline">{t('downloadFits')}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column FITS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 cols): Canvas Viewport & Stretch Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas Viewport Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-2xl bg-[#060914] border border-slate-800/80 p-4 relative flex flex-col items-center justify-center min-h-[440px] shadow-2xl overflow-hidden"
          >
            {/* Top Image Metadata Header */}
            {activeFitsImage && (
              <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">{activeFitsImage.name}</span>
                  <span>•</span>
                  <span>{activeFitsImage.naxis1} × {activeFitsImage.naxis2} px</span>
                  <span>•</span>
                  <span>BITPIX: {activeFitsImage.bitpix}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    !activeFitsImage.isSimulatedOrDemo && activeFitsImage.dataStatus === 'REAL ARCHIVE DATA'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                  }`}>
                    {activeFitsImage.isSimulatedOrDemo
                      ? 'SIMULATED DEMO DATA'
                      : activeFitsImage.dataStatus || 'EXTERNAL CATALOG DATA'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>{activeFitsImage.headerCards.find((c) => c.key === 'FILTER')?.value || 'SPHEREx Near-IR'}</span>
                  {!activeFitsImage.wcs && (
                    <span className="text-amber-400/90">• WCS: Unavailable in FITS header</span>
                  )}
                </div>
              </div>
            )}

            {/* Interactive Image Canvas */}
            <div
              className="relative overflow-hidden flex items-center justify-center rounded-lg border border-slate-900 bg-black cursor-crosshair"
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setInspectPixel(null)}
                className="max-h-[380px] w-auto image-rendering-pixelated"
              />
            </div>

            {/* Viewport Zoom Overlay */}
            <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 flex items-center gap-1 bg-[#0A0F22]/90 border border-slate-800 p-1 rounded-lg z-10 shadow-lg">
              <button
                onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => setZoom(1.2)}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400"
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Real-time Pixel Inspector Bar */}
          <div className="p-3 rounded-xl bg-[#090E20] border border-cyan-950/80 font-mono text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Eye size={14} />
                <span>PIXEL INSPECTOR:</span>
              </span>
              <span>
                X: <strong className="text-white">{inspectPixel?.x ?? '—'}</strong>
              </span>
              <span>
                Y: <strong className="text-white">{inspectPixel?.y ?? '—'}</strong>
              </span>
              <span>
                Raw Flux: <strong className="text-cyan-300">{inspectPixel ? inspectPixel.rawVal.toFixed(2) : '—'}</strong> MJy/sr
              </span>
              <span>
                Normalized: <strong className="text-emerald-400">{inspectPixel ? inspectPixel.normVal.toFixed(3) : '—'}</strong>
              </span>
            </div>

            {inspectPixel?.ra !== undefined && (
              <div className="text-[11px] text-slate-400">
                WCS RA: {inspectPixel.ra.toFixed(4)}° | Dec: {inspectPixel.dec?.toFixed(4)}°
              </div>
            )}
          </div>

          {/* Astronomical Stretch & Colormap Controls Panel */}
          <div className="p-4 rounded-xl bg-[#0A0F22] border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Sliders size={14} className="text-cyan-400" />
                <span>Astronomical Display Adjustments</span>
              </span>
              <button
                onClick={() => {
                  setStretch('asinh');
                  setPalette('inferno');
                  setContrast(1.0);
                  setBrightness(0.0);
                }}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {t('resetDisplay')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stretch Algorithm Selection */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  {t('stretchAlgorithm')}
                </label>
                <select
                  value={stretch}
                  onChange={(e) => setStretch(e.target.value as StretchAlgorithm)}
                  className="w-full bg-[#0E1528] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="asinh">{t('stretchAsinh')}</option>
                  <option value="log">{t('stretchLog')}</option>
                  <option value="sqrt">{t('stretchSqrt')}</option>
                  <option value="linear">{t('stretchLinear')}</option>
                  <option value="power">{t('stretchPower')}</option>
                </select>
              </div>

              {/* Colormap Selection */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5 flex items-center gap-1.5">
                  <Palette size={13} className="text-cyan-400" />
                  <span>{t('colormapPalette')}</span>
                </label>
                <select
                  value={palette}
                  onChange={(e) => setPalette(e.target.value as ColormapPalette)}
                  className="w-full bg-[#0E1528] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="inferno">{t('paletteInferno')}</option>
                  <option value="viridis">{t('paletteViridis')}</option>
                  <option value="magma">{t('paletteMagma')}</option>
                  <option value="heat">{t('paletteHeat')}</option>
                  <option value="cyan">{t('paletteCyan')}</option>
                  <option value="grayscale">{t('paletteGrayscale')}</option>
                  <option value="coolwarm">{t('paletteCoolwarm')}</option>
                </select>
              </div>
            </div>

            {/* Sliders for Min/Max Cut and Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t('minCutLevel')}</span>
                  <span className="font-mono text-cyan-400">{minCut}</span>
                </div>
                <input
                  type="range"
                  min={activeFitsImage ? activeFitsImage.min : 0}
                  max={activeFitsImage ? activeFitsImage.max * 0.8 : 100}
                  step={0.5}
                  value={minCut}
                  onChange={(e) => setMinCut(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t('maxCutLevel')}</span>
                  <span className="font-mono text-cyan-400">{maxCut}</span>
                </div>
                <input
                  type="range"
                  min={minCut + 0.1}
                  max={activeFitsImage ? activeFitsImage.max : 200}
                  step={0.5}
                  value={maxCut}
                  onChange={(e) => setMaxCut(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Array Statistics & FITS Header Cards */}
        <div className="space-y-4">
          {/* Array Statistics Card */}
          <div className="p-4 rounded-xl bg-[#0B1022] border border-slate-800/80">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <Info size={14} className="text-cyan-400" />
              <span>{t('imageStatistics')}</span>
            </h3>

            {activeFitsImage ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">{t('statDimensions')}:</span>
                  <span className="text-white font-bold">{activeFitsImage.naxis1} × {activeFitsImage.naxis2}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">{t('statMinVal')}:</span>
                  <span className="text-cyan-400">{activeFitsImage.min.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">{t('statMaxVal')}:</span>
                  <span className="text-cyan-400">{activeFitsImage.max.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">{t('statMeanVal')}:</span>
                  <span className="text-white">{activeFitsImage.mean.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">{t('statStdDev')}:</span>
                  <span className="text-white">{activeFitsImage.stdDev.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('statMedianVal')}:</span>
                  <span className="text-white">{activeFitsImage.median.toFixed(2)}</span>
                </div>

                {/* 256-bin Mini Histogram */}
                <div className="pt-2">
                  <span className="text-[10px] text-slate-500 block mb-1">Pixel Intensity Histogram</span>
                  <div className="h-10 w-full flex items-end gap-[1px] bg-black/40 p-1 rounded border border-slate-900">
                    {activeFitsImage.histogram.slice(0, 64).map((cnt, i) => {
                      const maxBin = Math.max(...activeFitsImage.histogram) || 1;
                      const barH = Math.min(100, Math.round((cnt / maxBin) * 100));
                      return (
                        <div
                          key={i}
                          style={{ height: `${Math.max(4, barH)}%` }}
                          className="flex-1 bg-cyan-500/70 hover:bg-cyan-400"
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No FITS file loaded.</p>
            )}
          </div>

          {/* FITS Header Cards Table */}
          <div className="p-4 rounded-xl bg-[#0B1022] border border-slate-800/80 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <FileCode2 size={14} className="text-cyan-400" />
                <span>{t('fitsHeaderCards')}</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400">
                {filteredCards.length} cards
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={headerFilter}
                onChange={(e) => setHeaderFilter(e.target.value)}
                placeholder={t('searchHeader')}
                className="w-full bg-[#080C18] border border-slate-800 rounded px-2 pl-7 rtl:pl-2 rtl:pr-7 py-1 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
              {filteredCards.map((card, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-[#070B16] border border-slate-800/50 hover:border-slate-700 transition-colors"
                >
                  <div className="flex justify-between text-cyan-400 font-bold">
                    <span>{card.key}</span>
                    <span className="text-emerald-300 font-normal">{String(card.value)}</span>
                  </div>
                  {card.comment && (
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      / {card.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
