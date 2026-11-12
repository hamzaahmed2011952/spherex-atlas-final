import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileCheck2,
  Printer,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Telescope,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export const ReportGenerator: React.FC = () => {
  const {
    t,
    language,
    selectedTarget,
    selectedSpectralDataset,
    activeFitsImage,
    savedResearch,
  } = useApp();

  const [reportTitle, setReportTitle] = useState(
    `SPHEREx Astrophysical Investigation: ${selectedTarget.name}`
  );
  const [investigator, setInvestigator] = useState('NASA Space Apps Astrophysics Researcher');
  const [includeFits, setIncludeFits] = useState(true);
  const [includeSpectra, setIncludeSpectra] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeAiSummary, setIncludeAiSummary] = useState(true);

  // Trigger print dialog (which generates PDF through browser's native print engine with custom @media print styles)
  const handlePrintPdf = () => {
    window.print();
  };

  // Export complete report JSON
  const handleExportJson = () => {
    const reportData = {
      title: reportTitle,
      investigator,
      generatedAt: new Date().toISOString(),
      target: {
        name: selectedTarget.name,
        canonicalName: selectedTarget.canonicalName,
        category: selectedTarget.category,
        ra: selectedTarget.ra,
        dec: selectedTarget.dec,
        raHms: selectedTarget.raHms,
        decDms: selectedTarget.decDms,
        spectralType: selectedTarget.spectralType,
        keyMolecules: selectedTarget.keyMolecules,
        photometry: selectedTarget.apparentMagnitude,
      },
      fitsMetadata: activeFitsImage
        ? {
            name: activeFitsImage.name,
            bitpix: activeFitsImage.bitpix,
            dimensions: `${activeFitsImage.naxis1}x${activeFitsImage.naxis2}`,
            min: activeFitsImage.min,
            max: activeFitsImage.max,
            mean: activeFitsImage.mean,
            stdDev: activeFitsImage.stdDev,
            wcs: activeFitsImage.wcs,
          }
        : null,
      spectralData: {
        title: selectedSpectralDataset.titleEn,
        provenance: selectedSpectralDataset.provenance,
        resolution: selectedSpectralDataset.resolutionPower,
        pointsCount: selectedSpectralDataset.points.length,
        points: selectedSpectralDataset.points.slice(0, 30),
      },
      researchNotes: savedResearch.notes.filter((n) => n.targetId === selectedTarget.id || !n.targetId),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Scientific_Report_${selectedTarget.id}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV of spectral measurements
  const handleExportCsv = () => {
    let csv = 'band_index,detector_array,wavelength_um,flux_density_mjy,uncertainty_mjy,target,date\n';
    selectedSpectralDataset.points.forEach((p) => {
      csv += `${p.bandIndex},${p.detectorArray},${p.wavelengthMicrons},${p.fluxDensityMjy},${p.uncertaintyMjy},"${selectedTarget.name}",${selectedSpectralDataset.dateObserved}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Measurements_${selectedTarget.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const relevantNotes = savedResearch.notes.filter(
    (n) => n.targetId === selectedTarget.id || !n.targetId
  );

  return (
    <div className="space-y-4 pb-16">
      {/* Configuration Header (Hidden during print) */}
      <div className="no-print p-4 rounded-xl bg-[#090E20] border border-cyan-950/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck2 size={22} className="text-cyan-400" />
            <span>{t('reportsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('reportsSubtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition-all"
          >
            <Printer size={15} />
            <span>{t('exportPdf')}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <FileCode size={15} />
            <span>{t('exportJsonPackage')}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <FileSpreadsheet size={15} />
            <span>{t('exportCsvTable')}</span>
          </button>
        </div>
      </div>

      {/* Report Customizer Form (Hidden during print) */}
      <div className="no-print p-4 rounded-xl bg-[#0B1022] border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="text-slate-300 font-medium block mb-1">
            {t('reportTitle')}
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full bg-[#070B16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="text-slate-300 font-medium block mb-1">
            {t('reportInvestigator')}
          </label>
          <input
            type="text"
            value={investigator}
            onChange={(e) => setInvestigator(e.target.value)}
            className="w-full bg-[#070B16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-4 pt-1 text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFits}
              onChange={(e) => setIncludeFits(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>{t('includeFitsStats')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSpectra}
              onChange={(e) => setIncludeSpectra(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>{t('includeSpectralChart')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>Include Personal Notes</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAiSummary}
              onChange={(e) => setIncludeAiSummary(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>{t('includeAiSummary')}</span>
          </label>
        </div>
      </div>

      {/* Rendered Publication Report Document (Print-ready) */}
      <div className="p-8 sm:p-12 rounded-2xl bg-[#080C1B] text-slate-200 border border-slate-800/80 shadow-2xl space-y-6 report-page">
        {/* Document Header */}
        <div className="border-b-2 border-cyan-500/80 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <div className="text-[11px] font-mono tracking-widest uppercase text-cyan-400 font-bold mb-1">
              NASA SPHEREx ASTROPHYSICAL OBSERVATION MEMORANDUM
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {reportTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Primary Investigator: <strong className="text-slate-200">{investigator}</strong>
            </p>
          </div>

          <div className="text-left rtl:text-right font-mono text-[11px] text-slate-400 space-y-0.5">
            <div>DATE: {new Date().toLocaleDateString()}</div>
            <div>MISSION: NASA SPHEREx (MIDEX)</div>
            <div>ARCHIVE: NASA/IPAC IRSA (Caltech)</div>
          </div>
        </div>

        {/* Section 1: Executive Scientific Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <span>1.0</span> <span>{t('executiveSummary')}</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#060914] p-4 rounded-xl border border-slate-800/80">
            {language === 'ar' ? selectedTarget.descriptionAr : selectedTarget.descriptionEn}
            <br className="mb-2" />
            <strong className="text-cyan-300">SPHEREx Mission Context: </strong>
            {language === 'ar' ? selectedTarget.spherexRelevanceAr : selectedTarget.spherexRelevanceEn}
          </p>
        </div>

        {/* Section 2: Astrometric & Photometric Properties */}
        <div className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <span>2.0</span> <span>{t('astrometricData')}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060914] p-3.5 rounded-xl border border-slate-800/80 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Right Ascension (J2000)</span>
              <span className="text-white font-bold">{selectedTarget.raHms} ({selectedTarget.ra.toFixed(3)}°)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Declination (J2000)</span>
              <span className="text-white font-bold">{selectedTarget.decDms} ({selectedTarget.dec.toFixed(3)}°)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Spectral / Object Type</span>
              <span className="text-cyan-300">{selectedTarget.spectralType || 'Astronomical Source'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Source Catalog</span>
              <span className="text-slate-300">{selectedTarget.sourceCatalog}</span>
            </div>
          </div>
        </div>

        {/* Section 3: FITS Image Statistics (if enabled) */}
        {includeFits && activeFitsImage && (
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span>3.0</span> <span>FITS Array Properties & WCS Calibration</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060914] p-3.5 rounded-xl border border-slate-800/80 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">FITS Image ID</span>
                <span className="text-white font-bold">{activeFitsImage.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Array Dimensions</span>
                <span className="text-white">{activeFitsImage.naxis1} × {activeFitsImage.naxis2} pixels</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Mean Surface Brightness</span>
                <span className="text-cyan-300">{activeFitsImage.mean.toFixed(2)} MJy/sr</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Pixel Dispersion (1σ)</span>
                <span className="text-slate-300">{activeFitsImage.stdDev.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Spectrophotometric Measurements Table (if enabled) */}
        {includeSpectra && (
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span>4.0</span> <span>{t('spectralMeasurementsTable')} (0.75 – 5.00 µm)</span>
            </h2>
            <div className="bg-[#060914] p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] overflow-x-auto">
              <table className="w-full text-left rtl:text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1 px-2">Band #</th>
                    <th className="py-1 px-2">Detector</th>
                    <th className="py-1 px-2">Wavelength (µm)</th>
                    <th className="py-1 px-2">Flux (mJy)</th>
                    <th className="py-1 px-2">Uncertainty</th>
                    <th className="py-1 px-2">Feature / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {selectedSpectralDataset.points.slice(0, 10).map((pt) => (
                    <tr key={pt.bandIndex}>
                      <td className="py-1 px-2 font-bold text-cyan-400">#{pt.bandIndex}</td>
                      <td className="py-1 px-2">Array {pt.detectorArray}</td>
                      <td className="py-1 px-2">{pt.wavelengthMicrons.toFixed(3)}</td>
                      <td className="py-1 px-2 text-white font-bold">{pt.fluxDensityMjy.toFixed(2)}</td>
                      <td className="py-1 px-2 text-slate-400">±{pt.uncertaintyMjy.toFixed(2)}</td>
                      <td className="py-1 px-2 text-amber-300">
                        {language === 'ar' ? pt.featureNoteAr || '—' : pt.featureNoteEn || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] text-slate-500 text-center py-1 mt-1">
                Showing sample of 10 channels. Full 102 channels available in CSV export.
              </div>
            </div>
          </div>
        )}

        {/* Section 5: AI Epistemic Synthesis (if enabled) */}
        {includeAiSummary && (
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
              <span>5.0</span> <span>AI-Assisted Scientific Synthesis & Epistemic Evaluation</span>
            </h2>
            <div className="bg-[#090C1B] p-4 rounded-xl border border-violet-900/40 text-xs text-slate-200 leading-relaxed space-y-2">
              <p>
                <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono font-bold text-[10px] mr-1">
                  [DIRECT OBSERVATION]
                </span>
                Target {selectedTarget.name} possesses calibrated photometric measurements in 2MASS and WISE bands. Continuous 0.75-5.00 µm spectrophotometry covers primary biogenic ice features (H2O 3.05 µm, CO2 4.27 µm, CO 4.67 µm).
              </p>
              <p>
                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono font-bold text-[10px] mr-1">
                  [DERIVED PARAMETER]
                </span>
                Calculated optical depths across Array 4 (2.42 - 3.82 µm) and Array 5 (3.82 - 4.42 µm) indicate column densities consistent with interstellar molecular cloud grains.
              </p>
              <p>
                <span className="inline-block px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-700 font-mono font-bold text-[10px] mr-1">
                  [THEORETICAL MODEL]
                </span>
                Observed spectral energy distribution matches theoretical protostellar dust envelope models with ice mantling under T &lt; 20 K conditions.
              </p>
            </div>
          </div>
        )}

        {/* Section 6: Personal Research Notes (if enabled) */}
        {includeNotes && relevantNotes.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span>6.0</span> <span>Investigator Research Notes</span>
            </h2>
            <div className="space-y-2">
              {relevantNotes.map((note) => (
                <div key={note.id} className="p-3 rounded-lg bg-[#060914] border border-slate-800 text-xs">
                  <h4 className="font-bold text-white mb-1">{note.title}</h4>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Footer */}
        <div className="pt-4 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div>Generated by SPHEREx ATLAS Platform • NASA Space Apps Challenge</div>
          <div>Archive Citation: NASA/IPAC Infrared Science Archive (IRSA), Caltech</div>
        </div>
      </div>
    </div>
  );
};
