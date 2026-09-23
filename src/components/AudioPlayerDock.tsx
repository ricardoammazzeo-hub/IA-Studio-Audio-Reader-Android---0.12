import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Settings2,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bookmark,
  Sparkles,
  Globe2,
  Moon
} from 'lucide-react';
import { UseAudiobookNarratorReturn } from '../hooks/useAudiobookNarrator';
import { SectionItem, ReadingTheme } from '../types';

interface AudioPlayerDockProps {
  narrator: UseAudiobookNarratorReturn;
  section: SectionItem;
  totalSections?: number;
  activeSectionIndex?: number;
  allSections?: SectionItem[];
  onPrevSection: () => void;
  onNextSection: () => void;
  hasPrevSection: boolean;
  hasNextSection: boolean;
  onOpenExportModal?: () => void;
  theme: ReadingTheme;
}

export const AudioPlayerDock: React.FC<AudioPlayerDockProps> = ({
  narrator,
  section,
  totalSections,
  activeSectionIndex,
  allSections,
  onPrevSection,
  onNextSection,
  hasPrevSection,
  hasNextSection,
  onOpenExportModal,
  theme,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [kindleMode, setKindleMode] = useState<number>(0);

  // Kindle-style reading progress metrics
  const totalSectionsCount = totalSections || allSections?.length || 1;
  const currentSecIdx = activeSectionIndex ?? (section.chapterNumber ? Math.max(0, section.chapterNumber - 1) : 0);

  // Calculate total book paragraphs and completed paragraphs
  const totalBookParagraphs = allSections && allSections.length > 0
    ? allSections.reduce((acc, s) => acc + s.paragraphs.length, 0)
    : Math.max(1, section.paragraphs.length);

  const completedParagraphs = allSections && allSections.length > 0
    ? allSections.slice(0, currentSecIdx).reduce((acc, s) => acc + s.paragraphs.length, 0) +
      narrator.currentParagraphIndex +
      (narrator.isPlaying ? 0.5 : 0)
    : narrator.currentParagraphIndex + (narrator.isPlaying ? 0.5 : 0);

  const bookProgressPercent = totalBookParagraphs > 0
    ? Math.min(100, Math.max(0, Math.round((completedParagraphs / totalBookParagraphs) * 100)))
    : 0;

  // Reading time estimates (based on 140 WPM adjusted for narrator speed)
  const effectiveWpm = 140 * Math.max(0.5, narrator.speed);

  const remainingWordsSection = section.paragraphs
    .slice(narrator.currentParagraphIndex)
    .reduce((acc, p) => acc + (p.text ? p.text.split(/\s+/).length : 0), 0);
  const minutesLeftSection = Math.max(1, Math.round(remainingWordsSection / effectiveWpm));

  const remainingWordsBook = allSections && allSections.length > 0
    ? allSections
        .slice(currentSecIdx + 1)
        .reduce(
          (acc, s) => acc + s.paragraphs.reduce((pacc, p) => pacc + (p.text ? p.text.split(/\s+/).length : 0), 0),
          remainingWordsSection
        )
    : remainingWordsSection;

  const minutesLeftBook = Math.max(1, Math.round(remainingWordsBook / effectiveWpm));
  const hoursLeftBook = Math.floor(minutesLeftBook / 60);
  const minsRemainderBook = minutesLeftBook % 60;
  const timeFormattedBook = hoursLeftBook > 0 ? `${hoursLeftBook}h ${minsRemainderBook}m` : `${minsRemainderBook} min`;

  const cycleKindleMode = () => {
    setKindleMode((prev) => (prev + 1) % 4);
  };

  const getKindleLabel = () => {
    switch (kindleMode) {
      case 0:
        return `${bookProgressPercent}% do livro`;
      case 1:
        return `${minutesLeftSection} min no cap.`;
      case 2:
        return `${timeFormattedBook} no livro`;
      case 3:
      default:
        return `Pág. ${currentSecIdx + 1} de ${totalSectionsCount}`;
    }
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  const themeClasses = {
    light: 'bg-white border-slate-200 text-slate-800 shadow-xl',
    dark: 'bg-[#1e232a] border-slate-700 text-slate-100 shadow-2xl',
  }[theme];

  const isEdgeNatural =
    narrator.selectedVoice.includes('Natural') || narrator.selectedVoice.includes('Online');

  if (narrator.isPocketMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-slate-500 flex flex-col items-center justify-center p-6">
        <Moon className="w-16 h-16 text-amber-600/50 mb-6" />
        <h2 className="text-xl font-medium text-amber-500 mb-2">Modo Bolso Ativado</h2>
        <p className="text-center text-sm max-w-sm mb-12">
          A tela está preta para economizar bateria em painéis OLED/AMOLED. O narrador continuará a leitura e o celular não irá suspender (Wake Lock ativo).
        </p>
        
        <div className="flex gap-4 mb-12">
          <button
            onClick={narrator.togglePlay}
            className="w-16 h-16 rounded-full bg-amber-900/40 text-amber-500 flex items-center justify-center"
          >
            {narrator.isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
        </div>

        <button
          onClick={() => narrator.setPocketMode(false)}
          className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium hover:bg-slate-800 transition"
        >
          Sair do Modo Bolso
        </button>
      </div>
    );
  }

  return (
    <div
      id="audiobook-player-dock"
      className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md transition-all duration-300 ${themeClasses}`}
    >
      {/* Settings Popover */}
      {showSettings && (
        <div
          id="audiobook-settings-panel"
          className="absolute bottom-full right-4 mb-3 w-84 max-w-[calc(100vw-2rem)] rounded-xl border border-amber-900/20 bg-amber-50/95 dark:bg-slate-900/95 dark:border-slate-700 p-4 shadow-2xl backdrop-blur-lg"
        >
          <div className="flex items-center justify-between mb-3 border-b border-amber-200 dark:border-slate-800 pb-2">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              Configurações de Narração
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              Fechar
            </button>
          </div>

          {/* Voice selector */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Voz da Narração (Sistema / Edge / Windows)
              </label>
              {isEdgeNatural && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Edge Natural
                </span>
              )}
            </div>
            <select
              value={narrator.selectedVoice}
              onChange={(e) => narrator.setSelectedVoice(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
            >
              {/* Edge Natural Voices Group */}
              {narrator.availableVoices.some(
                (v) => v.name.includes('Natural') || v.name.includes('Online')
              ) && (
                <optgroup label="🌟 Vozes Naturais do Microsoft Edge (Recomendadas)">
                  {narrator.availableVoices
                    .filter((v) => v.name.includes('Natural') || v.name.includes('Online'))
                    .map((v) => (
                      <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </optgroup>
              )}

              {/* Portuguese Standard Voices */}
              <optgroup label="🇧🇷 Português (Windows / Sistema)">
                {narrator.availableVoices
                  .filter(
                    (v) =>
                      v.lang.startsWith('pt') &&
                      !v.name.includes('Natural') &&
                      !v.name.includes('Online')
                  )
                  .map((v) => (
                    <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
              </optgroup>

              {/* Spanish Voices */}
              <optgroup label="🇪🇸 Español">
                {narrator.availableVoices
                  .filter(
                    (v) =>
                      v.lang.startsWith('es') &&
                      !v.name.includes('Natural') &&
                      !v.name.includes('Online')
                  )
                  .map((v) => (
                    <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
              </optgroup>

              {/* English & Others */}
              <optgroup label="🌐 English & Outros Idiomas">
                {narrator.availableVoices
                  .filter(
                    (v) =>
                      !v.lang.startsWith('pt') &&
                      !v.lang.startsWith('es') &&
                      !v.name.includes('Natural') &&
                      !v.name.includes('Online')
                  )
                  .map((v) => (
                    <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              ✨ 100% gratuito: utiliza os sintetizadores de voz nativos do seu navegador e do Windows sem custos de API.
            </p>
          </div>

          {/* Footnotes narration toggle */}
          <div className="mb-4 pt-3 border-t border-amber-200/50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <div>
                <span className="text-xs font-medium block">Ler Notas de Rodapé</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  (Padrão: desligado)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => narrator.setReadFootnotes(!narrator.readFootnotes)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                narrator.readFootnotes ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  narrator.readFootnotes ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">Volume</span>
              <span className="font-semibold">{Math.round(narrator.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={narrator.volume}
              onChange={(e) => narrator.setVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Progress Track Bar (Dual: Book Progress & Section Progress) */}
      <div 
        className="w-full bg-amber-900/10 dark:bg-slate-800 h-1.5 cursor-pointer relative group"
        title={`Página: ${Math.round(narrator.progressPercent)}% • Livro completo: ${bookProgressPercent}%`}
      >
        {/* Total Book Progress subtle underlay */}
        <div
          className="h-full bg-amber-500/20 dark:bg-amber-400/20 absolute top-0 left-0 transition-all duration-500"
          style={{ width: `${bookProgressPercent}%` }}
        />
        {/* Current Section Progress */}
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-500 relative transition-all duration-300 z-10"
          style={{ width: `${narrator.progressPercent}%` }}
        >
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-600 dark:bg-amber-400 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section / Page Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 max-w-xs sm:max-w-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-700/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 font-serif font-bold text-xs shrink-0 border border-amber-600/20">
            {section.chapterNumber === 0 ? 'Intro' : `Pág.${section.chapterNumber}`}
          </div>
          <div className="truncate min-w-0 flex-1">
            <div className="font-serif font-semibold text-sm truncate" title={section.partTitle}>
              {section.partTitle}
            </div>
            <div className="text-xs opacity-80 flex items-center gap-2 flex-wrap">
              {/* Interactive Kindle-Style Percentage & Time Left Pill */}
              <button
                type="button"
                onClick={cycleKindleMode}
                title="Clique para alternar métrica estilo Kindle: % do livro, tempo no capítulo, tempo no livro ou página"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 text-amber-900 dark:text-amber-200 text-[10px] font-bold tracking-tight transition cursor-pointer select-none shrink-0"
              >
                <Bookmark className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-current" />
                <span>{getKindleLabel()}</span>
              </button>
              <span className="hidden sm:inline opacity-50">•</span>
              <span className="hidden sm:inline text-[11px] opacity-75">
                § {narrator.currentParagraphIndex + 1}/{section.paragraphs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls - Centered and Fixed */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-4 shrink-0">
          <button
            onClick={onPrevSection}
            disabled={!hasPrevSection}
            title="Página / Seção Anterior"
            className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={narrator.skipBackward}
            title="Parágrafo Anterior"
            className="hidden sm:block p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="play-pause-audio-btn"
            onClick={narrator.togglePlay}
            disabled={narrator.isLoadingAudio}
            title={narrator.isPlaying ? 'Pausar Áudio' : 'Ouvir / Emitir Leitura'}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
          >
            {narrator.isLoadingAudio ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-200" />
            ) : narrator.isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={narrator.skipForward}
            title="Próximo Parágrafo"
            className="hidden sm:block p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onNextSection}
            disabled={!hasNextSection}
            title="Próxima Página / Seção"
            className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right: Rate, Voice details, Download, Settings - Anchored to Right */}
        <div className="flex items-center justify-end gap-2 flex-1">
          {/* Speed Pills */}
          <div className="hidden sm:flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-black/10 dark:border-white/10">
            {speedOptions.map((rate) => (
              <button
                key={rate}
                onClick={() => narrator.setSpeed(rate)}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${
                  narrator.speed === rate
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Voice status */}
          <div
            onClick={() => setShowSettings(!showSettings)}
            title="Clique para escolher a voz do sistema ou Edge"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 cursor-pointer hover:border-amber-500 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="truncate max-w-[130px]">
              {narrator.selectedVoice ? narrator.selectedVoice.split('-')[0].replace('Microsoft', '').trim() : 'Voz do Sistema'}
            </span>
          </div>

          {/* Export Audio / Text */}
          <button
            onClick={onOpenExportModal || narrator.downloadCurrentSectionAudio}
            disabled={narrator.isDownloading}
            title="Exportar Texto ou Narração"
            className="hidden sm:flex p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition text-xs items-center gap-1 font-medium"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span className="hidden lg:inline">Exportar</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Configurações de Voz"
            className={`p-2 rounded-lg transition ${
              showSettings
                ? 'bg-amber-600 text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Pocket Mode Trigger */}
          <button
            onClick={() => narrator.setPocketMode(true)}
            title="Modo Bolso (Economia de Bateria)"
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center justify-center"
          >
            <Moon className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
