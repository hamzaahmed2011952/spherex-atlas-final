import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  AppModule,
  AstroTarget,
  FitsImageHDU,
  Language,
  ObservationRecord,
  ResearchNote,
  SavedResearchState,
  ScientificDataStatus,
  SpectralDataset,
} from '../types/astronomy';
import { TARGETS_CATALOG } from '../data/targetsCatalog';
import { SPECTRAL_DATASETS } from '../data/spectraData';
import { TRANSLATIONS } from '../data/localization';
import { createSyntheticFitsBuffer, parseFitsBuffer } from '../services/fitsEngine';

export interface ArchiveSearchMeta {
  spherexAvailable: boolean;
  dataStatus: ScientificDataStatus;
  source: string;
  notice: string;
  ra: number;
  dec: number;
  radiusDeg: number;
  queryTimeMs?: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeModule: AppModule;
  setActiveModule: (mod: AppModule) => void;
  selectedTarget: AstroTarget;
  setSelectedTarget: (target: AstroTarget) => void;
  selectedSpectralDataset: SpectralDataset;
  setSelectedSpectralDataset: (dataset: SpectralDataset) => void;
  activeFitsImage: FitsImageHDU | null;
  setActiveFitsImage: (hdu: FitsImageHDU | null) => void;
  savedResearch: SavedResearchState;
  toggleSaveTarget: (targetId: string) => void;
  addResearchNote: (title: string, content: string, tags?: string[], targetId?: string) => void;
  deleteResearchNote: (noteId: string) => void;
  exportWorkspaceJson: () => string;
  importWorkspaceJson: (jsonStr: string) => boolean;
  t: (key: string) => string;
  loadSampleFitsByName: (type: 'cosmos_nir' | 'orion_ice' | 'nep_deep') => void;
  timelineTarget: AstroTarget | null;
  setTimelineTarget: (target: AstroTarget | null) => void;
  archiveObservations: ObservationRecord[];
  setArchiveObservations: (obs: ObservationRecord[]) => void;
  archiveSearchMeta: ArchiveSearchMeta | null;
  setArchiveSearchMeta: (meta: ArchiveSearchMeta | null) => void;
  fetchRemoteFits: (accessUrl: string, signal?: AbortSignal) => Promise<FitsImageHDU>;
}

const STORAGE_KEY = 'spherex_atlas_research_state_v1';

const defaultSavedState: SavedResearchState = {
  collections: [
    {
      id: 'col-ices',
      nameEn: 'Interstellar Biogenic Ices',
      nameAr: 'الجليد الحيوي بين النجمي',
      descriptionEn: 'H2O, CO2, CO, and methanol ice absorption spectra in protostellar cores',
      descriptionAr: 'أطياف امتصاص جليد الماء وثاني أكسيد الكربون في النجوم الأولية',
      targetIds: ['target-orion-kl', 'target-iras-16293'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'col-cosmology',
      nameEn: 'Cosmic Inflation & Deep Fields',
      nameAr: 'التضخم الكوني والحقول العميقة',
      descriptionEn: 'COSMOS and Polar Deep Calibration overlap regions for EBL and galaxy clustering',
      descriptionAr: 'حقول كوزموس والقطب العميق لدراسة التضخم الكوني والضوء الخلفي',
      targetIds: ['target-cosmos', 'target-nep'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  savedTargets: ['target-orion-kl', 'target-cosmos', 'target-nep'],
  notes: [
    {
      id: 'note-01',
      targetId: 'target-orion-kl',
      title: 'H2O 3.05 µm Ice Column Verification',
      content: 'Preliminary inspection of Orion KL 3.05 µm absorption confirms optical depth tau ~ 1.8. Matches predicted SPHEREx Array 4 spectrophotometric sensitivity.',
      tags: ['Ices', 'Spectroscopy', 'Array 4'],
      createdAt: '2025-06-21T14:30:00.000Z',
      updatedAt: '2025-06-21T14:30:00.000Z',
    },
    {
      id: 'note-02',
      targetId: 'target-cosmos',
      title: 'COSMOS Extragalactic Background Light',
      content: 'Analyzed spatial clustering parameters across 1.11 to 2.42 µm bands. Signal-to-noise across 42 survey passes shows strong primordial constraint potential.',
      tags: ['Cosmology', 'EBL', 'Inflation'],
      createdAt: '2025-07-10T10:15:00.000Z',
      updatedAt: '2025-07-10T10:15:00.000Z',
    },
  ],
  bookmarkedObservations: ['OBS-SPX-00104', 'OBS-SPX-00215'],
  lastActiveTargetId: 'target-orion-kl',
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('spherex_lang') as Language) || 'en';
  });

  const [activeModule, setActiveModule] = useState<AppModule>('mission');
  const [selectedTarget, setSelectedTarget] = useState<AstroTarget>(TARGETS_CATALOG[0]);
  const [timelineTarget, setTimelineTarget] = useState<AstroTarget | null>(null);
  const [selectedSpectralDataset, setSelectedSpectralDataset] = useState<SpectralDataset>(SPECTRAL_DATASETS[0]);
  const [activeFitsImage, setActiveFitsImage] = useState<FitsImageHDU | null>(null);
  const [archiveObservations, setArchiveObservations] = useState<ObservationRecord[]>([]);
  const [archiveSearchMeta, setArchiveSearchMeta] = useState<ArchiveSearchMeta | null>(null);
  const fitsCacheRef = useRef<Map<string, FitsImageHDU>>(new Map());

  const [savedResearch, setSavedResearch] = useState<SavedResearchState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse saved research from localStorage:', e);
    }
    return defaultSavedState;
  });

  // Apply language and text direction attributes to HTML root
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('spherex_lang', language);
  }, [language]);

  // Persist research state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedResearch));
    } catch (e) {
      console.warn('Could not save research state to localStorage:', e);
    }
  }, [savedResearch]);

  // Pre-load default demo FITS file (COSMOS Deep Field) on first mount, honestly labeled as SIMULATED DEMO DATA
  useEffect(() => {
    if (!activeFitsImage) {
      try {
        const defaultBuf = createSyntheticFitsBuffer('cosmos_nir');
        const parsed = parseFitsBuffer(defaultBuf, {
          dataStatus: 'SIMULATED DEMO DATA',
          isSimulatedOrDemo: true,
          provenance: 'SPHEREx ATLAS Synthetic FITS Generator (Demo)',
        });
        setActiveFitsImage(parsed);
      } catch (err) {
        console.error('Failed to parse initial synthetic FITS buffer:', err);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  const toggleSaveTarget = (targetId: string) => {
    setSavedResearch((prev) => {
      const isSaved = prev.savedTargets.includes(targetId);
      const updated = isSaved
        ? prev.savedTargets.filter((id) => id !== targetId)
        : [...prev.savedTargets, targetId];
      return { ...prev, savedTargets: updated };
    });
  };

  const addResearchNote = (title: string, content: string, tags: string[] = [], targetId?: string) => {
    const newNote: ResearchNote = {
      id: `note-${Date.now()}`,
      targetId: targetId || selectedTarget.id,
      title,
      content,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSavedResearch((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
  };

  const deleteResearchNote = (noteId: string) => {
    setSavedResearch((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  };

  const exportWorkspaceJson = (): string => {
    return JSON.stringify(savedResearch, null, 2);
  };

  const importWorkspaceJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.savedTargets)) {
        setSavedResearch(parsed);
        return true;
      }
    } catch (err) {
      console.error('Invalid workspace JSON:', err);
    }
    return false;
  };

  const loadSampleFitsByName = (type: 'cosmos_nir' | 'orion_ice' | 'nep_deep') => {
    try {
      const buf = createSyntheticFitsBuffer(type);
      const hdu = parseFitsBuffer(buf, {
        dataStatus: 'SIMULATED DEMO DATA',
        isSimulatedOrDemo: true,
        provenance: 'SPHEREx ATLAS Synthetic FITS Generator (Demo)',
      });
      setActiveFitsImage(hdu);
    } catch (err) {
      console.error('Error generating sample FITS file:', err);
    }
  };

  const MAX_FITS_CACHE_ENTRIES = 5;
  const inFlightFitsRef = useRef<Map<string, Promise<FitsImageHDU>>>(new Map());

  const fetchRemoteFits = async (accessUrl: string, signal?: AbortSignal): Promise<FitsImageHDU> => {
    const cached = fitsCacheRef.current.get(accessUrl);
    if (cached) {
      // Refresh LRU order
      fitsCacheRef.current.delete(accessUrl);
      fitsCacheRef.current.set(accessUrl, cached);
      return cached;
    }

    const existingPromise = inFlightFitsRef.current.get(accessUrl);
    if (existingPromise) {
      return existingPromise;
    }

    const downloadPromise = (async () => {
      const res = await fetch(`/api/archive/fits?url=${encodeURIComponent(accessUrl)}`, { signal });
      if (!res.ok) {
        let errMsg = `Failed to retrieve FITS product (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) errMsg = errJson.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errMsg);
      }

      const buf = await res.arrayBuffer();
      const hdu = parseFitsBuffer(buf, {
        dataStatus: 'REAL ARCHIVE DATA',
        provenance: 'NASA/IPAC IRSA SPHEREx Archive',
        sourceUrl: accessUrl,
        isSimulatedOrDemo: false,
      });

      if (fitsCacheRef.current.size >= MAX_FITS_CACHE_ENTRIES) {
        const oldestKey = fitsCacheRef.current.keys().next().value;
        if (oldestKey !== undefined) {
          fitsCacheRef.current.delete(oldestKey);
        }
      }
      fitsCacheRef.current.set(accessUrl, hdu);
      return hdu;
    })();

    inFlightFitsRef.current.set(accessUrl, downloadPromise);
    try {
      return await downloadPromise;
    } finally {
      inFlightFitsRef.current.delete(accessUrl);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        activeModule,
        setActiveModule,
        selectedTarget,
        setSelectedTarget,
        selectedSpectralDataset,
        setSelectedSpectralDataset,
        activeFitsImage,
        setActiveFitsImage,
        savedResearch,
        toggleSaveTarget,
        addResearchNote,
        deleteResearchNote,
        exportWorkspaceJson,
        importWorkspaceJson,
        t,
        loadSampleFitsByName,
        timelineTarget,
        setTimelineTarget,
        archiveObservations,
        setArchiveObservations,
        archiveSearchMeta,
        setArchiveSearchMeta,
        fetchRemoteFits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
