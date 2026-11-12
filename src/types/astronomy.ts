/**
 * SPHEREx ATLAS — Astronomical Domain Type Definitions
 */

export type Language = 'en' | 'ar';

export type AppModule = 
  | 'mission' 
  | 'sky' 
  | 'fits' 
  | 'targets' 
  | 'spectra' 
  | 'timeline' 
  | 'comparison' 
  | 'datasets' 
  | 'assistant' 
  | 'workspace' 
  | 'reports';

export type ScientificDataStatus = 
  | 'REAL ARCHIVE DATA' 
  | 'EXTERNAL CATALOG DATA' 
  | 'SIMULATED DEMO DATA' 
  | 'UNAVAILABLE DATA';

export interface AstroCoordinates {
  ra: number;          // Degrees [0, 360)
  dec: number;         // Degrees [-90, +90]
  fov?: number;        // Field of view in degrees (e.g. 0.05 to 3.5 deg)
  raHms?: string;      // e.g. "05h 35m 17.3s"
  decDms?: string;     // e.g. "-05° 23' 28.0\""
  l?: number;          // Galactic longitude
  b?: number;          // Galactic latitude
}

export interface AstroTarget extends AstroCoordinates {
  id: string;
  name: string;
  canonicalName: string;
  category: 'deep_field' | 'ice_target' | 'starburst_galaxy' | 'exoplanet_host' | 'active_galactic_nuclei' | 'stellar_laboratory' | 'moving_object' | 'variable_star';
  descriptionEn: string;
  descriptionAr: string;
  spectralType?: string;
  redshift?: number;
  properMotion?: {
    pmRaMasYr: number;   // mas/yr
    pmDecMasYr: number;  // mas/yr
    totalArcsecYr?: number;
  };
  apparentMagnitude?: {
    v?: number;
    j?: number;
    h?: number;
    ks?: number;
    w1?: number; // WISE 3.4µm
    w2?: number; // WISE 4.6µm
  };
  distanceLightYears?: number;
  spherexRelevanceEn: string;
  spherexRelevanceAr: string;
  keyMolecules: string[];
  imageUrl?: string;
  sourceCatalog: string;
  dataStatus?: ScientificDataStatus;
  saved?: boolean;
}

export interface SpectralPoint {
  wavelengthMicrons: number; // 0.75 - 5.0 µm
  fluxDensityMjy: number;     // mJy (or W/m^2/µm)
  uncertaintyMjy: number;
  bandIndex: number;          // 1 to 102
  detectorArray: number;      // 1 to 6
  featureNoteEn?: string;
  featureNoteAr?: string;
  isRealMeasurement?: boolean;
}

export interface SpectralDataset {
  id: string;
  targetId: string;
  targetName: string;
  titleEn: string;
  titleAr: string;
  category: string;
  points: SpectralPoint[];
  provenance: string;
  resolutionPower: string; // e.g. "R ~ 41 (Array 1) to R ~ 130 (Array 6)"
  dateObserved: string;
  isSimulatedOrDemo: boolean;
  dataStatus?: ScientificDataStatus;
  notesEn: string;
  notesAr: string;
}

export interface FitsHeaderCard {
  key: string;
  value: string | number | boolean;
  comment?: string;
}

export interface FitsImageHDU {
  name: string;
  bitpix: number; // 8, 16, 32, -32, -64
  naxis: number;
  naxis1: number;
  naxis2: number;
  data: Float32Array;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  histogram: number[]; // 256 bins
  headerCards: FitsHeaderCard[];
  rawBuffer?: ArrayBuffer; // Preserves exact original uploaded/retrieved bytes!
  dataStatus?: ScientificDataStatus;
  provenance?: string;
  sourceUrl?: string;
  isSimulatedOrDemo?: boolean;
  wcs?: {
    crpix1: number;
    crpix2: number;
    crval1: number;
    crval2: number;
    cdelt1: number;
    cdelt2: number;
    ctype1: string;
    ctype2: string;
  };
}

export type StretchAlgorithm = 'linear' | 'log' | 'sqrt' | 'asinh' | 'power';
export type ColormapPalette = 'grayscale' | 'inferno' | 'viridis' | 'magma' | 'heat' | 'cyan' | 'coolwarm';

export interface ObservationRecord {
  id: string;
  surveyPass: 'Survey 1' | 'Survey 2' | 'Survey 3' | 'Survey 4' | 'Deep Calibration' | 'Multi-Epoch Archive' | 'Quick Release';
  targetRegion: string;
  ra: number;
  dec: number;
  dateStart: string; // ISO date string e.g. "2024-03-15T08:30:00Z"
  dateEnd: string;
  mjd?: number;
  exposureSec: number;
  instrument?: string; // e.g. "SPHEREx QR2", "NEOWISE-R", "WISE", "2MASS"
  band?: string;       // e.g. "Array 4 (3.05 µm)", "W1 (3.4 µm)", "W2 (4.6 µm)", "J (1.25 µm)"
  wavelengthRangeUm?: [number, number];
  detectorsActive: number[];
  dataProductLevel: 'Level 1A (Raw)' | 'Level 2 (Calibrated Images)' | 'Level 3 (Spectral Cubes)' | 'Calibrated Archive';
  irsaArchiveId: string;
  status: 'Completed' | 'Processing' | 'Planned' | 'Archived';
  dataStatus?: ScientificDataStatus;
  isSimulatedOrDemo?: boolean;
  coverageOverlapCount: number;
  sciencePillar: 'Cosmic Inflation' | 'Galaxy Formation' | 'Interstellar Ices' | 'Time-Domain Astrophysics';
  accessUrl?: string;
  accessFormat?: string;
  fitsUrl?: string;
  hasMovingTargetCandidate?: boolean;
  motionNote?: string;
}

export interface ResearchCollection {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  targetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchNote {
  id: string;
  targetId?: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedResearchState {
  collections: ResearchCollection[];
  savedTargets: string[]; // target ids
  notes: ResearchNote[];
  bookmarkedObservations: string[];
  lastActiveTargetId?: string;
}
