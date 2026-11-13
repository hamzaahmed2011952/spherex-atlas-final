import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Loader2,
  Activity,
  Cpu,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  isOffline?: boolean;
  isError?: boolean;
}

export const AiAssistant: React.FC = () => {
  const {
    t,
    language,
    selectedTarget,
    selectedSpectralDataset,
    activeFitsImage,
    archiveObservations,
    archiveSearchMeta,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text:
        language === 'ar'
          ? `مرحباً بك في مساعد البحث العلمي لمنصة سفيريكس أطلس (SPHEREx ATLAS).
أنا وكيل ذكاء اصطناعي متخصص في فيزياء الفلك بالأشعة تحت الحمراء ومهمة سفيريكس، وأستطيع الإجابة على استفساراتك الفلكية والعامة.

الهدف النشط: ${selectedTarget.name} (${selectedTarget.category})
المجموعة الطيفية: ${selectedSpectralDataset.titleEn} (102 نطاق طيفي)
ملف FITS النشط: ${activeFitsImage ? `${activeFitsImage.name} (${activeFitsImage.naxis1}×${activeFitsImage.naxis2})` : 'غير محمل'}

ألتزم بسياسة الأمان المعرفي الصارمة، حيث أصنف إجاباتي وفق الوسوم العلمية:
- [DIRECT OBSERVATION]: للقياسات الفيزيائية المباشرة والإحداثيات.
- [DERIVED PARAMETER]: للقيم والمعاملات المحسوبة (العمق البصري، الانزياح نحو الأحمر، درجات الحرارة).
- [THEORETICAL MODEL]: للنماذج الفلكية والتفسيرات الكونية النظرية.
- [MISSING / UNKNOWN]: للمعلومات غير المؤكدة أو المفقودة في الأرشيف.

كيف يمكنني مساعدتك في تحليلك العلمي اليوم؟`
          : `Welcome to the SPHEREx ATLAS Scientific Research Assistant.
I am an astrophysics intelligence agent calibrated for NASA's SPHEREx mission and near-infrared spectrophotometry, capable of answering scientific and general knowledge inquiries.

Active Target: ${selectedTarget.name} (${selectedTarget.category})
Active Spectrum: ${selectedSpectralDataset.titleEn} (102 spectral channels)
Active FITS Product: ${activeFitsImage ? `${activeFitsImage.name} (${activeFitsImage.naxis1}×${activeFitsImage.naxis2})` : 'None loaded'}

I operate under rigorous scientific epistemic safety standards, categorizing statements with explicit indicators:
- [DIRECT OBSERVATION]: For measured physical quantities, coordinates & catalog lines.
- [DERIVED PARAMETER]: For calculated values (optical depth, column density, redshift, temperatures).
- [THEORETICAL MODEL]: For astrophysics models, cosmic inflation & evolutionary interpretations.
- [MISSING / UNKNOWN]: When archive coverage is incomplete or unverified.

How can I assist your astrophysical investigation today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.8-flash',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLastFailedPrompt(null);
    setIsLoading(true);

    // Build comprehensive active context
    const context = {
      target: {
        name: selectedTarget.name,
        canonicalName: selectedTarget.canonicalName,
        category: selectedTarget.category,
        ra: selectedTarget.raHms || selectedTarget.ra,
        dec: selectedTarget.decDms || selectedTarget.dec,
        spectralType: selectedTarget.spectralType,
        keyMolecules: selectedTarget.keyMolecules,
        magnitudes: selectedTarget.apparentMagnitude,
      },
      spectralDataset: {
        title: selectedSpectralDataset.titleEn,
        category: selectedSpectralDataset.category,
        resolution: selectedSpectralDataset.resolutionPower,
        pointsCount: selectedSpectralDataset.points?.length || 0,
        wavelengthSpan: '0.75 - 5.00 microns (102 bands)',
      },
      fitsMetadata: activeFitsImage
        ? {
            name: activeFitsImage.name,
            dimensions: `${activeFitsImage.naxis1}x${activeFitsImage.naxis2}`,
            min: activeFitsImage.min,
            max: activeFitsImage.max,
            mean: activeFitsImage.mean,
            dataStatus: activeFitsImage.dataStatus,
          }
        : null,
      archiveStatus: {
        observationsCount: archiveObservations?.length || 0,
        dataStatus: archiveSearchMeta?.dataStatus || 'UNAVAILABLE DATA',
      },
    };

    // Format previous messages for multi-turn history (excluding welcome message)
    const history = messages
      .filter((m) => m.id !== 'msg-welcome' && !m.isError)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    try {
      const res = await fetch('/api/gemini/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          history,
        }),
      });

      const responseText = await res.text();
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Assistant API returned HTTP ${res.status}: ${responseText.slice(0, 240) || res.statusText}. ` +
            'Confirm the latest deployment includes the Vercel API function.'
        );
      }
      const data = JSON.parse(responseText);

      let replyText = '';
      let isError = false;
      const modelName = data.model || 'gemini-3.8-flash';
      const isOffline = Boolean(data.isOffline);

      if (res.ok && data.reply) {
        replyText = data.reply;
      } else {
        replyText = `Analysis notice: ${data.error || 'Server request failed.'}`;
        isError = true;
        setLastFailedPrompt(text);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: modelName,
        isOffline,
        isError,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setLastFailedPrompt(text);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to assistant server: ${err.message || 'Please check your connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Recommended test and exploration prompts
  const researchPrompts =
    language === 'ar'
      ? [
          'ما هي مهمة سفيريكس (SPHEREx)؟',
          'ما الفرق بين النجم والقزم البني؟',
          'لماذا يرصد سفيريكس السماء بنطاقات متعددة بالأشعة تحت الحمراء؟',
          'ما هو المطلع المستقيم (Right Ascension)؟',
          'ماذا يحتوي ملف FITS الفلكي؟',
          'الهدف العلمي لمقارنة الأرصاد الفلكية عبر الزمن؟',
          'ما هي عاصمة مصر؟',
          t('promptAnalyzeIce'),
          t('promptExplainWcs'),
          t('promptInflation'),
        ]
      : [
          'What is SPHEREx?',
          'What is the difference between a star and a brown dwarf?',
          'Why does SPHEREx observe the sky in multiple infrared bands?',
          'What is right ascension?',
          'Explain what a FITS file contains.',
          'What is the scientific purpose of comparing astronomical observations over time?',
          'What is the capital of Egypt?',
          t('promptAnalyzeIce'),
          t('promptExplainWcs'),
          t('promptInflation'),
        ];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-[#090E20] border border-violet-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} className="text-violet-400" />
            <span>{t('aiTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('aiSubtitle')}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-800/40 text-[11px] text-violet-300 font-mono">
            <Cpu size={12} className="text-violet-400" />
            <span>Gemini 3.8 Flash / Calibrated</span>
          </div>

          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-colors"
          >
            <Trash2 size={13} />
            <span>{t('clearChat')}</span>
          </button>
        </div>
      </div>

      {/* Epistemic Safety Badge Bar */}
      <div className="p-3 rounded-xl bg-[#0A0D1E] border border-cyan-900/30 text-xs text-slate-300 flex items-start gap-2.5 shadow-md">
        <ShieldCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Scientific Epistemic Safety Policy:</span>
          <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
            All AI responses strictly distinguish directly measured observational quantities from calculated derived parameters, astrophysical models, and unobserved data to maintain peer-reviewed publication rigor.
          </p>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#060914] border border-slate-800/80 shadow-2xl flex flex-col h-[560px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : msg.isError
                    ? 'bg-rose-950 text-rose-300 border border-rose-700/80'
                    : 'bg-violet-950 text-violet-300 border border-violet-700/80 shadow-sm'
                }`}
              >
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[78%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap relative group ${
                  msg.sender === 'user'
                    ? 'bg-cyan-950/80 text-cyan-100 border border-cyan-700/60 rounded-tr-none rtl:rounded-tr-2xl rtl:rounded-tl-none font-medium'
                    : msg.isError
                    ? 'bg-rose-950/40 text-rose-200 border border-rose-900/70 rounded-tl-none rtl:rounded-tl-2xl rtl:rounded-tr-none'
                    : 'bg-[#0B1022] text-slate-200 border border-slate-800 rounded-tl-none rtl:rounded-tl-2xl rtl:rounded-tr-none'
                }`}
              >
                {/* Epistemic tag highlighter */}
                {msg.text
                  .split(
                    /(\[DIRECT OBSERVATION\]|\[DERIVED PARAMETER\]|\[THEORETICAL MODEL\]|\[MISSING \/ UNKNOWN\]|\[OFFLINE KNOWLEDGE BASE\])/g
                  )
                  .map((chunk, i) => {
                    if (chunk === '[DIRECT OBSERVATION]') {
                      return (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono font-bold text-[10px] mr-1"
                        >
                          [DIRECT OBSERVATION]
                        </span>
                      );
                    }
                    if (chunk === '[DERIVED PARAMETER]') {
                      return (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono font-bold text-[10px] mr-1"
                        >
                          [DERIVED PARAMETER]
                        </span>
                      );
                    }
                    if (chunk === '[THEORETICAL MODEL]') {
                      return (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-700 font-mono font-bold text-[10px] mr-1"
                        >
                          [THEORETICAL MODEL]
                        </span>
                      );
                    }
                    if (chunk === '[MISSING / UNKNOWN]') {
                      return (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-mono font-bold text-[10px] mr-1"
                        >
                          [MISSING / UNKNOWN]
                        </span>
                      );
                    }
                    if (chunk === '[OFFLINE KNOWLEDGE BASE]') {
                      return (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono font-bold text-[10px] mr-1"
                        >
                          [OFFLINE KNOWLEDGE BASE]
                        </span>
                      );
                    }
                    return <span key={i}>{chunk}</span>;
                  })}

                {/* Footer metadata and copy action */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.model && (
                      <span className="text-violet-400/80 bg-violet-950/30 px-1 rounded">
                        {msg.model}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {msg.sender === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-1 py-0.5 rounded hover:bg-slate-800/50"
                        title="Copy scientific analysis"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-950 text-violet-300 border border-violet-700 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-[#0B1022] border border-slate-800 text-xs text-cyan-400 flex items-center gap-2 font-mono">
                <Loader2 size={15} className="animate-spin" />
                <span>Synthesizing astrophysical spectra and observational archives...</span>
              </div>
            </div>
          )}

          {lastFailedPrompt && !isLoading && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => handleSendMessage(lastFailedPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs transition-colors"
              >
                <RefreshCw size={13} />
                <span>Retry Last Question</span>
              </button>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="pt-3 border-t border-slate-800/80 mb-3">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Activity size={11} className="text-cyan-400" />
            <span>{t('quickQuestions')}:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {researchPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-[#0A0E1F] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors text-left truncate max-w-full"
                title={q}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isLoading}
            placeholder={t('chatPlaceholder')}
            className="flex-1 bg-[#090D1C] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
          />

          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)]"
          >
            <Send size={16} className="rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
