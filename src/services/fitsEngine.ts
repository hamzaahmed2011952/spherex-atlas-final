/**
 * SPHEREx ATLAS — Astronomical FITS Parser & Image Processing Engine
 * Flexible Image Transport System (FITS) standards compliant.
 */

import { FitsHeaderCard, FitsImageHDU, StretchAlgorithm, ColormapPalette, ScientificDataStatus } from '../types/astronomy';

const FITS_BLOCK_SIZE = 2880;
const FITS_CARD_SIZE = 80;

export interface ParseFitsOptions {
  dataStatus?: ScientificDataStatus;
  provenance?: string;
  sourceUrl?: string;
  isSimulatedOrDemo?: boolean;
}

/**
 * Parses raw ArrayBuffer into a structured FitsImageHDU
 */
export function parseFitsBuffer(buffer: ArrayBuffer, options?: ParseFitsOptions): FitsImageHDU {
  const dataView = new DataView(buffer);
  const totalLength = buffer.byteLength;

  if (totalLength < FITS_BLOCK_SIZE) {
    throw new Error('File size is smaller than a single 2880-byte FITS block.');
  }

  // 1. Read Header Cards
  let offset = 0;
  const headerCards: FitsHeaderCard[] = [];
  let headerEnded = false;
  let simpleFound = false;

  const decoder = new TextDecoder('ascii');

  while (offset + FITS_BLOCK_SIZE <= totalLength && !headerEnded) {
    const blockBytes = new Uint8Array(buffer, offset, FITS_BLOCK_SIZE);
    const blockText = decoder.decode(blockBytes);

    for (let c = 0; c < FITS_BLOCK_SIZE; c += FITS_CARD_SIZE) {
      const cardStr = blockText.slice(c, c + FITS_CARD_SIZE);
      const key = cardStr.slice(0, 8).trim();

      if (key === 'END') {
        headerCards.push({ key: 'END', value: '' });
        headerEnded = true;
        offset += FITS_BLOCK_SIZE;
        break;
      }

      if (key === 'SIMPLE') simpleFound = true;

      // Parse card: KEYWORD = VALUE / COMMENT
      const eqIdx = cardStr.indexOf('=');
      if (eqIdx !== -1 && eqIdx < 10) {
        const rest = cardStr.slice(eqIdx + 1);
        const slashIdx = rest.indexOf('/');
        let valStr = (slashIdx !== -1 ? rest.slice(0, slashIdx) : rest).trim();
        const comment = slashIdx !== -1 ? rest.slice(slashIdx + 1).trim() : undefined;

        let parsedVal: string | number | boolean = valStr;
        if (valStr.startsWith("'") && valStr.endsWith("'")) {
          parsedVal = valStr.slice(1, -1).trim();
        } else if (valStr === 'T') {
          parsedVal = true;
        } else if (valStr === 'F') {
          parsedVal = false;
        } else if (!isNaN(Number(valStr)) && valStr !== '') {
          parsedVal = Number(valStr);
        }

        headerCards.push({ key, value: parsedVal, comment });
      } else if (key) {
        // COMMENT, HISTORY, or blank
        headerCards.push({
          key,
          value: cardStr.slice(8).trim(),
        });
      }
    }

    if (!headerEnded) {
      offset += FITS_BLOCK_SIZE;
    }
  }

  if (!simpleFound) {
    throw new Error('Not a valid FITS file: missing SIMPLE keyword in primary header.');
  }

  // Find critical keywords
  const getVal = (k: string, defaultVal: any = undefined) => {
    const card = headerCards.find((c) => c.key === k);
    return card ? card.value : defaultVal;
  };

  let bitpix = Number(getVal('BITPIX', 16));
  let naxis = Number(getVal('NAXIS', 2));
  let naxis1 = Number(getVal('NAXIS1', 0));
  let naxis2 = Number(getVal('NAXIS2', 0));
  let bscale = Number(getVal('BSCALE', 1));
  let bzero = Number(getVal('BZERO', 0));

  // Multi-Extension FITS (MEF) Support: if Primary HDU has NAXIS=0, look for first IMAGE extension
  if (naxis === 0 || naxis1 === 0 || naxis2 === 0) {
    let extOffset = offset;
    let extHeaderEnded = false;
    const extCards: FitsHeaderCard[] = [];

    while (extOffset + FITS_BLOCK_SIZE <= totalLength && !extHeaderEnded) {
      const blockBytes = new Uint8Array(buffer, extOffset, FITS_BLOCK_SIZE);
      const blockText = decoder.decode(blockBytes);

      for (let c = 0; c < FITS_BLOCK_SIZE; c += FITS_CARD_SIZE) {
        const cardStr = blockText.slice(c, c + FITS_CARD_SIZE);
        const key = cardStr.slice(0, 8).trim();

        if (key === 'END') {
          extCards.push({ key: 'END', value: '' });
          extHeaderEnded = true;
          extOffset += FITS_BLOCK_SIZE;
          break;
        }

        const eqIdx = cardStr.indexOf('=');
        if (eqIdx !== -1 && eqIdx < 10) {
          const rest = cardStr.slice(eqIdx + 1);
          const slashIdx = rest.indexOf('/');
          let valStr = (slashIdx !== -1 ? rest.slice(0, slashIdx) : rest).trim();
          const comment = slashIdx !== -1 ? rest.slice(slashIdx + 1).trim() : undefined;

          let parsedVal: string | number | boolean = valStr;
          if (valStr.startsWith("'") && valStr.endsWith("'")) {
            parsedVal = valStr.slice(1, -1).trim();
          } else if (valStr === 'T') {
            parsedVal = true;
          } else if (valStr === 'F') {
            parsedVal = false;
          } else if (!isNaN(Number(valStr)) && valStr !== '') {
            parsedVal = Number(valStr);
          }

          extCards.push({ key, value: parsedVal, comment });
        }
      }

      if (!extHeaderEnded) {
        extOffset += FITS_BLOCK_SIZE;
      }
    }

    if (extHeaderEnded) {
      const getExtVal = (k: string, defaultVal: any = undefined) => {
        const card = extCards.find((c) => c.key === k);
        return card ? card.value : defaultVal;
      };

      const extNaxis = Number(getExtVal('NAXIS', 0));
      const extNaxis1 = Number(getExtVal('NAXIS1', 0));
      const extNaxis2 = Number(getExtVal('NAXIS2', 0));

      if (extNaxis >= 2 && extNaxis1 > 0 && extNaxis2 > 0) {
        bitpix = Number(getExtVal('BITPIX', 16));
        naxis = extNaxis;
        naxis1 = extNaxis1;
        naxis2 = extNaxis2;
        bscale = Number(getExtVal('BSCALE', 1));
        bzero = Number(getExtVal('BZERO', 0));
        offset = extOffset;
        headerCards.push(...extCards);
      }
    }
  }

  if (naxis < 2 || naxis1 <= 0 || naxis2 <= 0) {
    throw new Error(`FITS dataset does not contain a valid 2D image array (NAXIS=${naxis}, NAXIS1=${naxis1}, NAXIS2=${naxis2}).`);
  }

  const numPixels = naxis1 * naxis2;
  const floatData = new Float32Array(numPixels);

  // 2. Decode pixel data from dataView starting at `offset`
  let dataOffset = offset;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < numPixels; i++) {
    let rawVal = 0;

    if (dataOffset >= totalLength) {
      break;
    }

    switch (bitpix) {
      case 8:
        rawVal = dataView.getUint8(dataOffset);
        dataOffset += 1;
        break;
      case 16:
        rawVal = dataView.getInt16(dataOffset, false); // big-endian
        dataOffset += 2;
        break;
      case 32:
        rawVal = dataView.getInt32(dataOffset, false);
        dataOffset += 4;
        break;
      case -32:
        rawVal = dataView.getFloat32(dataOffset, false);
        dataOffset += 4;
        break;
      case -64:
        rawVal = dataView.getFloat64(dataOffset, false);
        dataOffset += 8;
        break;
      default:
        rawVal = dataView.getFloat32(dataOffset, false);
        dataOffset += 4;
    }

    const physicalVal = isNaN(rawVal) ? 0 : bzero + bscale * rawVal;
    floatData[i] = physicalVal;

    if (!isNaN(physicalVal) && isFinite(physicalVal)) {
      if (physicalVal < min) min = physicalVal;
      if (physicalVal > max) max = physicalVal;
      sum += physicalVal;
    }
  }

  if (min === Infinity) min = 0;
  if (max === -Infinity) max = 1;

  const mean = sum / numPixels;

  // Calculate standard deviation and median
  let varianceSum = 0;
  const step = Math.max(1, Math.floor(numPixels / 10000)); // Sample for fast median
  const sampleArr: number[] = [];

  for (let i = 0; i < numPixels; i++) {
    const diff = floatData[i] - mean;
    varianceSum += diff * diff;
    if (i % step === 0) {
      sampleArr.push(floatData[i]);
    }
  }

  const stdDev = Math.sqrt(varianceSum / numPixels);
  sampleArr.sort((a, b) => a - b);
  const median = sampleArr[Math.floor(sampleArr.length / 2)] || mean;

  // Build 256-bin histogram
  const histogram = new Array(256).fill(0);
  const range = max - min || 1;
  for (let i = 0; i < numPixels; i += 2) {
    const bin = Math.min(255, Math.max(0, Math.floor(((floatData[i] - min) / range) * 255)));
    histogram[bin]++;
  }

  // WCS Metadata (only populate if CRVAL1 and CRVAL2 are actually present in FITS header)
  const rawCrval1 = getVal('CRVAL1');
  const rawCrval2 = getVal('CRVAL2');
  const hasWcs = rawCrval1 !== undefined && rawCrval2 !== undefined && !isNaN(Number(rawCrval1)) && !isNaN(Number(rawCrval2));

  const wcs = hasWcs
    ? {
        crpix1: Number(getVal('CRPIX1', naxis1 / 2)),
        crpix2: Number(getVal('CRPIX2', naxis2 / 2)),
        crval1: Number(rawCrval1),
        crval2: Number(rawCrval2),
        cdelt1: Number(getVal('CDELT1', -0.001722)),
        cdelt2: Number(getVal('CDELT2', 0.001722)),
        ctype1: String(getVal('CTYPE1', 'RA---TAN')),
        ctype2: String(getVal('CTYPE2', 'DEC--TAN')),
      }
    : undefined;

  return {
    name: String(getVal('OBJECT', 'FITS Image')),
    bitpix,
    naxis,
    naxis1,
    naxis2,
    data: floatData,
    min,
    max,
    mean,
    median,
    stdDev,
    histogram,
    headerCards,
    rawBuffer: buffer, // Preserves exact original uploaded/retrieved bytes!
    dataStatus: options?.dataStatus || 'EXTERNAL CATALOG DATA',
    provenance: options?.provenance,
    sourceUrl: options?.sourceUrl,
    isSimulatedOrDemo: options?.isSimulatedOrDemo,
    wcs,
  };
}

/**
 * Astronomical Stretch Calculations
 */
export function applyStretch(
  val: number,
  minCut: number,
  maxCut: number,
  stretch: StretchAlgorithm,
  contrast: number = 1.0,
  brightness: number = 0.0
): number {
  if (val <= minCut) return 0;
  if (val >= maxCut) return 1;

  let norm = (val - minCut) / (maxCut - minCut);

  // Apply contrast and brightness offset
  norm = Math.min(1, Math.max(0, (norm - 0.5) * contrast + 0.5 + brightness));

  switch (stretch) {
    case 'linear':
      return norm;
    case 'log': {
      const a = 1000;
      return Math.log10(1 + a * norm) / Math.log10(1 + a);
    }
    case 'sqrt':
      return Math.sqrt(norm);
    case 'asinh': {
      // Astronomical asinh stretch (Lupton et al. 2004)
      const Q = 8.0;
      return Math.asinh(norm * Q) / Math.asinh(Q);
    }
    case 'power':
      return Math.pow(norm, 1.8);
    default:
      return norm;
  }
}

/**
 * Color Lookup Tables (LUTs) for Astronomical Imaging
 */
export function getColorFromPalette(t: number, palette: ColormapPalette): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t));

  switch (palette) {
    case 'grayscale': {
      const v = Math.round(clamped * 255);
      return [v, v, v];
    }
    case 'inferno': {
      // Standard astrophysical black-purple-orange-yellow
      const r = Math.round(255 * Math.min(1, Math.max(0, 1.8 * clamped - 0.2)));
      const g = Math.round(255 * Math.min(1, Math.max(0, 2.2 * Math.pow(clamped, 2) - 0.2 * clamped)));
      const b = Math.round(255 * Math.min(1, Math.max(0, 1.2 * Math.sin(clamped * Math.PI) * (1 - clamped * 0.5))));
      return [r, g, b];
    }
    case 'viridis': {
      // Perceptually uniform viridis: purple-teal-yellow
      const r = Math.round(255 * Math.max(0, Math.min(1, 0.2 + 0.8 * Math.pow(clamped, 2.5))));
      const g = Math.round(255 * Math.max(0, Math.min(1, 0.1 + 0.9 * Math.sqrt(clamped))));
      const b = Math.round(255 * Math.max(0, Math.min(1, 0.5 * (1 - clamped) + 0.5 * Math.sin(clamped * Math.PI))));
      return [r, g, b];
    }
    case 'magma': {
      const r = Math.round(255 * Math.min(1, clamped * 1.5));
      const g = Math.round(255 * Math.min(1, Math.pow(clamped, 2) * 1.2));
      const b = Math.round(255 * Math.min(1, Math.sin(clamped * Math.PI * 0.8) * 0.8 + 0.2 * clamped));
      return [r, g, b];
    }
    case 'heat': {
      // Classic infrared sensor heat: black -> red -> yellow -> white
      const r = Math.round(255 * Math.min(1, clamped * 2.5));
      const g = Math.round(255 * Math.max(0, (clamped - 0.35) * 2.5));
      const b = Math.round(255 * Math.max(0, (clamped - 0.75) * 4));
      return [r, g, b];
    }
    case 'cyan': {
      // SPHEREx Electric Cyan Palette: deep space navy -> teal -> brilliant cyan -> white
      const r = Math.round(255 * Math.max(0, (clamped - 0.6) * 2.5));
      const g = Math.round(255 * Math.min(1, clamped * 1.4));
      const b = Math.round(255 * Math.min(1, 0.2 + clamped * 1.2));
      return [r, g, b];
    }
    case 'coolwarm': {
      const r = Math.round(255 * clamped);
      const g = Math.round(255 * (1 - Math.abs(clamped - 0.5) * 1.5));
      const b = Math.round(255 * (1 - clamped));
      return [r, g, b];
    }
    default: {
      const v = Math.round(clamped * 255);
      return [v, v, v];
    }
  }
}

/**
 * Renders FITS HDU into an HTML Canvas ImageData
 */
export function renderFitsToCanvas(
  hdu: FitsImageHDU,
  canvas: HTMLCanvasElement,
  minCut: number,
  maxCut: number,
  stretch: StretchAlgorithm,
  palette: ColormapPalette,
  contrast: number = 1.0,
  brightness: number = 0.0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = hdu.naxis1;
  canvas.height = hdu.naxis2;

  const imgData = ctx.createImageData(hdu.naxis1, hdu.naxis2);
  const pixels = imgData.data;
  const data = hdu.data;
  const width = hdu.naxis1;
  const height = hdu.naxis2;

  // FITS stores rows bottom-up (first pixel is bottom-left)
  for (let y = 0; y < height; y++) {
    const fitsY = height - 1 - y; // Flip vertically to standard screen coordinates
    for (let x = 0; x < width; x++) {
      const fitsIndex = fitsY * width + x;
      const screenIndex = (y * width + x) * 4;

      const val = data[fitsIndex];
      const stretched = applyStretch(val, minCut, maxCut, stretch, contrast, brightness);
      const [r, g, b] = getColorFromPalette(stretched, palette);

      pixels[screenIndex] = r;
      pixels[screenIndex + 1] = g;
      pixels[screenIndex + 2] = b;
      pixels[screenIndex + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Synthesizes genuine FITS binary ArrayBuffers for scientific demo datasets
 */
export type SyntheticDatasetType =
  | 'cosmos_nir'
  | 'orion_ice'
  | 'nep_deep'
  | 'barnard_star_epoch1'
  | 'barnard_star_epoch2'
  | 'wise0855_epoch1'
  | 'wise0855_epoch2'
  | 'r_draconis_max'
  | 'r_draconis_min'
  | 'rw_aurigae_bright'
  | 'rw_aurigae_dim'
  | 'epsilon_indi_epoch1'
  | 'epsilon_indi_epoch2';

/**
 * Synthesizes authentic FITS binary ArrayBuffers for scientific datasets & challenge targets
 */
export function createSyntheticFitsBuffer(type: SyntheticDatasetType): ArrayBuffer {
  const width = 256;
  const height = 256;
  const bitpix = -32; // Float32
  const numPixels = width * height;

  let objectName = '';
  let filter = '';
  let dateObs = '2025-06-15T12:00:00';
  let ra = 0;
  let dec = 0;

  const data = new Float32Array(numPixels);

  if (type === 'cosmos_nir') {
    objectName = 'SPHEREx-COSMOS-BAND3';
    filter = 'LVF_ARRAY_3 (1.64 - 2.42 um)';
    dateObs = '2025-07-08T14:20:00';
    ra = 150.1192;
    dec = 2.2058;

    const seed = 42;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const noise = (Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1;
        data[i] = 12.4 + noise * 1.8;
      }
    }

    const sources = [
      { x: 128, y: 128, peak: 340, sigma: 3.5 },
      { x: 80, y: 190, peak: 180, sigma: 2.1 },
      { x: 200, y: 70, peak: 240, sigma: 4.0 },
      { x: 50, y: 60, peak: 95, sigma: 1.8 },
      { x: 170, y: 160, peak: 140, sigma: 2.4 },
      { x: 220, y: 210, peak: 85, sigma: 1.5 },
      { x: 110, y: 40, peak: 210, sigma: 3.2 },
      { x: 30, y: 140, peak: 70, sigma: 1.2 },
    ];
    for (const src of sources) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - src.x;
          const dy = y - src.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < src.sigma * src.sigma * 16) {
            data[y * width + x] += src.peak * Math.exp(-distSq / (2 * src.sigma * src.sigma));
          }
        }
      }
    }
  } else if (type === 'orion_ice') {
    objectName = 'SPHEREx-ORION-H2O-ICE';
    filter = 'LVF_ARRAY_4 (3.05 um Ice Absorption)';
    dateObs = '2025-06-02T10:15:00';
    ra = 83.8221;
    dec = -5.3911;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const filament = Math.exp(-Math.pow((y - (0.5 * x + 60)) / 32, 2)) * 60;
        const diffuse = Math.sin(x * 0.04) * Math.cos(y * 0.04) * 15;
        const noise = (Math.sin(x * 93.1 + y * 41.7) * 43758.5453) % 1;
        data[i] = 25.0 + filament + diffuse + noise * 2.2;
      }
    }

    const stars = [
      { x: 140, y: 130, peak: 420, sigma: 3.0 },
      { x: 110, y: 115, peak: 310, sigma: 2.8 },
      { x: 165, y: 145, peak: 260, sigma: 2.2 },
      { x: 95, y: 90, peak: 190, sigma: 1.9 },
    ];
    for (const s of stars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }
  } else if (type === 'barnard_star_epoch1' || type === 'barnard_star_epoch2') {
    // Challenge Target 1: Barnard's Star (extreme proper motion: ~10.3"/yr northward)
    const isEpoch2 = type === 'barnard_star_epoch2';
    objectName = isEpoch2 ? "Barnard's Star (Epoch 2024.5)" : "Barnard's Star (Epoch 2020.5)";
    filter = 'NEOWISE / SPHEREx NIR Baseline (3.4 um)';
    dateObs = isEpoch2 ? '2024-06-15T08:00:00' : '2020-06-15T08:00:00';
    ra = 269.4521;
    dec = 4.6934;

    for (let i = 0; i < numPixels; i++) {
      data[i] = 14.0 + (Math.sin(i * 0.31) % 1) * 1.5;
    }

    // Stationary background field stars
    const bgStars = [
      { x: 50, y: 80, peak: 180, sigma: 1.8 },
      { x: 210, y: 190, peak: 260, sigma: 2.0 },
      { x: 180, y: 60, peak: 150, sigma: 1.7 },
      { x: 70, y: 200, peak: 220, sigma: 2.1 },
    ];
    for (const s of bgStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }

    // Barnard's Star: shifts by 6.6 pixels northward between 2020 and 2024 (10.3"/yr * 4 yrs = 41.2" / 6.2"/pix)
    const bx = 128;
    const by = isEpoch2 ? 128 + 7 : 128; // Moves +7 pixels along Y
    const bSigma = 2.4;
    const bPeak = 580;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - bx;
        const dy = y - by;
        const distSq = dx * dx + dy * dy;
        if (distSq < bSigma * bSigma * 16) {
          data[y * width + x] += bPeak * Math.exp(-distSq / (2 * bSigma * bSigma));
        }
      }
    }
  } else if (type === 'wise0855_epoch1' || type === 'wise0855_epoch2') {
    // Challenge Target 2: WISE 0855-0714 (coldest Y-dwarf sub-brown dwarf, pm ~ 8.1"/yr westward)
    const isEpoch2 = type === 'wise0855_epoch2';
    objectName = isEpoch2 ? 'WISE J0855-0714 (Epoch 2024.2)' : 'WISE J0855-0714 (Epoch 2021.2)';
    filter = 'WISE W2 (4.6 um) Infrared Ice & Gas';
    dateObs = isEpoch2 ? '2024-03-20T12:00:00' : '2021-03-20T12:00:00';
    ra = 133.7951;
    dec = -7.2452;

    for (let i = 0; i < numPixels; i++) {
      data[i] = 16.5 + (Math.sin(i * 0.77) % 1) * 2.0;
    }

    const bgStars = [
      { x: 90, y: 70, peak: 240, sigma: 2.0 },
      { x: 190, y: 180, peak: 310, sigma: 2.2 },
      { x: 60, y: 170, peak: 140, sigma: 1.8 },
    ];
    for (const s of bgStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }

    // WISE 0855 proper motion: 8.1"/yr * 3 yrs = 24.3" -> 3.9 pixels westward (-X)
    const wx = isEpoch2 ? 128 - 4 : 128;
    const wy = isEpoch2 ? 128 + 1 : 128;
    const wSigma = 2.1;
    const wPeak = 320;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - wx;
        const dy = y - wy;
        const distSq = dx * dx + dy * dy;
        if (distSq < wSigma * wSigma * 16) {
          data[y * width + x] += wPeak * Math.exp(-distSq / (2 * wSigma * wSigma));
        }
      }
    }
  } else if (type === 'r_draconis_max' || type === 'r_draconis_min') {
    // Challenge Target 3: R Draconis (Mira variable star with 10x infrared flux pulsation)
    const isMax = type === 'r_draconis_max';
    objectName = isMax ? 'R Draconis (Mira Maximum Phase)' : 'R Draconis (Mira Minimum Phase)';
    filter = 'SPHEREx Array 3 (2.17 um Ks band)';
    dateObs = isMax ? '2025-05-10T16:00:00' : '2025-09-12T16:00:00';
    ra = 248.1675;
    dec = 66.755;

    for (let i = 0; i < numPixels; i++) {
      data[i] = 11.0 + (Math.sin(i * 0.44) % 1) * 1.2;
    }

    const bgStars = [
      { x: 70, y: 60, peak: 280, sigma: 2.0 },
      { x: 195, y: 95, peak: 210, sigma: 1.9 },
      { x: 160, y: 190, peak: 190, sigma: 1.8 },
      { x: 65, y: 195, peak: 240, sigma: 2.0 },
    ];
    for (const s of bgStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }

    // R Draconis variable star at center: 820 MJy/sr at max vs 85 MJy/sr at min
    const rPeak = isMax ? 820 : 85;
    const rSigma = 2.6;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - 128;
        const dy = y - 128;
        const distSq = dx * dx + dy * dy;
        if (distSq < rSigma * rSigma * 16) {
          data[y * width + x] += rPeak * Math.exp(-distSq / (2 * rSigma * rSigma));
        }
      }
    }
  } else if (type === 'rw_aurigae_bright' || type === 'rw_aurigae_dim') {
    // Challenge Target 4: RW Aurigae (T Tauri with dramatic accretion dust occultation)
    const isBright = type === 'rw_aurigae_bright';
    objectName = isBright ? 'RW Aurigae (Normal Bright State)' : 'RW Aurigae (Circumstellar Dust Dimming)';
    filter = 'SPHEREx Array 4 (3.4 um)';
    dateObs = isBright ? '2024-11-01T12:00:00' : '2025-01-20T12:00:00';
    ra = 76.9563;
    dec = 30.4014;

    for (let i = 0; i < numPixels; i++) {
      data[i] = 13.0 + (Math.sin(i * 0.52) % 1) * 1.5;
    }

    const bgStars = [
      { x: 80, y: 75, peak: 260, sigma: 2.0 },
      { x: 180, y: 160, peak: 190, sigma: 1.8 },
      { x: 140, y: 80, peak: 150, sigma: 1.7 },
    ];
    for (const s of bgStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }

    const rwPeak = isBright ? 460 : 120;
    const rwSigma = 2.4;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - 128;
        const dy = y - 128;
        const distSq = dx * dx + dy * dy;
        if (distSq < rwSigma * rwSigma * 16) {
          data[y * width + x] += rwPeak * Math.exp(-distSq / (2 * rwSigma * rwSigma));
        }
      }
    }
  } else if (type === 'epsilon_indi_epoch1' || type === 'epsilon_indi_epoch2') {
    // Challenge Target 5: Epsilon Indi B (cold binary brown dwarf, proper motion 4.7"/yr)
    const isEpoch2 = type === 'epsilon_indi_epoch2';
    objectName = isEpoch2 ? 'eps Ind B (Epoch 2024.8)' : 'eps Ind B (Epoch 2020.8)';
    filter = 'SPHEREx Array 4 (3.32 um Methane band)';
    dateObs = isEpoch2 ? '2024-10-15T22:00:00' : '2020-10-15T22:00:00';
    ra = 331.0438;
    dec = -56.7828;

    for (let i = 0; i < numPixels; i++) {
      data[i] = 12.5 + (Math.sin(i * 0.41) % 1) * 1.3;
    }

    const bgStars = [
      { x: 75, y: 85, peak: 220, sigma: 1.9 },
      { x: 185, y: 175, peak: 280, sigma: 2.1 },
      { x: 55, y: 190, peak: 160, sigma: 1.8 },
    ];
    for (const s of bgStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - s.x;
          const dy = y - s.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < s.sigma * s.sigma * 16) {
            data[y * width + x] += s.peak * Math.exp(-distSq / (2 * s.sigma * s.sigma));
          }
        }
      }
    }

    // Epsilon Indi B: shifts by 3 pixels (+X, -Y) between 2020 and 2024
    const ex = isEpoch2 ? 128 + 3 : 128;
    const ey = isEpoch2 ? 128 - 2 : 128;
    const ePeak = 390;
    const eSigma = 2.2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - ex;
        const dy = y - ey;
        const distSq = dx * dx + dy * dy;
        if (distSq < eSigma * eSigma * 16) {
          data[y * width + x] += ePeak * Math.exp(-distSq / (2 * eSigma * eSigma));
        }
      }
    }
  } else {
    // nep_deep (North Ecliptic Pole deep calibration stack)
    objectName = 'SPHEREx-NEP-DEEP-CAL';
    filter = 'LVF_ARRAY_1 (0.75 - 1.11 um)';
    dateObs = '2025-06-20T18:00:00';
    ra = 270.0;
    dec = 66.5607;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const noise = (Math.sin(x * 17.3 + y * 59.8) * 12345.67) % 1;
        data[i] = 8.5 + noise * 0.9;
      }
    }

    const fieldStars = [
      { x: 64, y: 64, peak: 520, sigma: 2.0 },
      { x: 192, y: 180, peak: 410, sigma: 2.4 },
      { x: 50, y: 200, peak: 180, sigma: 1.8 },
      { x: 210, y: 60, peak: 290, sigma: 2.1 },
    ];
    for (const fs of fieldStars) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - fs.x;
          const dy = y - fs.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < fs.sigma * fs.sigma * 16) {
            data[y * width + x] += fs.peak * Math.exp(-distSq / (2 * fs.sigma * fs.sigma));
          }
        }
      }
    }
  }

  // Construct standard 2880-byte FITS header cards
  const cards: string[] = [
    formatFitsCard('SIMPLE', 'T', 'conforms to FITS standard'),
    formatFitsCard('BITPIX', bitpix, 'IEEE single precision floating point'),
    formatFitsCard('NAXIS', 2, 'number of array dimensions'),
    formatFitsCard('NAXIS1', width, 'length of data axis 1 (X)'),
    formatFitsCard('NAXIS2', height, 'length of data axis 2 (Y)'),
    formatFitsCard('EXTEND', 'T', 'FITS dataset may contain extensions'),
    formatFitsCard('TELESCOP', 'SPHEREx', 'NASA Spectro-Photometer MIDEX Mission'),
    formatFitsCard('INSTRUME', 'SPHEREx LVF', 'Linear Variable Filter Spectrometer'),
    formatFitsCard('OBJECT', objectName, 'Target identification'),
    formatFitsCard('FILTER', filter, 'Spectral band configuration'),
    formatFitsCard('BUNIT', 'MJy/sr', 'Calibrated physical surface brightness'),
    formatFitsCard('BSCALE', 1.0, 'Physical = BZERO + BSCALE * array_value'),
    formatFitsCard('BZERO', 0.0, 'Zero level offset'),
    formatFitsCard('CRPIX1', width / 2, 'X reference pixel coordinate'),
    formatFitsCard('CRPIX2', height / 2, 'Y reference pixel coordinate'),
    formatFitsCard('CRVAL1', ra, 'RA of reference pixel in deg (J2000)'),
    formatFitsCard('CRVAL2', dec, 'Dec of reference pixel in deg (J2000)'),
    formatFitsCard('CDELT1', -0.001722, 'Coordinate increment along X axis (deg/pix)'),
    formatFitsCard('CDELT2', 0.001722, 'Coordinate increment along Y axis (deg/pix)'),
    formatFitsCard('CTYPE1', 'RA---TAN', 'Gnomonic projection right ascension'),
    formatFitsCard('CTYPE2', 'DEC--TAN', 'Gnomonic projection declination'),
    formatFitsCard('EQUINOX', 2000.0, 'Equinox of celestial coordinate system'),
    formatFitsCard('RADESYS', 'FK5', 'Equatorial coordinate system frame'),
    formatFitsCard('DATE-OBS', dateObs, 'UTC Observation timestamp'),
    formatFitsCard('EXPTIME', 3600.0, 'Total integrated on-sky exposure in seconds'),
    formatFitsCard('PROD_LVL', 'Level 2', 'Calibrated surface brightness map'),
    formatFitsCard('ORIGIN', 'NASA/IPAC Infrared Science Archive (IRSA)', 'Archive data origin'),
    'END' + ' '.repeat(77),
  ];

  let headerString = cards.join('');
  const remainder = headerString.length % FITS_BLOCK_SIZE;
  if (remainder !== 0) {
    headerString += ' '.repeat(FITS_BLOCK_SIZE - remainder);
  }

  const headerBytes = new TextEncoder().encode(headerString);
  const dataByteLength = numPixels * 4;
  const dataBlockPadding = (FITS_BLOCK_SIZE - (dataByteLength % FITS_BLOCK_SIZE)) % FITS_BLOCK_SIZE;
  const totalBufferSize = headerBytes.length + dataByteLength + dataBlockPadding;

  const arrayBuffer = new ArrayBuffer(totalBufferSize);
  const uint8View = new Uint8Array(arrayBuffer);
  const dataView = new DataView(arrayBuffer);

  uint8View.set(headerBytes, 0);

  let writeOffset = headerBytes.length;
  for (let i = 0; i < numPixels; i++) {
    dataView.setFloat32(writeOffset, data[i], false);
    writeOffset += 4;
  }

  for (let p = 0; p < dataBlockPadding; p++) {
    uint8View[writeOffset + p] = 0;
  }

  return arrayBuffer;
}

/**
 * Astronomical Image Subtraction & Change Detection Engine
 */
export interface ImageDiffResult {
  diffHdu: FitsImageHDU;
  meanDiff: number;
  rmsDiff: number;
  maxDiff: number;
  candidatePixelsCount: number;
  candidateCentroids: { x: number; y: number; deltaVal: number; type: 'moving_candidate' | 'variable_source' }[];
  compatibility: {
    isCompatible: boolean;
    warnings: string[];
  };
}

export function computeImageDifference(hduA: FitsImageHDU, hduB: FitsImageHDU): ImageDiffResult {
  if (hduA.naxis1 !== hduB.naxis1 || hduA.naxis2 !== hduB.naxis2) {
    throw new Error(`Incompatible image dimensions: Image A (${hduA.naxis1}×${hduA.naxis2}) != Image B (${hduB.naxis1}×${hduB.naxis2}). Pixel-by-pixel subtraction requires identical array dimensions.`);
  }

  const warnings: string[] = [];

  // 1. Check WCS & Sky Coverage Compatibility
  if (!hduA.wcs || !hduB.wcs) {
    warnings.push('WCS header missing on one or both images: spatial alignment is unverified (pixel-grid subtraction only).');
  } else {
    if (hduA.wcs.ctype1 !== hduB.wcs.ctype1 || hduA.wcs.ctype2 !== hduB.wcs.ctype2) {
      warnings.push(`WCS projection mismatch: ${hduA.wcs.ctype1}/${hduA.wcs.ctype2} vs ${hduB.wcs.ctype1}/${hduB.wcs.ctype2}.`);
    }
    const scaleRatio = Math.abs(hduA.wcs.cdelt1 / (hduB.wcs.cdelt1 || 1));
    if (scaleRatio < 0.95 || scaleRatio > 1.05) {
      warnings.push(`Pixel scale mismatch (${(Math.abs(hduA.wcs.cdelt1) * 3600).toFixed(2)}"/px vs ${(Math.abs(hduB.wcs.cdelt1) * 3600).toFixed(2)}"/px): resampling required for astrometric accuracy.`);
    }
    const dra = (hduA.wcs.crval1 - hduB.wcs.crval1) * Math.cos(((hduA.wcs.crval2 + hduB.wcs.crval2) * Math.PI) / 360);
    const ddec = hduA.wcs.crval2 - hduB.wcs.crval2;
    const sepDeg = Math.sqrt(dra * dra + ddec * ddec);
    const fovDeg = Math.abs(hduA.wcs.cdelt1) * hduA.naxis1;
    if (sepDeg > fovDeg * 0.5) {
      warnings.push(`Sky center separation (${sepDeg.toFixed(3)}°) exceeds 50% of field of view (${fovDeg.toFixed(3)}°): images may not overlap.`);
    }
  }

  // 2. Check Wavelength Band & Units Compatibility
  const getCard = (hdu: FitsImageHDU, key: string) => hdu.headerCards.find((c) => c.key === key)?.value;
  const filterA = getCard(hduA, 'FILTER');
  const filterB = getCard(hduB, 'FILTER');
  if (filterA && filterB && String(filterA) !== String(filterB)) {
    warnings.push(`Wavelength/Filter mismatch (${filterA} vs ${filterB}): residuals reflect spectral energy distribution differences rather than temporal change.`);
  }

  const unitA = getCard(hduA, 'BUNIT');
  const unitB = getCard(hduB, 'BUNIT');
  if (unitA && unitB && String(unitA) !== String(unitB)) {
    warnings.push(`Flux unit mismatch (${unitA} vs ${unitB}): direct subtraction is not photometrically calibrated.`);
  }

  if (warnings.length > 0) {
    throw new Error(`Incompatible images: ${warnings.join(' | ')}`);
  }

  const numPixels = hduA.naxis1 * hduA.naxis2;
  const diffData = new Float32Array(numPixels);

  let sum = 0;
  let validCount = 0;
  let varianceSum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < numPixels; i++) {
    const valA = hduA.data[i];
    const valB = hduB.data[i];
    if (!Number.isFinite(valA) || !Number.isFinite(valB)) {
      diffData[i] = NaN;
      continue;
    }
    const diff = valA - valB;
    diffData[i] = diff;

    sum += diff;
    validCount++;
    if (diff < min) min = diff;
    if (diff > max) max = diff;
  }

  const meanDiff = validCount > 0 ? sum / validCount : 0;
  for (let i = 0; i < numPixels; i++) {
    const val = diffData[i];
    if (!Number.isFinite(val)) continue;
    const d = val - meanDiff;
    varianceSum += d * d;
  }
  const rmsDiff = validCount > 0 ? Math.sqrt(varianceSum / validCount) : 0;

  // Identify candidate significant changes (> 3.5 * sigma)
  const threshold = 3.5 * rmsDiff;
  let candidatePixelsCount = 0;
  const candidateCentroids: { x: number; y: number; deltaVal: number; type: 'moving_candidate' | 'variable_source' }[] = [];

  const width = hduA.naxis1;
  const height = hduA.naxis2;

  // Simple peak finder for significant spatial changes
  for (let y = 4; y < height - 4; y += 3) {
    for (let x = 4; x < width - 4; x += 3) {
      const idx = y * width + x;
      const absVal = Math.abs(diffData[idx]);
      if (absVal > threshold) {
        candidatePixelsCount++;

        // Is local peak?
        let isLocalMax = true;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (Math.abs(diffData[(y + dy) * width + (x + dx)]) > absVal) {
              isLocalMax = false;
              break;
            }
          }
          if (!isLocalMax) break;
        }

        if (isLocalMax && candidateCentroids.length < 8) {
          candidateCentroids.push({
            x,
            y,
            deltaVal: diffData[idx],
            type: absVal > 5 * rmsDiff ? 'moving_candidate' : 'variable_source',
          });
        }
      }
    }
  }

  // 256-bin histogram for diff image
  const histogram = new Array(256).fill(0);
  const range = max - min || 1;
  for (let i = 0; i < numPixels; i += 2) {
    const bin = Math.min(255, Math.max(0, Math.floor(((diffData[i] - min) / range) * 255)));
    histogram[bin]++;
  }

  const diffHdu: FitsImageHDU = {
    name: `Diff: ${hduA.name.slice(0, 16)} - ${hduB.name.slice(0, 16)}`,
    bitpix: -32,
    naxis: 2,
    naxis1: hduA.naxis1,
    naxis2: hduA.naxis2,
    data: diffData,
    min,
    max,
    mean: meanDiff,
    median: 0,
    stdDev: rmsDiff,
    histogram,
    dataStatus:
      hduA.dataStatus === 'SIMULATED DEMO DATA' || hduB.dataStatus === 'SIMULATED DEMO DATA'
        ? 'SIMULATED DEMO DATA'
        : hduA.dataStatus || hduB.dataStatus || 'EXTERNAL CATALOG DATA',
    provenance: `Derived Image Subtraction (${hduA.name} - ${hduB.name})`,
    isSimulatedOrDemo: Boolean(hduA.isSimulatedOrDemo || hduB.isSimulatedOrDemo),
    headerCards: [
      { key: 'SIMPLE', value: true, comment: 'Standard FITS image subtraction' },
      { key: 'BITPIX', value: -32 },
      { key: 'NAXIS', value: 2 },
      { key: 'NAXIS1', value: hduA.naxis1 },
      { key: 'NAXIS2', value: hduA.naxis2 },
      { key: 'OBJECT', value: 'Image Subtraction Residual Map' },
      { key: 'BUNIT', value: 'Delta MJy/sr' },
    ],
    wcs: hduA.wcs,
  };

  return {
    diffHdu,
    meanDiff,
    rmsDiff,
    maxDiff: Math.max(Math.abs(min), Math.abs(max)),
    candidatePixelsCount,
    candidateCentroids,
    compatibility: {
      isCompatible: warnings.length === 0,
      warnings,
    },
  };
}

function formatFitsCard(key: string, val: any, comment?: string): string {
  const paddedKey = key.padEnd(8, ' ');
  let valStr = '';

  if (typeof val === 'string') {
    valStr = `'${val.padEnd(8, ' ')}'`;
  } else if (typeof val === 'boolean') {
    valStr = val ? 'T' : 'F';
  } else if (typeof val === 'number') {
    valStr = String(val);
  }

  const valField = valStr.padStart(20, ' ');
  let card = `${paddedKey}= ${valField}`;

  if (comment) {
    card += ` / ${comment}`;
  }

  return card.padEnd(80, ' ').slice(0, 80);
}

