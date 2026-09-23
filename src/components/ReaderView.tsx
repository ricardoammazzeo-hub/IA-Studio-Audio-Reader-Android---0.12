import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  Play,
  Bookmark,
  BookOpen,
  Quote,
  Edit3,
  FileText,
  Eye,
  EyeOff,
  Globe2,
  Sparkles,
  RotateCcw,
  Loader2,
  Maximize2,
  Minimize2,
  Columns,
  Zap,
  MoveUp,
  MoveDown,
  ArrowUpDown,
  CheckCircle2,
  Save,
  X,
  Scissors,
  Trash2,
  Sliders,
  Check,
  HelpCircle,
  Headphones,
  Merge,
  Maximize,
  SlidersHorizontal,
  ChevronUp,
  Languages,
  MessageSquare,
  Copy,
  PenTool,
} from 'lucide-react';
import { SectionItem, ParagraphItem, ParagraphType, ReadingTheme, TextAnnotation, AnnotationColor } from '../types';
import {
  SUPPORTED_LANGUAGES,
  translateSectionBatch,
  triggerBrowserNativeTranslatePrompt,
  clearTranslationCache,
  getCacheKey,
} from '../utils/browserTranslation';
import { logger } from '../utils/appLogger';
import { soundEffects } from '../utils/soundEffects';

interface ReaderViewProps {
  // Support both multi-section continuous stream and single section fallback
  sections?: SectionItem[];
  section?: SectionItem;
  bookId?: string;
  activeSectionIndex?: number;
  currentParagraphIndex: number;
  isPlaying: boolean;
  onParagraphClick: (sectionIndex: number, paragraphIndex: number) => void;
  onOpenSectionEditor?: (sectionIndex?: number) => void;
  onAddBookmark?: (title: string, sectionIndex: number, paragraphIndex?: number) => void;
  onUpdateParagraphType?: (
    sectionIndex: number,
    paragraphId: string,
    newType: ParagraphType,
    isNonFree?: boolean
  ) => void;
  onUpdateParagraphText?: (
    sectionIndex: number,
    paragraphId: string,
    newText: string
  ) => void;
  onSaveSectionTranslations?: (
    sectionIndex: number,
    translations: Record<string, string>,
    targetLang: string
  ) => void;
  onMoveParagraph?: (
    sectionIndex: number,
    fromIndex: number,
    direction: 'up' | 'down'
  ) => void;
  onJoinParagraphs?: (
    sectionIndex: number,
    firstIndex: number,
    secondIndex?: number
  ) => void;
  onJoinFirstSentenceToPrevious?: (
    sectionIndex: number,
    paragraphIndex: number
  ) => { transferredSentence: string; mergedWholeBlock: boolean } | null;
  onApplyGlobalAction?: (
    term: string,
    action:
      | 'remove_term'
      | 'split_term'
      | 'mark_pretextual'
      | 'mark_footnote'
      | 'mark_quote'
      | 'mark_heading'
      | 'omit_block'
  ) => void;
  onOpenCalibrator?: () => void;
  annotations?: TextAnnotation[];
  onAddOrEditAnnotation?: (annotation: Partial<TextAnnotation>) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  isTranslationBarOpen?: boolean;
  setIsTranslationBarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  readerContentWidth?: number;
  isFullWidth?: boolean;
  isSideBySide?: boolean;
  setIsSideBySide?: React.Dispatch<React.SetStateAction<boolean>>;
  targetLang?: string;
  setTargetLang?: (lang: string) => void;
  autoTranslateSlidingWindow?: boolean;
  setAutoTranslateSlidingWindow?: React.Dispatch<React.SetStateAction<boolean>>;
  onRegisterTranslateHandler?: (handler: (lang: string) => void) => void;
  setIsTranslatingExternal?: (isTranslating: boolean) => void;
  fontSize: number;
  autoScroll: boolean;
  theme: ReadingTheme;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  sections: rawSections,
  section: rawSection,
  bookId = '',
  activeSectionIndex = 0,
  currentParagraphIndex,
  isPlaying,
  onParagraphClick,
  onOpenSectionEditor,
  onAddBookmark,
  onUpdateParagraphType,
  onUpdateParagraphText,
  onSaveSectionTranslations,
  onMoveParagraph,
  onJoinParagraphs,
  onJoinFirstSentenceToPrevious,
  onApplyGlobalAction,
  onOpenCalibrator,
  annotations = [],
  onAddOrEditAnnotation,
  onDeleteAnnotation,
  isTranslationBarOpen = false,
  setIsTranslationBarOpen,
  readerContentWidth: propReaderContentWidth,
  isFullWidth: propIsFullWidth,
  isSideBySide: propIsSideBySide,
  setIsSideBySide: propSetIsSideBySide,
  targetLang: propTargetLang,
  setTargetLang: propSetTargetLang,
  autoTranslateSlidingWindow: propAutoTranslateSlidingWindow,
  setAutoTranslateSlidingWindow: propSetAutoTranslateSlidingWindow,
  onRegisterTranslateHandler,
  setIsTranslatingExternal,
  fontSize,
  autoScroll,
  theme,
}) => {
  // Resolve list of sections for infinite / continuous scrolling
  const sections: SectionItem[] = React.useMemo(() => {
    if (rawSections && rawSections.length > 0) return rawSections;
    if (rawSection) return [rawSection];
    return [];
  }, [rawSections, rawSection]);

  const activeParagraphRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Floating text selection popover state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [selectionContext, setSelectionContext] = useState<{ secIndex: number; paragraphId: string } | null>(null);

  // Translation states keyed by paragraph.id
  const [localTargetLang, setLocalTargetLang] = useState<string>('pt');
  const targetLang = propTargetLang !== undefined ? propTargetLang : localTargetLang;
  const setTargetLang = (lang: string) => {
    setLocalTargetLang(lang);
    if (propSetTargetLang) propSetTargetLang(lang);
  };

  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatingSectionIndices, setTranslatingSectionIndices] = useState<number[]>([]);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Sync external translation flag
  useEffect(() => {
    if (setIsTranslatingExternal) {
      setIsTranslatingExternal(isTranslating);
    }
  }, [isTranslating, setIsTranslatingExternal]);

  const [localIsSideBySide, setLocalIsSideBySide] = useState<boolean>(false);
  const isSideBySide = propIsSideBySide !== undefined ? propIsSideBySide : localIsSideBySide;
  const setIsSideBySide = (action: boolean | ((prev: boolean) => boolean)) => {
    if (typeof action === 'function') {
      const nextVal = action(isSideBySide);
      setLocalIsSideBySide(nextVal);
      if (propSetIsSideBySide) propSetIsSideBySide(nextVal);
    } else {
      setLocalIsSideBySide(action);
      if (propSetIsSideBySide) propSetIsSideBySide(action);
    }
  };

  const [localIsFullWidth, setLocalIsFullWidth] = useState<boolean>(false);
  const isFullWidth = propIsFullWidth !== undefined ? propIsFullWidth : localIsFullWidth;

  // Resizable Reader Layout Width State (persistent, responsive to zoom)
  const [localReaderContentWidth, setLocalReaderContentWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audiobook_reader_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 2400) return parsed;
      }
    }
    return 960; // 960px default comfortable width
  });
  const readerContentWidth = propReaderContentWidth !== undefined ? propReaderContentWidth : localReaderContentWidth;

  const [localAutoTranslateSlidingWindow, setLocalAutoTranslateSlidingWindow] = useState<boolean>(true);
  const autoTranslateSlidingWindow = propAutoTranslateSlidingWindow !== undefined ? propAutoTranslateSlidingWindow : localAutoTranslateSlidingWindow;
  const setAutoTranslateSlidingWindow = (action: boolean | ((prev: boolean) => boolean)) => {
    if (typeof action === 'function') {
      const nextVal = action(autoTranslateSlidingWindow);
      setLocalAutoTranslateSlidingWindow(nextVal);
      if (propSetAutoTranslateSlidingWindow) propSetAutoTranslateSlidingWindow(nextVal);
    } else {
      setLocalAutoTranslateSlidingWindow(action);
      if (propSetAutoTranslateSlidingWindow) propSetAutoTranslateSlidingWindow(action);
    }
  };
  const [quickEditMode, setQuickEditMode] = useState<boolean>(false);
  const [hideOmittedBlocks, setHideOmittedBlocks] = useState<boolean>(true);
  const [quickToast, setQuickToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inline Direct Editing State for any paragraph in the reader view
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingSecIndex, setEditingSecIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Clear translation cache when bookId changes
  useEffect(() => {
    setTranslatedMap({});
    translatedSectionsRef.current.clear();
    inFlightTranslationRef.current.clear();
    setTranslatingSectionIndices([]);
    setIsTranslating(false);
  }, [bookId]);
  const translatedSectionsRef = useRef<Set<string>>(new Set());
  const inFlightTranslationRef = useRef<Set<string>>(new Set());

  const triggerQuickToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setQuickToast(msg);
    toastTimeoutRef.current = setTimeout(() => setQuickToast(null), 2500);
  };

  // Save inline text edit
  const handleSaveInlineEdit = (secIndex: number, paragraphId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      triggerQuickToast('⚠️ O texto não pode ficar vazio');
      return;
    }

    if (onUpdateParagraphText) {
      onUpdateParagraphText(secIndex, paragraphId, trimmed);
    } else if (onUpdateParagraphType) {
      // Fallback
      onUpdateParagraphType(secIndex, paragraphId, 'text');
    }

    logger.action('ParagraphEdit', `Parágrafo ${paragraphId} editado na seção ${secIndex + 1}`, {
      preview: trimmed.slice(0, 50),
    });
    triggerQuickToast('💾 Texto atualizado com sucesso!');
    setEditingParagraphId(null);
    setEditingSecIndex(null);
    setEditingText('');
  };

  // Scroll active paragraph into view
  useEffect(() => {
    if (autoScroll && activeParagraphRef.current) {
      activeParagraphRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSectionIndex, currentParagraphIndex, autoScroll]);

  // Translate a single specific section by index (Fast, lightweight, zero full-book memory bloat)
  const handleTranslateSingleSection = useCallback(
    async (secIndex: number, langCode: string, force = false) => {
      const sec = sections[secIndex];
      const cacheKey = `${secIndex}_${langCode}`;
      if (!sec) return;
      if (!force && (translatedSectionsRef.current.has(cacheKey) || inFlightTranslationRef.current.has(cacheKey))) {
        return;
      }

      const paragraphsToTranslate = sec.paragraphs.map((p) => ({
        id: p.id,
        text: p.text,
      }));

      inFlightTranslationRef.current.add(cacheKey);
      setTranslatingSectionIndices((prev) => Array.from(new Set([...prev, secIndex])));
      setIsTranslating(true);

      try {
        const result = await translateSectionBatch(paragraphsToTranslate, langCode);
        setTranslatedMap((prev) => ({ ...prev, ...result }));
        if (onSaveSectionTranslations) {
          onSaveSectionTranslations(secIndex, result, langCode);
        }
        translatedSectionsRef.current.add(cacheKey);
        logger.action(
          'Translation',
          `Seção ${secIndex + 1} traduzida para ${langCode} (${paragraphsToTranslate.length} parágrafos)`
        );
      } catch (err) {
        translatedSectionsRef.current.delete(cacheKey);
        console.error(`Error translating section ${secIndex}:`, err);
        logger.error('Translation', `Falha ao traduzir seção ${secIndex + 1}`, { error: String(err) });
      } finally {
        inFlightTranslationRef.current.delete(cacheKey);
        setTranslatingSectionIndices((prev) => prev.filter((idx) => idx !== secIndex));
        setIsTranslating(false);
      }
    },
    [sections]
  );

  // Progressive Sliding Window: Translates active section + next 2-3 buffer sections in advance
  const handleTranslateSlidingWindow = useCallback(
    async (centerSecIndex: number, langCode: string, force = false) => {
      setTargetLang(langCode);
      setShowOriginal(false);

      // Window: centerSecIndex, centerSecIndex + 1, centerSecIndex + 2
      const targetIndices = [
        centerSecIndex,
        centerSecIndex + 1,
        centerSecIndex + 2,
      ].filter((idx) => idx >= 0 && idx < sections.length);

      setIsTranslating(true);
      setTranslatingSectionIndices(targetIndices);

      try {
        for (const idx of targetIndices) {
          const sec = sections[idx];
          const cacheKey = `${idx}_${langCode}`;
          if (sec && (force || !translatedSectionsRef.current.has(cacheKey))) {
            inFlightTranslationRef.current.add(cacheKey);
            const result = await translateSectionBatch(
              sec.paragraphs.map((p) => ({ id: p.id, text: p.text })),
              langCode
            );
            translatedSectionsRef.current.add(cacheKey);
            inFlightTranslationRef.current.delete(cacheKey);
            setTranslatedMap((prev) => ({ ...prev, ...result }));
            if (onSaveSectionTranslations) {
              onSaveSectionTranslations(idx, result, langCode);
            }
          }
        }
        triggerQuickToast(
          `✨ Tradução ativada (${langCode.toUpperCase()}) • Próximas páginas preparadas em 2º plano`
        );
        logger.action(
          'TranslationSlidingWindow',
          `Janela deslizante ativada nas seções ${centerSecIndex + 1} a ${centerSecIndex + targetIndices.length}`
        );
      } catch (err) {
        console.error('Sliding window translation error:', err);
        triggerQuickToast('⚠️ Erro na tradução da página');
        logger.error('Translation', 'Erro na tradução em janela deslizante', { error: String(err) });
      } finally {
        setTranslatingSectionIndices([]);
        setIsTranslating(false);
      }
    },
    [sections]
  );

  // Expose sliding window translate function to external components (Header dropdown menu)
  useEffect(() => {
    if (onRegisterTranslateHandler) {
      onRegisterTranslateHandler((lang: string) => {
        handleTranslateSlidingWindow(activeSectionIndex, lang, true);
      });
    }
  }, [onRegisterTranslateHandler, handleTranslateSlidingWindow, activeSectionIndex]);

  // Proactive Lookahead Translation: Translates next pages and blocks in background while user reads
  useEffect(() => {
    if (!autoTranslateSlidingWindow) return;
    const isTranslationActive = translatedSectionsRef.current.size > 0 || Object.keys(translatedMap).length > 0;
    if (!isTranslationActive) return;

    // Buffer upcoming sections (active, active + 1, active + 2, active + 3)
    const activeWindowIndices = [
      activeSectionIndex - 1,
      activeSectionIndex,
      activeSectionIndex + 1,
      activeSectionIndex + 2,
      activeSectionIndex + 3,
    ];

    // Cleanup old translations from memory
    const keysToRemove: string[] = [];
    Object.keys(translatedMap).forEach(paraId => {
      // Find which section this paragraph belongs to
      let foundSecIdx = -1;
      for (let s = 0; s < sections.length; s++) {
        if (sections[s].paragraphs.some(p => p.id === paraId)) {
          foundSecIdx = s;
          break;
        }
      }
      if (foundSecIdx !== -1 && !activeWindowIndices.includes(foundSecIdx)) {
         keysToRemove.push(paraId);
      }
    });

    if (keysToRemove.length > 0) {
      setTranslatedMap(prev => {
        const next = { ...prev };
        keysToRemove.forEach(k => delete next[k]);
        return next;
      });
      // Clear from translatedSectionsRef to allow re-translating if user scrolls back
      translatedSectionsRef.current.forEach(key => {
        const secIdx = parseInt(key.split('_')[0], 10);
        if (!isNaN(secIdx) && !activeWindowIndices.includes(secIdx)) {
          translatedSectionsRef.current.delete(key);
        }
      });
      
      // Calculate keys to keep for browser translation cache
      const keysToKeep = new Set<string>();
      activeWindowIndices.forEach(idx => {
        if (sections[idx]) {
          sections[idx].paragraphs.forEach(p => {
             keysToKeep.add(getCacheKey(p.text, targetLang));
          });
        }
      });
      clearTranslationCache(keysToKeep);
    }

    const upcomingIndices = [
      activeSectionIndex,
      activeSectionIndex + 1,
      activeSectionIndex + 2,
      activeSectionIndex + 3,
    ].filter(
      (idx) =>
        idx >= 0 &&
        idx < sections.length &&
        !translatedSectionsRef.current.has(`${idx}_${targetLang}`) &&
        !inFlightTranslationRef.current.has(`${idx}_${targetLang}`)
    );

    if (upcomingIndices.length > 0) {
      upcomingIndices.forEach((idx) => {
        handleTranslateSingleSection(idx, targetLang);
      });
    }
  }, [
    activeSectionIndex,
    currentParagraphIndex,
    autoTranslateSlidingWindow,
    targetLang,
    sections,
    handleTranslateSingleSection,
    translatedMap,
  ]);

  // Check if a section title is genuine (from metadata/bookmarks/ePub) and not auto-generated (e.g. "Parte 1" or first words)
  const getGenuineOriginalTitle = (sec: SectionItem) => {
    const title = (sec.partTitle || '').trim();
    if (!title) return null;
    if (/^(Parte|Seção|Seccao|Página|Pagina|Page|Section|Chapter|Capítulo)\s*\d+$/i.test(title)) return null;
    const firstP = sec.paragraphs[0]?.text?.trim() || '';
    if (firstP && (firstP.startsWith(title) || title.startsWith(firstP.slice(0, 30)))) {
      return null;
    }
    return title;
  };

  // Merge paragraphs and sync translation automatically
  const handleJoinParagraphsWithTranslation = async (secIdx: number, p1Idx: number, p2Idx: number) => {
    const sec = sections[secIdx];
    if (!sec) return;
    const p1 = sec.paragraphs[p1Idx];
    const p2 = sec.paragraphs[p2Idx];
    if (!p1 || !p2) return;

    const mergedText = `${p1.text.trim()} ${p2.text.trim()}`.trim();
    const hasExistingTranslation = !!(translatedMap[p1.id] || translatedMap[p2.id] || p1.translations?.[targetLang] || p2.translations?.[targetLang]);

    // Update translated map immediately with concatenated translation if present
    if (hasExistingTranslation) {
      const t1 = translatedMap[p1.id] || p1.translations?.[targetLang] || p1.text;
      const t2 = translatedMap[p2.id] || p2.translations?.[targetLang] || p2.text;
      setTranslatedMap((prev) => {
        const next = { ...prev };
        next[p1.id] = `${t1.trim()} ${t2.trim()}`.trim();
        delete next[p2.id];
        return next;
      });
    }

    if (onJoinParagraphs) {
      onJoinParagraphs(secIdx, p1Idx, p2Idx);
    }
    triggerQuickToast('🔗 Blocos mesclados com sucesso!');

    // If translation was active, re-translate the merged paragraph to ensure proper translation flow
    if (hasExistingTranslation || Object.keys(translatedMap).length > 0) {
      try {
        const result = await translateSectionBatch([{ id: p1.id, text: mergedText }], targetLang);
        if (result[p1.id]) {
          setTranslatedMap((prev) => ({
            ...prev,
            [p1.id]: result[p1.id],
          }));
        }
      } catch (err) {
        console.warn('Could not re-translate merged paragraph:', err);
      }
    }
  };

  // Transfer first sentence to previous matching block and sync translations
  const handleJoinFirstSentenceWithTranslation = async (secIdx: number, pIdx: number) => {
    const sec = sections[secIdx];
    if (!sec) return;
    const currentP = sec.paragraphs[pIdx];
    if (!currentP) return;

    if (onJoinFirstSentenceToPrevious) {
      const res = onJoinFirstSentenceToPrevious(secIdx, pIdx);
      if (res) {
        triggerQuickToast(
          res.mergedWholeBlock
            ? '✂️ Bloco transferido para o parágrafo anterior correspondente!'
            : '✂️ 1ª Frase enviada para o parágrafo anterior correspondente!'
        );

        // Auto sync / re-translate affected paragraphs if translation is active
        if (Object.keys(translatedMap).length > 0) {
          setTimeout(async () => {
            const retransItems: { id: string; text: string }[] = [];
            const prevSec = sections[res.prevSecIdx] || sec;
            const prevP = prevSec?.paragraphs[res.prevParaIdx];
            if (prevP) {
              const combinedPrevText = `${prevP.text.trim()} ${res.transferredSentence}`.trim();
              retransItems.push({ id: prevP.id, text: combinedPrevText });
            }
            if (!res.mergedWholeBlock && res.remainingText) {
              retransItems.push({ id: currentP.id, text: res.remainingText });
            }

            if (retransItems.length > 0) {
              try {
                const batchResult = await translateSectionBatch(retransItems, targetLang);
                setTranslatedMap((prev) => {
                  const next = { ...prev, ...batchResult };
                  if (res.mergedWholeBlock) {
                    delete next[currentP.id];
                  }
                  return next;
                });
              } catch (err) {
                console.warn('Error refreshing translation on sentence transfer:', err);
              }
            }
          }, 60);
        }
      } else {
        triggerQuickToast('⚠️ Nenhum bloco anterior do mesmo tipo encontrado');
      }
    }
  };

  const hasTranslations = Object.keys(translatedMap).length > 0 || sections.some(s => s.paragraphs.some(p => !!p.translations?.[targetLang]));

  const themeTextClasses = {
    light: 'text-slate-800',
    dark: 'text-slate-200',
  }[theme];

  // Render dedicated Top-Right Action Controls for any paragraph card
  const renderParagraphTopRightActions = (
    secIndex: number,
    paragraph: ParagraphItem,
    pIndex: number
  ) => {
    const isSectionActive = activeSectionIndex === secIndex;
    const isParaActive = isSectionActive && currentParagraphIndex === pIndex;
    const isEditing = editingParagraphId === paragraph.id && editingSecIndex === secIndex;

    return (
      <div
        aria-hidden="true"
        data-no-speech="true"
        onClick={(e) => e.stopPropagation()}
        className="absolute -top-3 right-3 sm:right-4 z-20 flex items-center gap-1.5 transition-all select-none"
      >
        {/* Dedicated Audio Play / Listen Button */}
        {isParaActive && isPlaying ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onParagraphClick(secIndex, pIndex);
            }}
            className="px-2.5 py-0.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white font-sans text-[11px] font-bold flex items-center gap-1 shadow-md animate-pulse transition cursor-pointer"
            title="Narrando este trecho (clique para pausar/reiniciar)"
          >
            <Volume2 className="w-3 h-3 text-white" />
            <span>Narrando...</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onParagraphClick(secIndex, pIndex);
              triggerQuickToast(`🎙️ Ouvindo a partir da Linha ${pIndex + 1}`);
            }}
            className="px-2.5 py-0.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-sans text-[11px] font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
            title="Ouvir áudio a partir deste parágrafo"
          >
            <Play className="w-3 h-3 fill-current text-white" />
            <span>Ouvir</span>
          </button>
        )}

        {/* Dedicated Inline Edit Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing) {
              setEditingParagraphId(null);
              setEditingSecIndex(null);
              setEditingText('');
            } else {
              setEditingParagraphId(paragraph.id);
              setEditingSecIndex(secIndex);
              setEditingText(paragraph.text);
            }
          }}
          className={`px-2 py-0.5 rounded-full text-[11px] font-sans font-semibold flex items-center gap-1 border transition cursor-pointer ${
            isEditing
              ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border-slate-700 shadow-xs'
          }`}
          title="Editar texto deste parágrafo sem pausar o áudio"
        >
          <Edit3 className="w-3 h-3" />
          <span>{isEditing ? 'Fechar' : 'Editar'}</span>
        </button>

        {/* Dedicated Annotation & Comment Button (Adobe Acrobat Style) */}
        {onAddOrEditAnnotation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.click();
              onAddOrEditAnnotation({
                bookId,
                sectionIndex: secIndex,
                paragraphId: paragraph.id,
                selectedText: paragraph.text.slice(0, 160),
                color: 'yellow',
              });
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-sans font-semibold flex items-center gap-1 bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition cursor-pointer"
            title="Destacar texto e adicionar comentário/anotação neste parágrafo"
          >
            <MessageSquare className="w-3 h-3 text-purple-200" />
            <span className="hidden sm:inline">Anotar</span>
          </button>
        )}

        {/* Dedicated Join / Merge with Next Block Button */}
        {onJoinParagraphs && pIndex < sections[secIndex].paragraphs.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleJoinParagraphsWithTranslation(secIndex, pIndex, pIndex + 1);
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-sans font-bold flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-600 shadow-xs transition cursor-pointer"
            title="Juntar este parágrafo com o próximo bloco de mesmo tipo e sincronizar tradução"
          >
            <Merge className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Juntar</span>
          </button>
        )}

        {/* Transfer First Sentence to Previous Block / Page */}
        {onJoinFirstSentenceToPrevious && (pIndex > 0 || secIndex > 0) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleJoinFirstSentenceWithTranslation(secIndex, pIndex);
            }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold flex items-center gap-1 bg-amber-800 hover:bg-amber-900 text-white dark:bg-amber-700 dark:hover:bg-amber-800 shadow-xs transition cursor-pointer"
            title="Puxar a primeira frase deste bloco (até o ponto final) e anexar ao parágrafo anterior correspondente"
          >
            <Scissors className="w-3 h-3 text-amber-200 rotate-180" />
            <span className="hidden sm:inline">1ª Frase ao Anterior</span>
          </button>
        )}
      </div>
    );
  };

  // Render quick inline adjustment toolbar for a given paragraph in a section (Left side)
  const renderQuickAdjustBar = (
    secIndex: number,
    paragraph: ParagraphItem,
    index: number,
    pType: ParagraphType
  ) => {
    if (!onUpdateParagraphType) return null;

    return (
      <div
        aria-hidden="true"
        data-no-speech="true"
        onClick={(e) => e.stopPropagation()}
        className={`absolute -top-3.5 left-3 sm:left-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-black/15 dark:border-white/20 shadow-lg backdrop-blur-md transition-all select-none ${
          quickEditMode
            ? 'opacity-100 ring-1 ring-amber-500/40'
            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-75">
          {paragraph.isNonFree
            ? 'Omitido'
            : pType === 'footnote'
            ? 'Nota'
            : pType === 'quote'
            ? 'Citação'
            : pType === 'heading'
            ? 'Título'
            : 'Texto'}
        </span>

        <div className="h-3 w-px bg-black/15 dark:bg-white/15 mx-0.5" />

        {/* Join with Next Block */}
        {onJoinParagraphs && index < sections[secIndex].paragraphs.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleJoinParagraphsWithTranslation(secIndex, index, index + 1);
            }}
            title="Juntar este bloco com o próximo bloco abaixo e sincronizar tradução"
            className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 transition flex items-center gap-0.5"
          >
            <Merge className="w-2.5 h-2.5 text-amber-600" />
            <span>Juntar</span>
          </button>
        )}

        {/* Transfer 1st sentence to previous block */}
        {onJoinFirstSentenceToPrevious && (index > 0 || secIndex > 0) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleJoinFirstSentenceWithTranslation(secIndex, index);
            }}
            title="Puxar 1ª frase deste bloco (até o ponto) para o bloco anterior correspondente"
            className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 dark:text-amber-200 transition flex items-center gap-0.5"
          >
            <Scissors className="w-2.5 h-2.5 text-amber-600 rotate-180" />
            <span>1ª Frase</span>
          </button>
        )}

        {/* Transform to Footnote / Nota */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpdateParagraphType(secIndex, paragraph.id, 'footnote', false);
            triggerQuickToast('📝 Transformado em Nota de Rodapé');
          }}
          title="Transformar rapidamente em Nota de Rodapé"
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 ${
            pType === 'footnote' && !paragraph.isNonFree
              ? 'bg-purple-600 text-white shadow-xs'
              : 'hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
          }`}
        >
          <span>Nota</span>
        </button>

        {/* Transform to Quote / Citação */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpdateParagraphType(secIndex, paragraph.id, 'quote', false);
            triggerQuickToast('❝ Transformado em Citação em Bloco');
          }}
          title="Transformar rapidamente em Citação"
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 ${
            pType === 'quote' && !paragraph.isNonFree
              ? 'bg-amber-600 text-white shadow-xs'
              : 'hover:bg-amber-500/20 text-amber-700 dark:text-amber-300'
          }`}
        >
          <span>Citação</span>
        </button>

        {/* Transform to Regular Body Text */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpdateParagraphType(secIndex, paragraph.id, 'text', false);
            triggerQuickToast('📄 Transformado em Texto Normal');
          }}
          title="Transformar em Parágrafo Normal"
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 ${
            pType === 'text' && !paragraph.isNonFree
              ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
              : 'hover:bg-black/10 dark:hover:bg-white/10'
          }`}
        >
          <span>Texto</span>
        </button>

        {/* Transform to Heading */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpdateParagraphType(secIndex, paragraph.id, 'heading', false);
            triggerQuickToast('🏷️ Transformado em Título');
          }}
          title="Transformar em Título"
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 ${
            pType === 'heading' && !paragraph.isNonFree
              ? 'bg-blue-600 text-white shadow-xs'
              : 'hover:bg-blue-500/20 text-blue-700 dark:text-blue-300'
          }`}
        >
          <span>Título</span>
        </button>

        {/* Toggle Ignore / Non-Free */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpdateParagraphType(secIndex, paragraph.id, pType, !paragraph.isNonFree);
            triggerQuickToast(
              !paragraph.isNonFree
                ? '🚫 Marcado como Não-Livre (Ignorado da voz)'
                : '✅ Marcado como Livre (Lido pela voz)'
            );
          }}
          title={
            paragraph.isNonFree
              ? 'Desmarcar Não-Livre (Permitir leitura)'
              : 'Marcar como Não-Livre (Omitir da leitura)'
          }
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 ${
            paragraph.isNonFree
              ? 'bg-rose-600 text-white shadow-xs'
              : 'hover:bg-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          <EyeOff className="w-2.5 h-2.5" />
          <span>{paragraph.isNonFree ? 'Omitido' : 'Omitir'}</span>
        </button>

        {/* Move Block Up / Down */}
        {onMoveParagraph && (
          <>
            <div className="h-3 w-px bg-black/15 dark:bg-white/15 mx-0.5" />
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveParagraph(secIndex, index, 'up');
                triggerQuickToast('⬆️ Bloco movido para cima');
              }}
              title="Mover bloco para cima"
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 text-amber-800 dark:text-amber-300 transition"
            >
              <MoveUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={index === sections[secIndex].paragraphs.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveParagraph(secIndex, index, 'down');
                triggerQuickToast('⬇️ Bloco movido para baixo');
              }}
              title="Mover bloco para baixo"
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 text-amber-800 dark:text-amber-300 transition"
            >
              <MoveDown className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Render Inline Text Editor inside the paragraph
  const renderInlineEditor = (secIndex: number, paragraphId: string) => {
    return (
      <div
        data-no-speech="true"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 pt-3 border-t border-amber-500/40 space-y-2.5 animate-fadeIn"
      >
        <textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleSaveInlineEdit(secIndex, paragraphId);
            } else if (e.key === 'Escape') {
              setEditingParagraphId(null);
              setEditingSecIndex(null);
            }
          }}
          rows={Math.min(10, Math.max(3, Math.ceil(editingText.length / 70)))}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 border-2 border-amber-500 text-slate-900 dark:text-white font-serif leading-relaxed shadow-inner focus:outline-hidden"
          placeholder="Digite ou corrija o texto do parágrafo aqui..."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            Dica: <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Ctrl+Enter</kbd> para salvar • Áudio não para
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingParagraphId(null);
                setEditingSecIndex(null);
              }}
              className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSaveInlineEdit(secIndex, paragraphId)}
              className="px-3.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alteração</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render existing annotations attached to a paragraph
  const renderParagraphAnnotations = (paraId: string, secIdx: number) => {
    const paraAnnotations = annotations.filter((a) => a.paragraphId === paraId);
    if (paraAnnotations.length === 0) return null;

    return (
      <div
        aria-hidden="true"
        data-no-speech="true"
        onClick={(e) => e.stopPropagation()}
        className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-1.5 select-none"
      >
        {paraAnnotations.map((ann) => {
          const colorClasses =
            {
              yellow: 'bg-amber-400/20 border-amber-400/60 text-amber-950 dark:text-amber-200',
              green: 'bg-emerald-400/20 border-emerald-400/60 text-emerald-950 dark:text-emerald-200',
              blue: 'bg-sky-400/20 border-sky-400/60 text-sky-950 dark:text-sky-200',
              purple: 'bg-purple-400/20 border-purple-400/60 text-purple-950 dark:text-purple-200',
              orange: 'bg-orange-400/20 border-orange-400/60 text-orange-950 dark:text-orange-200',
              pink: 'bg-rose-400/20 border-rose-400/60 text-rose-950 dark:text-rose-200',
            }[ann.color] || 'bg-amber-400/20 border-amber-400/60 text-amber-950 dark:text-amber-200';

          return (
            <div
              key={ann.id}
              onClick={() => {
                soundEffects.click();
                onAddOrEditAnnotation?.(ann);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-sans font-medium border cursor-pointer hover:scale-[1.02] transition shadow-2xs ${colorClasses}`}
              title="Clique para abrir e editar este comentário"
            >
              <MessageSquare className="w-3 h-3 shrink-0" />
              <span className="max-w-[220px] truncate">
                {ann.comment ? ann.comment : `Destaque: "${ann.selectedText.slice(0, 35)}..."`}
              </span>
              <Edit3 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </div>
          );
        })}
      </div>
    );
  };

  // Handle mouse selection across paragraphs for quick cutting/cleaning/highlighting
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText('');
      setSelectionPos(null);
      setSelectionContext(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 2) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find closest paragraph container
      let node: Node | null = range.commonAncestorContainer;
      let paraEl: HTMLElement | null = null;
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && node.id && node.id.startsWith('paragraph-')) {
          paraEl = node;
          break;
        }
        node = node.parentNode;
      }

      let detectedSecIdx = activeSectionIndex;
      let detectedParaId = '';
      if (paraEl && paraEl.id) {
        const parts = paraEl.id.split('-');
        if (parts.length >= 3) {
          const sIdx = parseInt(parts[1], 10);
          const pIdx = parseInt(parts[2], 10);
          if (!isNaN(sIdx) && !isNaN(pIdx)) {
            detectedSecIdx = sIdx;
            const targetSec = sections[sIdx];
            const targetP = targetSec?.paragraphs[pIdx];
            if (targetP) {
              detectedParaId = targetP.id;
            }
          }
        }
      }

      setSelectedText(text);
      setSelectionPos({
        x: Math.max(16, rect.left + rect.width / 2),
        y: Math.max(16, rect.top - 10),
      });
      setSelectionContext({
        secIndex: detectedSecIdx,
        paragraphId: detectedParaId,
      });
    } else {
      setSelectedText('');
      setSelectionPos(null);
      setSelectionContext(null);
    }
  };

  return (
    <div
      id="audiobook-reader-container"
      onMouseUp={handleMouseUp}
      style={{
        maxWidth: isFullWidth ? '100%' : `${readerContentWidth}px`,
      }}
      className={`w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-40 ${themeTextClasses} transition-all duration-150 relative`}
    >
      {/* Floating Selection Action Popover (Adobe Acrobat Style Highlights + Notes) */}
      {selectedText && selectionPos && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionPos.x}px`,
            top: `${selectionPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 p-2 rounded-2xl bg-slate-900/95 text-white dark:bg-slate-800/95 shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs flex-wrap max-w-sm sm:max-w-md"
        >
          {/* Quick Color Highlight Dots (1-Click Save) */}
          {onAddOrEditAnnotation && (
            <div className="flex items-center gap-1 pr-1 border-r border-white/20">
              {[
                { color: 'yellow' as AnnotationColor, bg: 'bg-amber-400', label: 'Amarelo' },
                { color: 'green' as AnnotationColor, bg: 'bg-emerald-400', label: 'Verde' },
                { color: 'blue' as AnnotationColor, bg: 'bg-sky-400', label: 'Azul' },
                { color: 'purple' as AnnotationColor, bg: 'bg-purple-400', label: 'Roxo' },
                { color: 'orange' as AnnotationColor, bg: 'bg-orange-400', label: 'Laranja' },
                { color: 'pink' as AnnotationColor, bg: 'bg-rose-400', label: 'Rosa' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => {
                    soundEffects.success();
                    onAddOrEditAnnotation({
                      bookId,
                      sectionIndex: selectionContext?.secIndex ?? activeSectionIndex,
                      paragraphId: selectionContext?.paragraphId || '',
                      selectedText,
                      color: c.color,
                      comment: '',
                    });
                    triggerQuickToast(`✨ Destaque (${c.label}) salvo!`);
                    setSelectedText('');
                    setSelectionPos(null);
                  }}
                  className={`w-4 h-4 rounded-full ${c.bg} hover:scale-125 transition cursor-pointer shadow-xs border border-white/40`}
                  title={`Destacar em ${c.label}`}
                />
              ))}
            </div>
          )}

          {/* Add Note / Comment Modal Trigger */}
          {onAddOrEditAnnotation && (
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onAddOrEditAnnotation({
                  bookId,
                  sectionIndex: selectionContext?.secIndex ?? activeSectionIndex,
                  paragraphId: selectionContext?.paragraphId || '',
                  selectedText,
                  color: 'yellow',
                  comment: '',
                });
                setSelectedText('');
                setSelectionPos(null);
              }}
              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
              title="Adicionar comentário ou anotação (estilo Adobe Acrobat)"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Nota</span>
            </button>
          )}

          {/* Speak Selected Snippet */}
          <button
            type="button"
            onClick={() => {
              soundEffects.click();
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(selectedText);
                utter.lang = targetLang === 'pt' ? 'pt-BR' : targetLang;
                utter.rate = 1.1;
                window.speechSynthesis.speak(utter);
                triggerQuickToast('🔊 Reproduzindo áudio da seleção');
              }
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-200 transition cursor-pointer"
            title="Ouvir pronúncia do trecho selecionado"
          >
            <Headphones className="w-3.5 h-3.5" />
          </button>

          {/* Copy Selected Snippet */}
          <button
            type="button"
            onClick={async () => {
              soundEffects.click();
              try {
                await navigator.clipboard.writeText(selectedText);
                triggerQuickToast('📋 Trecho copiado para a área de transferência');
              } catch {}
              setSelectedText('');
              setSelectionPos(null);
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-200 transition cursor-pointer"
            title="Copiar texto selecionado"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Add to Table of Contents / Bookmark */}
          {onAddBookmark && (
            <button
              type="button"
              onClick={() => {
                soundEffects.success();
                onAddBookmark(
                  selectedText.slice(0, 80),
                  selectionContext?.secIndex ?? activeSectionIndex
                );
                triggerQuickToast(`🔖 Marcador "${selectedText.slice(0, 30)}..." adicionado ao índice!`);
                setSelectedText('');
                setSelectionPos(null);
              }}
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
              title="Adicionar este trecho selecionado como item do Índice / Marcadores"
            >
              <Bookmark className="w-3 h-3" />
              <span>+ Índice</span>
            </button>
          )}

          {onApplyGlobalAction && (
            <>
              <div className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => {
                  onApplyGlobalAction(selectedText, 'split_term');
                  triggerQuickToast(`✂️ Termo "${selectedText}" isolado em todas as páginas`);
                  setSelectedText('');
                  setSelectionPos(null);
                }}
                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="Isolar e separar este termo em todas as páginas do livro"
              >
                <Scissors className="w-3 h-3" />
                <span>Isolar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApplyGlobalAction(selectedText, 'remove_term');
                  triggerQuickToast(`🧹 Termo "${selectedText}" removido de todo o livro`);
                  setSelectedText('');
                  setSelectionPos(null);
                }}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="Remover este texto de todas as páginas"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            </>
          )}

          {onOpenCalibrator && (
            <button
              type="button"
              onClick={() => {
                onOpenCalibrator();
                setSelectedText('');
                setSelectionPos(null);
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-amber-400 cursor-pointer"
              title="Abrir Calibração Completa"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Quick Toast & Activity Status Corner Widget (Fixed Upper Right) */}
      <div className="fixed top-16 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {isTranslating && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500 text-slate-950 font-sans text-xs font-bold shadow-2xl backdrop-blur-md border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            <span>Traduzindo página ({targetLang.toUpperCase()})...</span>
          </div>
        )}

        {quickToast && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white dark:bg-amber-500/95 dark:text-slate-950 font-sans text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/20 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <Zap className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            <span>{quickToast}</span>
          </div>
        )}
      </div>

      {/* Targeted Browser & Automatic Translation Toolbar with Sliding Window Mode (Controlled on-demand) */}
      {isTranslationBarOpen ? (
        <div
          id="reader-translation-bar"
          className="mb-8 p-3 sm:p-4 w-full rounded-2xl bg-amber-500/10 dark:bg-slate-800/90 border border-amber-500/25 dark:border-slate-700 backdrop-blur-md shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 sticky top-[100px] z-30"
        >
          {/* Header Row: Title & Prominent Recolher Button */}
          <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex w-max items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-600/20 text-amber-900 dark:text-amber-300 text-xs font-extrabold">
                <Globe2 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Tradução Sob Demanda</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                Tradução contínua para {targetLang.toUpperCase()}
              </span>
            </div>

            {/* Dedicated RECOLHER button that closes and hides this menu */}
            <button
              type="button"
              onClick={() => setIsTranslationBarOpen?.(false)}
              title="Recolher e ocultar este menu de tradução (Liberar tela de leitura)"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-slate-100 text-xs font-bold transition border border-black/10 dark:border-white/10 cursor-pointer shadow-2xs"
            >
              <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Recolher</span>
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
            {/* Quick Language Selector with Asian & European Languages */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-semibold opacity-75 mr-1">Idioma:</span>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    soundEffects.success();
                    setTargetLang(lang.code);
                    handleTranslateSlidingWindow(activeSectionIndex, lang.code);
                  }}
                  disabled={isTranslating}
                  title={`Traduzir página atual e próximas para ${lang.name}`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    targetLang === lang.code && hasTranslations
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold'
                      : 'bg-white/80 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Translation Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Action to translate ONLY the active page */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.success();
                  handleTranslateSingleSection(activeSectionIndex, targetLang, true);
                }}
                disabled={isTranslating}
                title="Traduzir somente esta página/seção atual"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Traduzir Página Atual</span>
              </button>

              {/* SIDE-BY-SIDE (LADO A LADO) TOGGLE */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.toggle(!isSideBySide);
                  setIsSideBySide((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  isSideBySide
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-600/25'
                }`}
                title="Exibir texto original e tradução lado a lado em blocos sincronizados"
              >
                <Columns className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{isSideBySide ? 'Lado a Lado (Ativo)' : 'Lado a Lado'}</span>
              </button>

              {/* Toggle between Original and Translated */}
              {hasTranslations && !isSideBySide && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    setShowOriginal((prev) => !prev);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-600/25 transition cursor-pointer"
                  title="Alternar entre visualização do texto original e traduzido"
                >
                  {showOriginal ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ver Traduzido ({targetLang.toUpperCase()})</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ver Original</span>
                    </>
                  )}
                </button>
              )}

              {/* Native Translator Hint */}
              <button
                type="button"
                onClick={triggerBrowserNativeTranslatePrompt}
                title="Ativar menu de tradução nativo do Chrome / Microsoft Edge"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Tradutor Edge/Chrome</span>
              </button>
            </div>
          </div>

          {isTranslating && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium pt-1 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                Traduzindo página {activeSectionIndex + 1} para {targetLang.toUpperCase()}...
              </span>
            </div>
          )}
        </div>
      ) : hasTranslations ? (
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsTranslationBarOpen?.(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-600/20 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Abrir opções de tradução sob demanda"
          >
            <Globe2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Tradução Ativa ({targetLang.toUpperCase()}) • Abrir Menu</span>
          </button>
        </div>
      ) : null}

      {/* Kindle-Style Reading Progress & Block Display Controller */}
      {(() => {
        const totalBookParagraphs = sections.reduce((acc, s) => acc + s.paragraphs.length, 0);
        const completedBookParagraphs =
          sections.slice(0, activeSectionIndex).reduce((acc, s) => acc + s.paragraphs.length, 0) +
          currentParagraphIndex +
          (isPlaying ? 0.5 : 0);
        const overallBookPercent = totalBookParagraphs > 0
          ? Math.min(100, Math.max(0, Math.round((completedBookParagraphs / totalBookParagraphs) * 100)))
          : 0;

        return (
          <div className="mb-6 p-2.5 sm:p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs select-none">
            {/* Left: Overall Book Progress */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-950 dark:text-amber-200 font-bold text-[11px] shrink-0">
                <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-current" />
                <span>{overallBookPercent}% lido</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                <span>Pág. {activeSectionIndex + 1} de {sections.length}</span>
                <span className="opacity-40 mx-1.5">•</span>
                <span className="opacity-75">{totalBookParagraphs} blocos no total</span>
              </div>
            </div>

            {/* Right: Clean Reading Mode & Quick Edit Mode Switches */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              {/* Toggle Clean Reading / Hide Omitted Blocks */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.toggle(!hideOmittedBlocks);
                  setHideOmittedBlocks((prev) => !prev);
                  triggerQuickToast(
                    !hideOmittedBlocks
                      ? '📖 Modo Leitura Limpa ativado (blocos omitidos recolhidos)'
                      : '👁️ Blocos omitidos visíveis'
                  );
                }}
                title={
                  hideOmittedBlocks
                    ? 'Exibir blocos omitidos por completo'
                    : 'Recolher blocos omitidos para leitura sem distrações'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                  hideOmittedBlocks
                    ? 'bg-amber-600/10 text-amber-900 dark:text-amber-300 border-amber-600/25'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-75 hover:opacity-100'
                }`}
              >
                {hideOmittedBlocks ? <EyeOff className="w-3 h-3 text-amber-600" /> : <Eye className="w-3 h-3 text-slate-500" />}
                <span>{hideOmittedBlocks ? 'Leitura Limpa' : 'Exibir Omitidos'}</span>
              </button>

              {/* Toggle Quick Block Classification Mode */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.click();
                  setQuickEditMode((prev) => !prev);
                  triggerQuickToast(
                    !quickEditMode
                      ? '✏️ Modo de Ajuste de Blocos ativado (etiquetas e ferramentas visíveis)'
                      : '🔒 Modo Leitura normal ativado'
                  );
                }}
                title="Ativar barra de edição rápida em todos os parágrafos (Nota, Citação, Título, Omitir)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                  quickEditMode
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>{quickEditMode ? 'Ajustes Ativos' : 'Ajustar Blocos'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* CONTINUOUS / INFINITE STREAM OF PAGES & SECTIONS */}
      <div className="space-y-12">
        {sections.map((sec, secIndex) => {
          const isSectionActive = activeSectionIndex === secIndex;
          const isSecTranslating = translatingSectionIndices.includes(secIndex);
          let lastPage = -1;

          return (
            <section
              key={sec.id || `section-${secIndex}`}
              id={`section-${secIndex}`}
              className={`transition-all duration-300 ${
                isSectionActive ? 'relative' : 'opacity-95'
              }`}
            >
              {/* Sleek, Minimalist Page Marker (Ultra-compact, ~50-60% size) */}
              <div className="my-2.5 py-1 border-t border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-2 text-xs opacity-75 hover:opacity-100 transition-opacity select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-600/15 text-amber-800 dark:text-amber-300 border border-amber-600/20 shrink-0">
                    Página {sec.chapterNumber || secIndex + 1}
                  </span>
                  <span className="text-[10px] opacity-60 shrink-0 font-medium">
                    ({sec.paragraphs.length} {sec.paragraphs.length === 1 ? 'bloco' : 'blocos'})
                  </span>
                  {getGenuineOriginalTitle(sec) && (
                    <span className="font-serif font-medium text-[11px] truncate opacity-85 text-amber-900/90 dark:text-amber-200/90 max-w-[200px] sm:max-w-sm">
                      • {getGenuineOriginalTitle(sec)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isSecTranslating && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mr-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span className="hidden sm:inline">Traduzindo...</span>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      onParagraphClick(secIndex, 0);
                      triggerQuickToast(`🎙️ Ouvindo Página ${sec.chapterNumber || secIndex + 1}`);
                    }}
                    title={`Ouvir a partir da Página ${sec.chapterNumber || secIndex + 1}`}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-2xs transition cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Ouvir</span>
                  </button>
                  {onOpenSectionEditor && (
                    <button
                      onClick={() => onOpenSectionEditor(secIndex)}
                      title={`Editar Página ${sec.chapterNumber || secIndex + 1}`}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Column Headers */}
              {isSideBySide && hasTranslations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 mb-4 border-b border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider opacity-75">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>Texto Original</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Tradução ({targetLang.toUpperCase()})</span>
                  </div>
                </div>
              )}

              {/* Section Paragraphs Stream */}
              <div className="space-y-6">
                {sec.paragraphs.map((paragraph, pIndex) => {
                  const isActive = isSectionActive && currentParagraphIndex === pIndex;
                  const isEditing = editingParagraphId === paragraph.id && editingSecIndex === secIndex;
                  const isNewPage = paragraph.page && paragraph.page !== lastPage;
                  if (paragraph.page) {
                    lastPage = paragraph.page;
                  }

                  const originalText = paragraph.text;
                  const translatedText = translatedMap[paragraph.id] || paragraph.translations?.[targetLang] || paragraph.text;
                  const hasPersistentTranslation = !!(translatedMap[paragraph.id] || paragraph.translations?.[targetLang]);

                  // Single column displayed text
                  const displayedText =
                    !showOriginal && hasPersistentTranslation
                      ? translatedText
                      : paragraph.text;

                  const pType: ParagraphType =
                    paragraph.type ||
                    (paragraph.isHeading
                      ? 'heading'
                      : paragraph.isFootnote
                      ? 'footnote'
                      : paragraph.isQuote
                      ? 'quote'
                      : 'text');

                  return (
                    <React.Fragment key={paragraph.id}>
                      {/* Page Number Divider */}
                      {isNewPage && (
                        <div className="flex items-center justify-center my-6 gap-3 select-none opacity-50 text-xs">
                          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
                          <span className="font-serif italic px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            Página {paragraph.page}
                          </span>
                          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
                        </div>
                      )}

                      {/* Side-by-Side View vs Single View */}
                      {isSideBySide && hasTranslations ? (
                        paragraph.isNonFree && hideOmittedBlocks && !quickEditMode ? (
                          <div
                            key={paragraph.id}
                            onClick={() => {
                              setQuickEditMode(true);
                              triggerQuickToast('✏️ Modo de Ajuste de Blocos ativado');
                            }}
                            title="Bloco omitido da leitura. Clique para ativar modo de ajuste de blocos."
                            className="my-1.5 py-1 px-3 rounded-lg border border-dashed border-slate-300/60 dark:border-slate-700/60 bg-slate-500/5 text-slate-500 dark:text-slate-400 text-[11px] flex items-center justify-between opacity-50 hover:opacity-100 transition-all cursor-pointer select-none"
                          >
                            <span className="truncate italic flex items-center gap-1.5 max-w-md">
                              <EyeOff className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{displayedText.slice(0, 70)}...</span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                              Omitido (Clique p/ Ajustar)
                            </span>
                          </div>
                        ) : (
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                              data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            className={`group relative grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                              isActive
                                ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                                : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-amber-500/30'
                            } ${paragraph.isNonFree ? 'opacity-60 border-dashed' : ''}`}
                          >
                          {/* Quick Inline Adjustment Bar (Left) */}
                          {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}

                          {/* Action Controls: Audio Play + Edit (Right) */}
                          {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                          {/* Left Column: Original Text */}
                          <div className="space-y-1 relative pr-0 md:pr-2 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 pb-3 md:pb-0 pt-2">
                            <div
                              aria-hidden="true"
                              data-no-speech="true"
                              className="flex items-center justify-between text-[11px] opacity-60 mb-1 select-none"
                            >
                              <span className="font-sans font-bold uppercase tracking-wider">
                                {pType === 'heading'
                                  ? 'Título Original'
                                  : pType === 'quote'
                                  ? 'Citação'
                                  : pType === 'footnote'
                                  ? 'Nota'
                                  : 'Original'}
                              </span>
                            </div>

                            {isEditing ? (
                              renderInlineEditor(secIndex, paragraph.id)
                            ) : (
                              <p
                                data-reader-text={showOriginal ? 'true' : undefined}
                                data-reader-original="true"
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
                                className={`font-serif text-justify ${
                                  pType === 'heading'
                                    ? 'font-bold text-lg'
                                    : pType === 'quote'
                                    ? 'italic pl-3 border-l-2 border-amber-600/60'
                                    : pType === 'footnote'
                                    ? 'text-sm opacity-90'
                                    : ''
                                }`}
                              >
                                {originalText}
                              </p>
                            )}
                          </div>

                          {/* Right Column: Translated Text */}
                          <div className="space-y-1 relative pl-0 md:pl-2 pt-2">
                            <div
                              aria-hidden="true"
                              data-no-speech="true"
                              className="flex items-center justify-between text-[11px] opacity-60 mb-1 select-none"
                            >
                              <span className="font-sans font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                {targetLang.toUpperCase()}
                              </span>
                              <span className="text-[10px] opacity-50">Sincronizado</span>
                            </div>
                            <p
                              data-reader-text={!showOriginal ? 'true' : undefined}
                              data-reader-translated="true"
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
                              className={`font-serif text-justify ${
                                pType === 'heading'
                                  ? 'font-bold text-lg text-blue-950 dark:text-blue-100'
                                  : pType === 'quote'
                                  ? 'italic pl-3 border-l-2 border-blue-500/60'
                                  : pType === 'footnote'
                                  ? 'text-sm opacity-90'
                                  : ''
                              }`}
                            >
                              {translatedText}
                            </p>
                          </div>

                          {/* Paragraph Annotations in Side-by-Side */}
                          <div className="col-span-1 md:col-span-2">
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        </div>
                      )) : (
                        /* Standard Single Column Render */
                        paragraph.isNonFree ? (
                          hideOmittedBlocks && !quickEditMode ? (
                            <div
                              key={paragraph.id}
                              onClick={() => {
                                setQuickEditMode(true);
                                triggerQuickToast('✏️ Modo de Ajuste de Blocos ativado');
                              }}
                              title="Bloco omitido da leitura. Clique para ativar modo de ajuste de blocos."
                              className="my-1.5 py-1 px-3 rounded-lg border border-dashed border-slate-300/60 dark:border-slate-700/60 bg-slate-500/5 text-slate-500 dark:text-slate-400 text-[11px] flex items-center justify-between opacity-50 hover:opacity-100 transition-all cursor-pointer select-none"
                            >
                              <span className="truncate italic flex items-center gap-1.5 max-w-md">
                                <EyeOff className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{displayedText.slice(0, 70)}...</span>
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                                Omitido (Clique p/ Ajustar)
                              </span>
                            </div>
                          ) : (
                            <div
                              ref={isActive ? activeParagraphRef : null}
                              id={`paragraph-${secIndex}-${pIndex}`}
                              data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                              style={{
                                fontSize: `${Math.max(12, fontSize - 3)}px`,
                                lineHeight: 1.6,
                              }}
                              className="group relative p-3.5 rounded-xl border border-dashed border-slate-400/40 dark:border-slate-600/40 bg-slate-500/5 opacity-75 hover:opacity-100 transition pt-5"
                            >
                              {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                              {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                              <div
                                aria-hidden="true"
                                data-no-speech="true"
                                className="flex items-center gap-2 mb-1 select-none"
                              >
                                <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="font-sans text-[10px] uppercase font-bold tracking-wide text-slate-600 dark:text-slate-400">
                                  Bloco Marcado como Não-Livre (Ignorado na Narração)
                                </span>
                              </div>

                              {isEditing ? (
                                renderInlineEditor(secIndex, paragraph.id)
                              ) : (
                                <p
                                  data-reader-text="true"
                                  className="font-serif text-justify italic opacity-80"
                                >
                                  {displayedText}
                                </p>
                              )}
                              {renderParagraphAnnotations(paragraph.id, secIndex)}
                            </div>
                          )
                        ) : pType === 'heading' ? (
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            className={`group relative pt-6 pb-2 font-serif font-bold text-xl sm:text-2xl transition border-b border-black/10 dark:border-white/10 ${
                              isActive
                                ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg'
                                : ''
                            }`}
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            {isEditing ? (
                              renderInlineEditor(secIndex, paragraph.id)
                            ) : (
                              <span data-reader-text="true">{displayedText}</span>
                            )}
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        ) : pType === 'quote' ? (
                          /* Quote Paragraph (Blockquote) */
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                            className={`group relative p-4 sm:p-5 rounded-xl transition-all duration-300 font-serif italic border-l-4 border-amber-600/80 bg-amber-600/5 dark:bg-amber-500/5 pt-5 ${
                              isActive
                                ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                                : ''
                            }`}
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            <div className="flex items-start gap-3">
                              <Quote
                                aria-hidden="true"
                                data-no-speech="true"
                                className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 opacity-70 mt-1"
                              />
                              <div className="flex-1">
                                {isEditing ? (
                                  renderInlineEditor(secIndex, paragraph.id)
                                ) : (
                                  <p
                                    data-reader-text="true"
                                    className="leading-relaxed text-justify"
                                  >
                                    {displayedText}
                                  </p>
                                )}
                              </div>
                            </div>
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        ) : pType === 'header_footer' ? (
                          /* Header / Footer Paragraph (Excluded from narration) */
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            style={{
                              fontSize: `${Math.max(11, fontSize - 4)}px`,
                              lineHeight: 1.5,
                            }}
                            className="group relative p-2 sm:p-3 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 opacity-60 hover:opacity-100 transition flex flex-col gap-2 pt-5"
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            <div
                              aria-hidden="true"
                              data-no-speech="true"
                              className="flex items-center gap-2 select-none"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-sans text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">
                                Cabeçalho/Rodapé (Omitido da Narração)
                              </span>
                            </div>

                            {isEditing ? (
                              renderInlineEditor(secIndex, paragraph.id)
                            ) : (
                              <span className="font-serif italic truncate">
                                {displayedText}
                              </span>
                            )}
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        ) : pType === 'pre_post_textual' ? (
                          /* Pre/Post-Textual Paragraph (Excluded from narration) */
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            style={{
                              fontSize: `${Math.max(12, fontSize - 3)}px`,
                              lineHeight: 1.6,
                            }}
                            className="group relative p-3 rounded-xl border border-dashed border-orange-500/30 bg-orange-500/5 opacity-70 hover:opacity-100 transition pt-5"
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            <div
                              aria-hidden="true"
                              data-no-speech="true"
                              className="flex items-center gap-2 mb-1 select-none"
                            >
                              <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="font-sans text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">
                                Elemento Pré/Pós-Textual (Omitido da Narração)
                              </span>
                            </div>

                            {isEditing ? (
                              renderInlineEditor(secIndex, paragraph.id)
                            ) : (
                              <p
                                data-reader-text="true"
                                className="font-serif text-justify opacity-85"
                              >
                                {displayedText}
                              </p>
                            )}
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        ) : pType === 'footnote' ? (
                          /* Footnote Paragraph */
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            style={{
                              fontSize: `${Math.max(13, fontSize - 3)}px`,
                              lineHeight: 1.6,
                            }}
                            className={`group relative p-3 sm:p-4 rounded-xl transition-all duration-300 font-serif border pt-5 ${
                              isActive
                                ? 'bg-purple-500/15 border-purple-500/40 shadow-md ring-2 ring-purple-500/20'
                                : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            <div className="flex items-start gap-2.5">
                              <span
                                aria-hidden="true"
                                data-no-speech="true"
                                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 shrink-0 font-sans mt-0.5 select-none"
                              >
                                Nota
                              </span>
                              <div className="flex-1">
                                {isEditing ? (
                                  renderInlineEditor(secIndex, paragraph.id)
                                ) : (
                                  <p
                                    data-reader-text="true"
                                    className="leading-relaxed opacity-90"
                                  >
                                    {displayedText}
                                  </p>
                                )}
                              </div>
                            </div>
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        ) : (
                          /* Standard Body Paragraph */
                          <div
                            ref={isActive ? activeParagraphRef : null}
                            id={`paragraph-${secIndex}-${pIndex}`}
                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}
                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
                            className={`group relative p-4 rounded-xl transition-all duration-300 font-serif border pt-5 ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-md ring-2 ring-amber-500/20'
                                : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                            }`}
                          >
                            {renderQuickAdjustBar(secIndex, paragraph, pIndex, pType)}
                            {renderParagraphTopRightActions(secIndex, paragraph, pIndex)}

                            {/* Text Content */}
                            {isEditing ? (
                              renderInlineEditor(secIndex, paragraph.id)
                            ) : (
                              <p
                                data-reader-text="true"
                                className="text-justify leading-relaxed"
                              >
                                {displayedText}
                              </p>
                            )}
                            {renderParagraphAnnotations(paragraph.id, secIndex)}
                          </div>
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* SECTION END & CONTINUOUS TRANSITION DIVIDER TO NEXT PAGE */}
              {secIndex < sections.length - 1 ? (
                <div
                  id={`section-boundary-${secIndex}`}
                  className="my-4 py-2.5 px-3 sm:px-4 rounded-xl border border-amber-600/30 bg-amber-500/10 dark:bg-slate-800/80 select-none text-left space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    {/* Page & block summary */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-700 text-white dark:bg-amber-600 dark:text-white shrink-0 shadow-2xs">
                        <Bookmark className="w-2.5 h-2.5 text-white" />
                        <span>Fim da Página {sec.chapterNumber || secIndex + 1}</span>
                      </span>

                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                        ({sec.paragraphs.length} {sec.paragraphs.length === 1 ? 'bloco' : 'blocos'})
                      </span>

                      {getGenuineOriginalTitle(sec) && (
                        <span className="font-serif font-semibold text-[11px] truncate text-slate-800 dark:text-slate-200 max-w-[200px] sm:max-w-sm">
                          • {getGenuineOriginalTitle(sec)}
                        </span>
                      )}
                    </div>

                    {/* Quick navigation to next page */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onParagraphClick(secIndex + 1, 0);
                        }}
                        className="h-7 flex items-center gap-1 px-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer"
                        title={`Começar a ler a Página ${secIndex + 2}`}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Ouvir Pág. {secIndex + 2}</span>
                      </button>
                    </div>
                  </div>

                  {/* Page Transition & Broken Sentence Joiner Widget (Compact) */}
                  {(() => {
                    const lastP = sec.paragraphs[sec.paragraphs.length - 1];
                    const nextSec = sections[secIndex + 1];
                    const firstP = nextSec?.paragraphs[0];
                    if (!lastP || !firstP) return null;

                    const lastText = lastP.text.trim();
                    const nextText = firstP.text.trim();
                    const endsWithoutPeriod = !/[.!?…]["'”’»\)]?$/.test(lastText);
                    const startsWithLowerOrContinuation = /^[a-zà-ú]|^(que|de|da|do|em|para|por|com|sem|e|ou|mas|porém)\b/i.test(nextText);
                    const isFootnoteCont = (lastP.type === 'footnote' || lastP.isFootnote) && endsWithoutPeriod;

                    if ((endsWithoutPeriod || startsWithLowerOrContinuation || isFootnoteCont) && onJoinFirstSentenceToPrevious) {
                      return (
                        <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-600/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-left shadow-2xs">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-900 dark:text-amber-300">
                              <Scissors className="w-3 h-3 text-amber-700 dark:text-amber-400 rotate-180 shrink-0" />
                              <span>
                                {isFootnoteCont
                                  ? 'Continuação de Nota entre Páginas Detectada'
                                  : 'Sentença Quebrada pela Virada de Página'}
                              </span>
                            </div>
                            <p className="text-[10px] truncate max-w-xl text-slate-800 dark:text-slate-200 font-medium">
                              Final da pág. {secIndex + 1}: <em>«...{lastText.slice(-35)}»</em> ➔ Início da pág. {secIndex + 2}: <em>«{nextText.slice(0, 35)}...»</em>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinFirstSentenceWithTranslation(secIndex + 1, 0);
                            }}
                            className="shrink-0 h-6 px-2.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Scissors className="w-2.5 h-2.5 rotate-180" />
                            <span>Puxar 1ª Frase para Pág. {secIndex + 1}</span>
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                /* Last Page End Callout */
                <div className="my-6 py-4 px-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-sans text-xs font-bold uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fim do Livro / Documento</span>
                  </div>
                  <p className="text-xs opacity-75">
                    Você chegou ao final de todas as páginas e seções deste documento.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
