import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  List,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Info,
  Plus,
  Library,
  Puzzle,
  Download,
  Maximize2,
  Minimize2,
  Monitor,
  Sliders,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Languages,
  Globe,
  Check,
  ChevronDown,
  Columns,
  Sparkle,
  ArrowDownCircle,
  Terminal,
  Loader2,
  Search,
  MessageSquare,
  PenTool,
  FileText,
} from 'lucide-react';
import { BookItem, ReadingTheme } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface BookHeaderProps {
  activeBook: BookItem;
  onOpenLibrary: () => void;
  onOpenUpload: () => void;
  onOpenTOC: () => void;
  onOpenCalibrator?: () => void;
  onOpenExportModal: () => void;
  onOpenDiagnosticLog?: () => void;
  onOpenInfo: () => void;
  onOpenExtensionGuide: () => void;
  onOpenSearch?: () => void;
  onOpenAnnotations?: () => void;
  annotationsCount?: number;
  onResetAllAppData?: () => void;
  onResetAudioEngine?: () => void;
  theme: ReadingTheme;
  setTheme: (theme: ReadingTheme) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  autoScroll: boolean;
  setAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
  isTranslationBarOpen?: boolean;
  onToggleTranslationBar?: () => void;
  readerContentWidth?: number;
  setReaderContentWidth?: (width: number) => void;
  isFullWidth?: boolean;
  setIsFullWidth?: React.Dispatch<React.SetStateAction<boolean>>;
  isSideBySide?: boolean;
  setIsSideBySide?: React.Dispatch<React.SetStateAction<boolean>>;
  autoTranslateSlidingWindow?: boolean;
  setAutoTranslateSlidingWindow?: React.Dispatch<React.SetStateAction<boolean>>;
  targetLang?: string;
  setTargetLang?: (lang: string) => void;
  onTranslateCurrentSection?: (targetLanguage?: string) => void;
  isTranslating?: boolean;
}

export const BookHeader: React.FC<BookHeaderProps> = ({
  activeBook,
  onOpenLibrary,
  onOpenUpload,
  onOpenTOC,
  onOpenCalibrator,
  onOpenExportModal,
  onOpenDiagnosticLog,
  onOpenInfo,
  onOpenExtensionGuide,
  onOpenSearch,
  onOpenAnnotations,
  annotationsCount = 0,
  onResetAllAppData,
  onResetAudioEngine,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  autoScroll,
  setAutoScroll,
  isTranslationBarOpen = false,
  onToggleTranslationBar,
  readerContentWidth = 960,
  setReaderContentWidth,
  isFullWidth = false,
  setIsFullWidth,
  isSideBySide = false,
  setIsSideBySide,
  autoTranslateSlidingWindow = false,
  setAutoTranslateSlidingWindow,
  targetLang = 'pt',
  setTargetLang,
  onTranslateCurrentSection,
  isTranslating = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showScreenAdjustMenu, setShowScreenAdjustMenu] = useState<boolean>(false);
  const [showTranslationMenu, setShowTranslationMenu] = useState<boolean>(false);

  const screenAdjustRef = useRef<HTMLDivElement>(null);
  const translationMenuRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<HTMLDivElement>(null);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (screenAdjustRef.current && !screenAdjustRef.current.contains(target)) {
        setShowScreenAdjustMenu(false);
      }
      if (translationMenuRef.current && !translationMenuRef.current.contains(target)) {
        setShowTranslationMenu(false);
      }
      if (resetRef.current && !resetRef.current.contains(target)) {
        setShowResetConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'Para instalar como Aplicativo no Microsoft Edge ou Chrome:\n\n1. Clique nos três pontinhos (...) no canto superior do navegador\n2. Vá em "Aplicativos" (Apps) -> "Instalar este site como aplicativo"\n3. Pronto! Ele abrirá em janela dedicada em tela cheia fora do navegador.'
      );
    }
  };

  const handleSetWidth = (w: number) => {
    if (setReaderContentWidth) setReaderContentWidth(w);
    if (setIsFullWidth) setIsFullWidth(false);
  };

  const themeHeaderClasses = {
    light: 'bg-white/95 border-slate-200 text-slate-800',
    dark: 'bg-[#181d24]/95 border-slate-700 text-slate-100',
  }[theme];

  const dropdownBgClasses = {
    light: 'bg-white border-slate-200 text-slate-900',
    dark: 'bg-slate-900 border-slate-700 text-slate-100',
  }[theme];

  return (
    <header
      id="audiobook-header"
      className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300 ${themeHeaderClasses}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Left Toolbar: Library, Upload, Search, Annotations, Calibrate, Export */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Library Button */}
          <button
            onClick={() => {
              soundEffects.click();
              onOpenLibrary();
            }}
            className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 font-bold text-xs border border-amber-500/40 transition shadow-2xs cursor-pointer shrink-0"
            title="Abrir Biblioteca de Livros e Documentos"
          >
            <Library className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => {
              soundEffects.click();
              onOpenUpload();
            }}
            className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold border border-black/10 dark:border-white/10 transition cursor-pointer shrink-0"
            title="Carregar PDF, DOCX, ePub ou Texto"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">Ler Novo</span>
          </button>

          {/* In-Document Search Button */}
          {onOpenSearch && (
            <button
              onClick={() => {
                soundEffects.click();
                onOpenSearch();
              }}
              title="Buscar palavras, frases ou conceitos no documento (Ctrl+F / Cmd+F)"
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 font-bold text-xs border border-amber-500/40 transition shadow-2xs cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Buscar</span>
              <kbd className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-amber-500/20 font-mono opacity-80 border border-amber-500/30">
                Ctrl+F
              </kbd>
            </button>
          )}

          {/* Annotations & Highlights Button (Adobe Acrobat Style) */}
          {onOpenAnnotations && (
            <button
              onClick={() => {
                soundEffects.click();
                onOpenAnnotations();
              }}
              title="Ver todas as anotações, notas e destaques do livro"
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-950 dark:text-purple-200 font-bold text-xs border border-purple-500/40 transition shadow-2xs cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
              <span className="hidden sm:inline">Anotações</span>
              {annotationsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-600 text-white font-mono font-bold">
                  {annotationsCount}
                </span>
              )}
            </button>
          )}

          {/* Calibrate & Pattern Detector Button */}
          {onOpenCalibrator && (
            <button
              onClick={() => {
                soundEffects.click();
                onOpenCalibrator();
              }}
              title="Calibração pré-texto, corte de cabeçalhos repetidos e detector visual de blocos"
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-400/30 transition shadow-2xs cursor-pointer shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span className="hidden lg:inline">Calibrar</span>
            </button>
          )}

          {/* Export Text & Project Save Button */}
          <button
            onClick={() => {
              soundEffects.click();
              onOpenExportModal();
            }}
            title="Exportar Texto Formatado (.TXT / .MD) ou Salvar Projeto (.audiobook)"
            className="h-8 flex items-center gap-1.5 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-200 font-bold text-xs border border-emerald-500/40 transition shadow-2xs cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline">Exportar Texto</span>
          </button>
        </div>

        {/* Right Controls: Translation, Screen Size/Adjust, Auto-Scroll, Fullscreen, App, Theme, Reset */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Translation Dropdown Menu */}
          <div ref={translationMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                setShowTranslationMenu((prev) => !prev);
                setShowScreenAdjustMenu(false);
                setShowResetConfirm(false);
              }}
              title="Opções de Tradução Contínua e Idioma"
              className={`h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                showTranslationMenu || isTranslationBarOpen || isSideBySide
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border-black/10 dark:border-white/10'
              }`}
            >
              {isTranslating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Languages className={`w-3.5 h-3.5 ${showTranslationMenu || isTranslationBarOpen || isSideBySide ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
              )}
              <span className="hidden sm:inline">Tradução</span>
              {targetLang && (
                <span className="text-[10px] px-1 rounded bg-white/20 font-mono">
                  {targetLang.toUpperCase()}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Translation Dropdown Popover */}
            {showTranslationMenu && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl shadow-2xl z-50 border animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ${dropdownBgClasses}`}
              >
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Tradução & Idioma</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isTranslating && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Traduzindo...
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-900 dark:text-blue-300 font-mono font-bold">
                      {targetLang.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Quick Languages Grid */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold flex items-center justify-between">
                    <span>Selecionar Idioma de Destino:</span>
                    {isTranslating && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        Processando
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { code: 'pt', name: 'Português', flag: '🇧🇷' },
                      { code: 'en', name: 'Inglês', flag: '🇺🇸' },
                      { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
                      { code: 'fr', name: 'Francês', flag: '🇫🇷' },
                      { code: 'de', name: 'Alemão', flag: '🇩🇪' },
                      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
                      { code: 'ja', name: 'Japonês', flag: '🇯🇵' },
                      { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
                      { code: 'zh', name: 'Chinês', flag: '🇨🇳' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          soundEffects.success();
                          setTargetLang?.(lang.code);
                          if (onTranslateCurrentSection) {
                            onTranslateCurrentSection(lang.code);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer ${
                          targetLang === lang.code
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span className="truncate">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Screen / Lado a Lado Toggle (Optional) */}
                {setIsSideBySide && (
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Columns className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Dividir Tela (Split Screen)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isSideBySide ? 'Original e tradução lado a lado' : 'Tradução direta na tela inteira'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.toggle(!isSideBySide);
                        setIsSideBySide((prev) => !prev);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isSideBySide
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {isSideBySide ? 'Ativado' : 'Desativado'}
                    </button>
                  </div>
                )}

                {/* Lookahead Auto-Buffer Toggle */}
                {setAutoTranslateSlidingWindow && (
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Buffer Contínuo (2º Plano)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Traduz próximas páginas com antecedência
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.toggle(!autoTranslateSlidingWindow);
                        setAutoTranslateSlidingWindow((prev) => !prev);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        autoTranslateSlidingWindow
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {autoTranslateSlidingWindow ? 'Ligado' : 'Desligado'}
                    </button>
                  </div>
                )}

                {/* Open On-Page Toolbar Button */}
                {onToggleTranslationBar && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onToggleTranslationBar();
                      setShowTranslationMenu(false);
                    }}
                    className="w-full py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 transition cursor-pointer"
                  >
                    <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isTranslationBarOpen ? 'Recolher Barra de Tradução' : 'Abrir Barra de Tradução na Página'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Screen Size, Reader Width & Display Adjustments Dropdown (Top Right) */}
          <div ref={screenAdjustRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowScreenAdjustMenu((prev) => !prev);
                setShowResetConfirm(false);
              }}
              title="Ajustes de Largura da Página, Tamanho da Tela e Fonte"
              className={`h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                showScreenAdjustMenu
                  ? 'bg-amber-600/20 border-amber-500 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
                  : 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border-black/10 dark:border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Tamanho</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Screen Adjust Dropdown Menu */}
            {showScreenAdjustMenu && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl shadow-2xl z-50 border animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ${dropdownBgClasses}`}
              >
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                    <span>Ajuste de Tela & Leitura</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono">
                    {isFullWidth ? '100% Tela Cheia' : `${readerContentWidth}px`}
                  </span>
                </div>

                {/* Slider de Largura */}
                {setReaderContentWidth && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span>Largura da Página de Leitura:</span>
                      <span className="font-mono opacity-80">{readerContentWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={560}
                      max={1800}
                      step={20}
                      value={readerContentWidth}
                      onChange={(e) => handleSetWidth(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                )}

                {/* Predefinições de Largura */}
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetWidth(720)}
                    className={`py-1 rounded-lg border font-medium transition ${
                      readerContentWidth === 720 && !isFullWidth
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                    }`}
                  >
                    Compacto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetWidth(960)}
                    className={`py-1 rounded-lg border font-medium transition ${
                      readerContentWidth === 960 && !isFullWidth
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                    }`}
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetWidth(1250)}
                    className={`py-1 rounded-lg border font-medium transition ${
                      readerContentWidth === 1250 && !isFullWidth
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                    }`}
                  >
                    Amplo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetWidth(1550)}
                    className={`py-1 rounded-lg border font-medium transition ${
                      readerContentWidth === 1550 && !isFullWidth
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                    }`}
                  >
                    Estendido
                  </button>
                </div>

                {/* 100% Full Width Toggle */}
                {setIsFullWidth && (
                  <button
                    type="button"
                    onClick={() => setIsFullWidth((prev) => !prev)}
                    className={`w-full py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isFullWidth
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>{isFullWidth ? 'Voltar para Largura Ajustada' : 'Expandir para 100% da Largura'}</span>
                  </button>
                )}

                {/* Font Size Adjustments */}
                <div className="flex items-center justify-between pt-1 border-t border-black/10 dark:border-white/10">
                  <span className="text-[11px] font-semibold">Tamanho da Fonte:</span>
                  <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5 border border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setFontSize((size) => Math.max(14, size - 1))}
                      title="Diminuir fonte"
                      className="px-2 py-0.5 text-xs font-serif font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      A-
                    </button>
                    <span className="text-[11px] px-2 font-mono font-bold opacity-80">{fontSize}px</span>
                    <button
                      type="button"
                      onClick={() => setFontSize((size) => Math.min(28, size + 1))}
                      title="Aumentar fonte"
                      className="px-2 py-0.5 text-xs font-serif font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Auto Scroll Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold">Rolagem Automática (Auto-Scroll):</span>
                  <button
                    type="button"
                    onClick={() => setAutoScroll((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      autoScroll
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-black/10 dark:bg-white/10 opacity-70'
                    }`}
                  >
                    {autoScroll ? 'Ligado' : 'Desligado'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Scroll Direct Top Toolbar Toggle Button */}
          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            title={
              autoScroll
                ? 'Rolagem Automática ATIVADA (Clique para desativar)'
                : 'Rolagem Automática DESATIVADA (Clique para ativar)'
            }
            className={`h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
              autoScroll
                ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border-black/10 dark:border-white/10 opacity-85 hover:opacity-100'
            }`}
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            <span className="hidden sm:inline">Auto-Scroll</span>
            <span className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded ${autoScroll ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
              {autoScroll ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition border border-black/10 dark:border-white/10 cursor-pointer shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Standalone PWA App Install Button */}
          <button
            onClick={handleInstallPwa}
            title="Instalar como Aplicativo Independente em Tela Cheia (PWA)"
            className="h-8 hidden sm:flex items-center gap-1 px-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-600/25 transition text-xs font-semibold cursor-pointer shrink-0"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">App</span>
          </button>

          {/* Theme Switcher */}
          <div className="h-8 flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5 border border-black/10 dark:border-white/10 shrink-0">
            <button
              onClick={() => setTheme('dark')}
              title="Modo Noite / Escuro (Padrão)"
              className={`h-6 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              title="Modo Claro"
              className={`h-6 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset App & Clean Settings Button (Top Right corner) */}
          {onResetAllAppData && (
            <div ref={resetRef} className="relative">
              <button
                onClick={() => {
                  setShowResetConfirm((prev) => !prev);
                  setShowScreenAdjustMenu(false);
                }}
                title="Resetar aplicativo, destravar áudio e limpar configurações salvas"
                className="h-8 flex items-center gap-1 px-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-700 dark:text-rose-300 border border-rose-600/25 transition text-xs font-semibold cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden lg:inline">Resetar</span>
              </button>

              {showResetConfirm && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3 border ${dropdownBgClasses}`}
                >
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Resetar e Limpar Aplicativo</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80">
                    Isso limpa travamentos de áudio, restaura a velocidade padrão (1.25x), limpa caches locais e restaura as configurações originais.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetConfirm(false);
                        if (onResetAudioEngine) onResetAudioEngine();
                        onResetAllAppData();
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Confirmar Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
