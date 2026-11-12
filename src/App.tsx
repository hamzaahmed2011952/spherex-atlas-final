import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MissionDashboard } from './components/modules/MissionDashboard';
import { SkyExplorer } from './components/modules/SkyExplorer';
import { FitsLab } from './components/modules/FitsLab';
import { TargetIntelligence } from './components/modules/TargetIntelligence';
import { SpectralStudio } from './components/modules/SpectralStudio';
import { ObservationTimeline } from './components/modules/ObservationTimeline';
import { ImageComparison } from './components/modules/ImageComparison';
import { MultiDatasets } from './components/modules/MultiDatasets';
import { AiAssistant } from './components/modules/AiAssistant';
import { ResearchWorkspace } from './components/modules/ResearchWorkspace';
import { ReportGenerator } from './components/modules/ReportGenerator';
import { Radio, ExternalLink, ShieldCheck, Heart } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeModule, t } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderModule = () => {
    switch (activeModule) {
      case 'mission':
        return <MissionDashboard />;
      case 'sky':
        return <SkyExplorer />;
      case 'fits':
        return <FitsLab />;
      case 'targets':
        return <TargetIntelligence />;
      case 'spectra':
        return <SpectralStudio />;
      case 'timeline':
        return <ObservationTimeline />;
      case 'comparison':
        return <ImageComparison />;
      case 'datasets':
        return <MultiDatasets />;
      case 'assistant':
        return <AiAssistant />;
      case 'workspace':
        return <ResearchWorkspace />;
      case 'reports':
        return <ReportGenerator />;
      default:
        return <MissionDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 overflow-x-hidden">
          {renderModule()}
        </main>
      </div>

      {/* Scientific Footer */}
      <footer className="no-print border-t border-slate-900 bg-[#04060B] py-6 px-4 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-slate-300">SPHEREx ATLAS</span>
            <span>• NASA Astrophysics Medium-Class Explorer (MIDEX)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://science.nasa.gov/mission/spherex/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <span>NASA SPHEREx</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="https://irsa.ipac.caltech.edu/Missions/spherex.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <span>IPAC IRSA</span>
              <ExternalLink size={11} />
            </a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">JPL • Caltech • NASA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
