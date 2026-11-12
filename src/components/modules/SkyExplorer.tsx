import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AstroTarget } from '../../types/astronomy';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';
import {
  Compass,
  Search,
  Globe,
  MapPin,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  Maximize2,
} from 'lucide-react';

export const SkyExplorer: React.FC = () => {
  const {
    t,
    language,
    setSelectedTarget,
    setActiveModule,
    setTimelineTarget,
    setArchiveObservations,
    setArchiveSearchMeta,
    fetchRemoteFits,
    setActiveFitsImage,
  } = useApp();

  const [projection, setProjection] = useState<'globe' | 'allsky'>('allsky');
  const [crosshairRa, setCrosshairRa] = useState<number>(83.82); // Orion default
  const [crosshairDec, setCrosshairDec] = useState<number>(-5.39);
  const [fov, setFov] = useState<number>(0.5);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [coordInput, setCoordInput] = useState<string>('83.82, -5.39');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showGalacticPlane, setShowGalacticPlane] = useState<boolean>(true);
  const [hoveredTarget, setHoveredTarget] = useState<AstroTarget | null>(null);

  // Live Archive Status & Query state
  const [tapStatus, setTapStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    verifiedTables?: string[];
    error?: string;
  } | null>(null);
  const [archiveLoading, setArchiveLoading] = useState<boolean>(false);
  const [archiveResult, setArchiveResult] = useState<any | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveTimeout, setArchiveTimeout] = useState<boolean>(false);
  const [loadingFitsId, setLoadingFitsId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const archiveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/archive/status', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setTapStatus(data);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setTapStatus({ connected: false, error: err.message || 'Status check failed' });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (archiveAbortRef.current) {
      archiveAbortRef.current.abort();
      archiveAbortRef.current = null;
    }
  }, [crosshairRa, crosshairDec, fov]);

  const handleQueryArchive = async () => {
    if (isNaN(crosshairRa) || isNaN(crosshairDec) || crosshairRa < 0 || crosshairRa >= 360 || crosshairDec < -90 || crosshairDec > 90) {
      setArchiveError('Invalid coordinates: RA must be 0°–360°, Dec must be -90°–+90°');
      return;
    }

    if (archiveAbortRef.current) {
      archiveAbortRef.current.abort();
    }
    const controller = new AbortController();
    archiveAbortRef.current = controller;

    setArchiveLoading(true);
    setArchiveError(null);
    setArchiveTimeout(false);
    setArchiveResult(null);
    try {
      const res = await fetch('/api/archive/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ra: crosshairRa,
          dec: crosshairDec,
          fov,
          targetName: hoveredTarget?.name || TARGETS_CATALOG.find(
            (t) => Math.abs(t.ra - crosshairRa) < 0.25 && Math.abs(t.dec - crosshairDec) < 0.25
          )?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 504 || data?.archiveTimeout) {
          setArchiveTimeout(true);
        }
        setArchiveObservations([]);
        setArchiveSearchMeta(null);
        throw new Error(data?.error || `Archive server returned ${res.status}`);
      }
      setArchiveResult(data);
      const obsList = Array.isArray(data.observations) ? data.observations : [];
      setArchiveObservations(obsList);
      setArchiveSearchMeta({
        spherexAvailable: Boolean(data.spherexAvailable),
        dataStatus: data.dataStatus || (obsList.length > 0 ? 'REAL ARCHIVE DATA' : 'UNAVAILABLE DATA'),
        source: data.source || 'NASA/IPAC IRSA TAP (spherex.obscore)',
        notice: data.notice || '',
        ra: crosshairRa,
        dec: crosshairDec,
        radiusDeg: data.radiusDeg ?? fov / 2,
        queryTimeMs: data.queryTimeMs,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setArchiveError(err.message || 'Failed to query archive');
      setArchiveObservations([]);
      setArchiveSearchMeta(null);
    } finally {
      if (archiveAbortRef.current === controller) {
        setArchiveLoading(false);
      }
    }
  };

  const handleLoadFitsInLab = async (obsId: string, accessUrl: string) => {
    setLoadingFitsId(obsId);
    setArchiveError(null);
    try {
      const hdu = await fetchRemoteFits(accessUrl);
      setActiveFitsImage(hdu);
      setActiveModule('fits');
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to load FITS product');
    } finally {
      setLoadingFitsId(null);
    }
  };

  // Parse coordinate input: supports decimal "83.82, -5.39" or sexagesimal "05h 35m 14s, -05d 22m 30s"
  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError(null);
    const raw = coordInput.trim();

    // Check if matching target name first
    const matchedTgt = TARGETS_CATALOG.find((tgt) =>
      tgt.name.toLowerCase().includes(raw.toLowerCase()) ||
      tgt.canonicalName.toLowerCase().includes(raw.toLowerCase())
    );

    if (matchedTgt) {
      setCrosshairRa(matchedTgt.ra);
      setCrosshairDec(matchedTgt.dec);
      setSelectedTarget(matchedTgt);
      return;
    }

    // Check decimal format: "RA, Dec"
    const decRegex = /^([0-9.\-+]+)[,\s]+([0-9.\-+]+)$/;
    const decMatch = raw.match(decRegex);
    if (decMatch) {
      const ra = parseFloat(decMatch[1]);
      const dec = parseFloat(decMatch[2]);
      if (isNaN(ra) || isNaN(dec) || ra < 0 || ra >= 360 || dec < -90 || dec > 90) {
        setCoordError('Invalid coordinates: RA must be 0°–360°, Dec must be -90°–+90°');
        return;
      }
      setCrosshairRa(ra);
      setCrosshairDec(dec);
      return;
    }

    // Check sexagesimal format: "05h 35m 14s, -05° 22' 30""
    const sexaRegex = /([0-9]+)h\s*([0-9]+)m\s*([0-9.]+)s[,\s]+([+\-]?[0-9]+)[°d\s]+([0-9]+)['m\s]+([0-9.]+)/i;
    const sexaMatch = raw.match(sexaRegex);
    if (sexaMatch) {
      const h = parseFloat(sexaMatch[1]);
      const m = parseFloat(sexaMatch[2]);
      const s = parseFloat(sexaMatch[3]);
      const decD = parseFloat(sexaMatch[4]);
      const decM = parseFloat(sexaMatch[5]);
      const decS = parseFloat(sexaMatch[6]);

      const ra = (h + m / 60 + s / 3600) * 15;
      const decSign = decD < 0 || raw.includes('-') ? -1 : 1;
      const dec = decSign * (Math.abs(decD) + decM / 60 + decS / 3600);

      setCrosshairRa(ra);
      setCrosshairDec(dec);
      return;
    }

    setCoordError('Could not parse coordinates. Format: "83.82, -5.39" or "05h 35m 14s, -05° 22\' 30""');
  };

  // Convert decimal degrees to HMS and DMS
  const formatRaHms = (raDeg: number) => {
    const hours = (raDeg / 15 + 24) % 24;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = ((hours - h - m / 60) * 3600).toFixed(1);
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s}s`;
  };

  const formatDecDms = (decDeg: number) => {
    const sign = decDeg < 0 ? '-' : '+';
    const abs = Math.abs(decDeg);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}' ${s}"`;
  };

  // Render celestial map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Deep space background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 2);
    bgGrad.addColorStop(0, '#090F24');
    bgGrad.addColorStop(0.7, '#060914');
    bgGrad.addColorStop(1, '#03050A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Coordinate conversion from (RA, Dec) to Canvas (x, y)
    const project = (ra: number, dec: number): [number, number] => {
      if (projection === 'allsky') {
        // Hammer-Aitoff or cylindrical equidistant projection
        const x = width - (ra / 360) * width;
        const y = height / 2 - (dec / 90) * (height / 2 * 0.9);
        return [x, y];
      } else {
        // Orthographic Globe projection centered near crosshair
        const centerRa = crosshairRa;
        const centerDec = crosshairDec;

        const lambda = (ra - centerRa) * (Math.PI / 180);
        const phi = dec * (Math.PI / 180);
        const phi0 = centerDec * (Math.PI / 180);

        const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
        const radius = Math.min(width, height) * 0.42 * zoomLevel;

        if (cosC < 0) {
          // Point is on the back side of the celestial sphere
          return [-9999, -9999];
        }

        const x = width / 2 + radius * Math.cos(phi) * Math.sin(lambda);
        const y = height / 2 - radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda));
        return [x, y];
      }
    };

    // Draw Globe Boundary if globe projection
    if (projection === 'globe') {
      const radius = Math.min(width, height) * 0.42 * zoomLevel;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF33';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#050C1F55';
      ctx.fill();
    }

    // 1. Draw Coordinate Grid (Right Ascension meridians & Declination parallels)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    // RA lines every 30 degrees (2 hours)
    for (let r = 0; r < 360; r += 30) {
      ctx.beginPath();
      let started = false;
      for (let d = -80; d <= 80; d += 5) {
        const [x, y] = project(r, d);
        if (x !== -9999) {
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // Dec lines every 30 degrees
    for (let d = -60; d <= 60; d += 30) {
      ctx.beginPath();
      let started = false;
      for (let r = 0; r <= 360; r += 10) {
        const [x, y] = project(r, d);
        if (x !== -9999) {
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Draw Celestial Equator (Dec = 0)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    let startedEq = false;
    for (let r = 0; r <= 360; r += 5) {
      const [x, y] = project(r, 0);
      if (x !== -9999) {
        if (!startedEq) {
          ctx.moveTo(x, y);
          startedEq = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // 3. Draw Galactic Plane (Milky Way dust lane curve)
    if (showGalacticPlane) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 2;
      let startedGal = false;
      // Approximate Galactic equator in equatorial coordinates
      // Inclination i ~ 62.87°, ascending node Omega ~ 282.86°
      for (let l = 0; l <= 360; l += 4) {
        const rad = l * (Math.PI / 180);
        // Galactic to Equatorial conversion
        const decG = 27.128 * (Math.PI / 180);
        const raG = 192.859 * (Math.PI / 180);
        const l0 = 32.932 * (Math.PI / 180);

        const sinDec = Math.cos(0) * Math.cos(decG) * Math.sin(rad - l0) + Math.sin(0) * Math.sin(decG);
        const dec = Math.asin(sinDec) * (180 / Math.PI);
        const yCoord = Math.cos(0) * Math.cos(rad - l0);
        const xCoord = Math.sin(0) * Math.cos(decG) - Math.cos(0) * Math.sin(decG) * Math.sin(rad - l0);
        const ra = ((Math.atan2(yCoord, xCoord) + raG) * (180 / Math.PI) + 360) % 360;

        const [px, py] = project(ra, dec);
        if (px !== -9999) {
          if (!startedGal) {
            ctx.moveTo(px, py);
            startedGal = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();
    }

    // 4. Draw SPHEREx Terminator Orbit Precession Scan Footprint
    if (showFootprint) {
      // Swath follows Sun-synchronous orbit scanning at 90° sun-angle
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      let startedSwath = false;
      for (let dec = -88; dec <= 88; dec += 4) {
        // Precession scan line at current solar angle
        const scanRa = (crosshairRa + 90 * Math.sin(dec * (Math.PI / 180) * 0.5) + 360) % 360;
        const [px, py] = project(scanRa, dec);
        if (px !== -9999) {
          if (!startedSwath) {
            ctx.moveTo(px, py);
            startedSwath = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();

      // Draw NEP and SEP Deep Polar Field maximum overlap circles (>1000x)
      const poles = [
        { ra: 270.0, dec: 66.56, label: 'NEP Deep Field' },
        { ra: 90.0, dec: -66.56, label: 'SEP Deep Field' },
      ];

      poles.forEach((p) => {
        const [px, py] = project(p.ra, p.dec);
        if (px !== -9999) {
          ctx.beginPath();
          ctx.arc(px, py, 14 * zoomLevel, 0, Math.PI * 2);
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
          ctx.fill();

          ctx.fillStyle = '#00E5FF';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(p.label, px + 18, py + 4);
        }
      });
    }

    // 5. Draw Targets from Catalog
    TARGETS_CATALOG.forEach((tgt) => {
      const [tx, ty] = project(tgt.ra, tgt.dec);
      if (tx === -9999) return;

      const isCrosshair = Math.abs(tgt.ra - crosshairRa) < 2 && Math.abs(tgt.dec - crosshairDec) < 2;

      ctx.beginPath();
      ctx.arc(tx, ty, isCrosshair ? 6 : 4, 0, Math.PI * 2);

      if (tgt.category === 'ice_target') {
        ctx.fillStyle = '#00E5FF';
      } else if (tgt.category === 'deep_field') {
        ctx.fillStyle = '#8B5CF6';
      } else if (tgt.category === 'starburst_galaxy') {
        ctx.fillStyle = '#F59E0B';
      } else {
        ctx.fillStyle = '#10B981';
      }

      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Target Label
      ctx.fillStyle = isCrosshair ? '#FFFFFF' : '#94A3B8';
      ctx.font = isCrosshair ? 'bold 11px Inter' : '10px Inter';
      ctx.fillText(tgt.name.split('/')[0].trim(), tx + 8, ty - 6);
    });

    // 6. Draw Active Crosshair
    const [cx, cy] = project(crosshairRa, crosshairDec);
    if (cx !== -9999) {
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.lineTo(cx - 6, cy);
      ctx.moveTo(cx + 6, cy);
      ctx.lineTo(cx + 24, cy);
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx, cy - 6);
      ctx.moveTo(cx, cy + 6);
      ctx.lineTo(cx, cy + 24);
      ctx.stroke();
    }
  }, [projection, crosshairRa, crosshairDec, zoomLevel, showFootprint, showGalacticPlane]);

  // Click handler on canvas to pick coordinates or targets
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (projection === 'allsky') {
      const ra = Number((((canvas.width - x) / canvas.width) * 360).toFixed(2));
      const dec = Number(((canvas.height / 2 - y) / (canvas.height / 2 * 0.9) * 90).toFixed(2));

      setCrosshairRa(Math.min(359.99, Math.max(0, ra)));
      setCrosshairDec(Math.min(90, Math.max(-90, dec)));
      setCoordInput(`${ra}, ${dec}`);

      // Check if clicked near target
      const nearest = TARGETS_CATALOG.find((tgt) => {
        return Math.hypot(tgt.ra - ra, tgt.dec - dec) < 6;
      });
      if (nearest) {
        setSelectedTarget(nearest);
      }
    }
  };

  const handleSelectQuickTarget = (target: AstroTarget) => {
    setCrosshairRa(target.ra);
    setCrosshairDec(target.dec);
    setCoordInput(`${target.ra}, ${target.dec}`);
    setSelectedTarget(target);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Controls bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-[#090E1F] border border-cyan-950/60">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass size={22} className="text-cyan-400" />
            <span>{t('skyExplorerTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('skyExplorerSubtitle')}
          </p>
        </div>

        {/* Projection Switcher & Overlays */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
            <button
              onClick={() => setProjection('allsky')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                projection === 'allsky'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('projectionAllSky')}
            </button>
            <button
              onClick={() => setProjection('globe')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                projection === 'globe'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('projectionGlobe')}
            </button>
          </div>

          {/* Field of View (FOV) Selector */}
          <div className="flex items-center gap-1.5 bg-[#0E1528] border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <span className="text-[11px] font-mono text-slate-400">FOV:</span>
            <select
              value={fov}
              onChange={(e) => setFov(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-mono text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value={0.05} className="bg-[#0E1528] text-white">0.05° (3.0')</option>
              <option value={0.1} className="bg-[#0E1528] text-white">0.10° (6.0')</option>
              <option value={0.25} className="bg-[#0E1528] text-white">0.25° (15.0')</option>
              <option value={0.5} className="bg-[#0E1528] text-white">0.50° (Standard)</option>
              <option value={1.0} className="bg-[#0E1528] text-white">1.00° (60.0')</option>
              <option value={3.5} className="bg-[#0E1528] text-white">3.50° (SPHEREx LVF)</option>
            </select>
          </div>

          <button
            onClick={() => setShowFootprint(!showFootprint)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showFootprint
                ? 'bg-violet-950 text-violet-300 border-violet-700/80'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            SPHEREx Scan Swath
          </button>

          <button
            onClick={() => setShowGalacticPlane(!showGalacticPlane)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showGalacticPlane
                ? 'bg-amber-950 text-amber-300 border-amber-700/80'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            Galactic Plane
          </button>
        </div>
      </div>

      {/* NASA Challenge Targets Quick-Bar */}
      <div className="p-2.5 rounded-xl bg-[#090E22] border border-cyan-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>NASA CHALLENGE TARGETS:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'target-barnards-star', name: "Barnard's Star (10.3\"/yr)", ra: 269.4521, dec: 4.6934, tag: 'High Proper Motion' },
            { id: 'target-wise-0855', name: 'WISE 0855 (Cold Brown Dwarf)', ra: 133.7951, dec: -7.2452, tag: 'Y4 Dwarf / 8.2"/yr' },
            { id: 'target-r-draconis', name: 'R Draconis (Mira Variable)', ra: 248.1675, dec: 66.755, tag: '>8x Pulsation' },
            { id: 'target-rw-aurigae', name: 'RW Aurigae (T Tauri)', ra: 76.9563, dec: 30.4014, tag: 'Dust Occultation' },
            { id: 'target-epsilon-indi-b', name: 'Eps Indi B (Binary T-Dwarf)', ra: 331.0438, dec: -56.7828, tag: '4.7"/yr Proper Motion' },
          ].map((ct) => {
            const isNear = Math.abs(crosshairRa - ct.ra) < 0.2 && Math.abs(crosshairDec - ct.dec) < 0.2;
            return (
              <button
                key={ct.id}
                onClick={() => {
                  setCrosshairRa(ct.ra);
                  setCrosshairDec(ct.dec);
                  const matched = TARGETS_CATALOG.find((t) => t.id === ct.id);
                  if (matched) setSelectedTarget(matched);
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1 border ${
                  isNear
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                    : 'bg-[#0E152B] text-slate-300 border-slate-700/80 hover:border-cyan-500/70 hover:text-white'
                }`}
              >
                <span>{ct.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Coordinate Map Viewport & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas Area (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#050814] border border-slate-800/80 p-3 relative flex flex-col items-center shadow-2xl overflow-hidden">
          {/* Top Floating Coordinate Readout */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#080D1E]/90 border border-slate-800 text-xs font-mono mb-2 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Crosshair size={14} />
                <span>CROSSHAIR:</span>
              </span>
              <span className="text-slate-200">
                RA: {crosshairRa.toFixed(2)}° ({formatRaHms(crosshairRa)})
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-200">
                Dec: {crosshairDec.toFixed(2)}° ({formatDecDms(crosshairDec)})
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
              <span>Click map to relocate crosshair</span>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="w-full relative flex items-center justify-center min-h-[460px]">
            <canvas
              ref={canvasRef}
              width={920}
              height={520}
              onClick={handleCanvasClick}
              className="w-full h-auto rounded-xl border border-slate-900 cursor-crosshair shadow-inner"
            />

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 flex flex-col gap-1.5 bg-[#090E1F]/90 border border-slate-800 p-1.5 rounded-lg shadow-xl">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400 hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400 hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-400 hover:bg-slate-800"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Legend bar */}
          <div className="w-full mt-2 pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono px-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> Interstellar Ices
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Deep Cosmological Field
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Starburst Galaxies
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Exoplanet Hosts
              </span>
            </div>
            <div>Terminator Orbit: 98.2° Inclination</div>
          </div>
        </div>

        {/* Right Toolpane (1 col): Search, Quick Targets, Inspector */}
        <div className="space-y-4">
          {/* Coordinate Search Form */}
          <div className="p-4 rounded-xl bg-[#0B1022] border border-slate-800/80">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Search size={14} className="text-cyan-400" />
              <span>{t('searchCoordinates')}</span>
            </h3>

            <form onSubmit={handleCoordSubmit} className="space-y-2">
              <input
                type="text"
                value={coordInput}
                onChange={(e) => setCoordInput(e.target.value)}
                placeholder="e.g. 83.82, -5.39 or Orion"
                className="w-full bg-[#070B17] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Center Crosshair
              </button>
            </form>

            {coordError && (
              <p className="text-[11px] text-rose-400 mt-2 font-mono">
                {coordError}
              </p>
            )}
          </div>

          {/* Quick Target Jumps */}
          <div className="p-4 rounded-xl bg-[#0B1022] border border-slate-800/80">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-cyan-400" />
              <span>{t('presetTargets')}</span>
            </h3>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {TARGETS_CATALOG.map((tgt) => (
                <button
                  key={tgt.id}
                  onClick={() => handleSelectQuickTarget(tgt)}
                  className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between border ${
                    Math.abs(tgt.ra - crosshairRa) < 1 && Math.abs(tgt.dec - crosshairDec) < 1
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-900/50 border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{tgt.name.split('/')[0]}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {tgt.ra.toFixed(1)}°, {tgt.dec.toFixed(1)}°
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* NASA/IPAC IRSA Archive Query Panel */}
          <div className="p-4 rounded-xl bg-[#080D1E] border border-cyan-950/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                <Search size={13} />
                <span>IRSA Archive Search</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">FOV {fov}° (r = {(fov / 2).toFixed(2)}°)</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Query NASA/IPAC IRSA TAP for observations overlapping RA: <span className="text-cyan-300 font-mono font-bold">{crosshairRa.toFixed(2)}°</span>, Dec: <span className="text-cyan-300 font-mono font-bold">{crosshairDec.toFixed(2)}°</span>.
            </p>

            <button
              onClick={handleQueryArchive}
              disabled={archiveLoading}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              {archiveLoading ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Connecting to IRSA TAP...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Query NASA Archive</span>
                </>
              )}
            </button>

            {tapStatus && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0C1226] border border-slate-800/80 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tapStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span>IRSA TAP: {tapStatus.connected ? 'ONLINE' : 'OFFLINE'}</span>
                </span>
                {tapStatus.latencyMs !== undefined && (
                  <span className="text-slate-400">{tapStatus.latencyMs}ms</span>
                )}
              </div>
            )}

            {archiveError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/80 text-[11px] text-rose-300 font-mono space-y-2">
                <div>{archiveError}</div>
                {archiveTimeout && (
                  <button
                    onClick={handleQueryArchive}
                    className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-[10px] font-bold"
                  >
                    Retry Archive Query
                  </button>
                )}
              </div>
            )}

            {archiveResult && (
              <div className="p-3 rounded-lg bg-[#0C1226] border border-cyan-900/60 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold ${
                      archiveResult.count > 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {archiveResult.dataStatus || (archiveResult.count > 0 ? 'REAL ARCHIVE DATA' : 'UNAVAILABLE DATA')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Records Found:</span>
                  <span className="text-cyan-300 font-bold">{archiveResult.count} observations</span>
                </div>
                <div className="text-[10px] text-slate-300 leading-normal border-t border-slate-800/80 pt-1.5">
                  <span className="text-cyan-400 font-semibold block mb-0.5">{archiveResult.source}</span>
                  {archiveResult.notice}
                </div>

                {Array.isArray(archiveResult.observations) && archiveResult.observations.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-800/80 pt-2">
                    {archiveResult.observations.slice(0, 5).map((obs: any) => (
                      <div
                        key={obs.id}
                        className="p-2 rounded bg-[#080D1E] border border-slate-800/80 flex items-center justify-between gap-2 text-[10px]"
                      >
                        <div className="truncate">
                          <div className="text-cyan-300 font-bold truncate">{obs.obsId || obs.id}</div>
                          <div className="text-slate-400">{obs.dateStart?.slice(0, 10) || 'Unknown date'}</div>
                        </div>
                        {obs.accessUrl && (
                          <button
                            onClick={() => handleLoadFitsInLab(obs.id, obs.accessUrl)}
                            disabled={loadingFitsId === obs.id}
                            className="shrink-0 px-2 py-1 rounded bg-cyan-900/70 hover:bg-cyan-800 text-cyan-200 font-semibold"
                          >
                            {loadingFitsId === obs.id ? 'Loading...' : 'Load FITS'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1.5 space-y-1.5">
                  <button
                    onClick={() => {
                      const matched = TARGETS_CATALOG.find(
                        (t) => Math.abs(t.ra - crosshairRa) < 0.25 && Math.abs(t.dec - crosshairDec) < 0.25
                      );
                      if (matched) {
                        setSelectedTarget(matched);
                        setTimelineTarget(matched);
                      }
                      setActiveModule('timeline');
                    }}
                    className="w-full py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Play Observation Time-Lapse</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>

                  <button
                    onClick={() => setActiveModule('comparison')}
                    className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Compare Multi-Epoch Difference</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Crosshair Navigation Actions */}
          <div className="p-4 rounded-xl bg-[#0E152B] border border-cyan-900/40">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Crosshair size={14} className="text-cyan-400" />
              <span>{t('inspectAtCoordinates')}</span>
            </h3>
            <p className="text-[11px] text-slate-300 mb-3">
              Explore calibrated FITS arrays and spectral energy distributions for this coordinate.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setActiveModule('fits')}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open in FITS Lab</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </button>
              <button
                onClick={() => setActiveModule('spectra')}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View 102-Band Spectrum</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
