import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TARGETS_CATALOG } from '../../data/targetsCatalog';
import {
  FolderKanban,
  Plus,
  Trash2,
  Download,
  Upload,
  Bookmark,
  BookmarkCheck,
  Tag,
  Calendar,
  Layers,
  ArrowRight,
  Crosshair,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const ResearchWorkspace: React.FC = () => {
  const {
    t,
    language,
    savedResearch,
    addResearchNote,
    deleteResearchNote,
    toggleSaveTarget,
    exportWorkspaceJson,
    importWorkspaceJson,
    setSelectedTarget,
    setActiveModule,
  } = useApp();

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const tags = newNoteTag
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    addResearchNote(newNoteTitle.trim(), newNoteContent.trim(), tags);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTag('');
  };

  const handleDownloadExport = () => {
    const jsonStr = exportWorkspaceJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_ATLAS_Research_Workspace_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importWorkspaceJson(content);
      if (success) {
        setImportStatus('Workspace imported successfully!');
        setTimeout(() => setImportStatus(null), 3500);
      } else {
        setImportStatus('Failed to import: invalid workspace JSON format.');
      }
    };
    reader.readAsText(file);
  };

  const savedTargetObjects = TARGETS_CATALOG.filter((t) =>
    savedResearch.savedTargets.includes(t.id)
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-[#090E20] border border-cyan-950/60">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban size={22} className="text-cyan-400" />
            <span>{t('workspaceTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('workspaceSubtitle')}
          </p>
        </div>

        {/* Import/Export Workspace */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors">
            <Upload size={14} />
            <span>{t('importWorkspace')}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDownloadExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Download size={14} />
            <span>{t('exportWorkspace')}</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-700 text-cyan-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 size={16} />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (1 col): Saved Targets & Collections */}
        <div className="space-y-4">
          {/* Saved Targets Box */}
          <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Bookmark size={14} className="text-cyan-400" />
                <span>{t('savedTargetsList')}</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {savedTargetObjects.length}
              </span>
            </div>

            {savedTargetObjects.length === 0 ? (
              <p className="text-xs text-slate-500">
                No targets saved yet. Browse targets and click "Save Target".
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {savedTargetObjects.map((tgt) => (
                  <div
                    key={tgt.id}
                    className="p-2.5 rounded-lg bg-[#0E152B] border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div
                      onClick={() => {
                        setSelectedTarget(tgt);
                        setActiveModule('targets');
                      }}
                      className="cursor-pointer truncate flex-1"
                    >
                      <span className="font-bold text-white block truncate">
                        {tgt.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {tgt.category.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleSaveTarget(tgt.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove from saved"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Research Collections */}
          <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800/80">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers size={14} className="text-violet-400" />
              <span>Research Collections</span>
            </h3>

            <div className="space-y-2">
              {savedResearch.collections.map((col) => (
                <div
                  key={col.id}
                  className="p-3 rounded-lg bg-[#0E152B] border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300">
                      {language === 'ar' ? col.nameAr : col.nameEn}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {col.targetIds.length} items
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {language === 'ar' ? col.descriptionAr : col.descriptionEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Note Creator & Notes Stream */}
        <div className="lg:col-span-2 space-y-4">
          {/* Note Creator Form */}
          <div className="p-4 rounded-xl bg-[#0B1022] border border-slate-800/80">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <Plus size={14} className="text-cyan-400" />
              <span>{t('createNewNote')}</span>
            </h3>

            <form onSubmit={handleCreateNote} className="space-y-3">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder={t('noteTitle')}
                className="w-full bg-[#070B16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                placeholder={t('noteContent')}
                className="w-full bg-[#070B16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newNoteTag}
                  onChange={(e) => setNewNoteTag(e.target.value)}
                  placeholder="Tags (comma separated, e.g. Ices, Array 4, Column Density)"
                  className="flex-1 bg-[#070B16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                >
                  {t('saveNote')}
                </button>
              </div>
            </form>
          </div>

          {/* Research Notes Stream */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <FileText size={14} className="text-cyan-400" />
              <span>Personal Research Notes ({savedResearch.notes.length})</span>
            </h3>

            {savedResearch.notes.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#090D1C] border border-slate-800 text-center text-xs text-slate-500">
                {t('noNotesYet')}
              </div>
            ) : (
              <div className="space-y-3">
                {savedResearch.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">
                        {note.title}
                      </h4>
                      <button
                        onClick={() => deleteResearchNote(note.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title={t('deleteNote')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
