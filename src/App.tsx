/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBookLibrary } from './hooks/useBookLibrary';
import { useAudiobookNarrator } from './hooks/useAudiobookNarrator';
import { BookHeader } from './components/BookHeader';
import { ReaderView } from './components/ReaderView';
import { AudioPlayerDock } from './components/AudioPlayerDock';
import { TableOfContentsModal } from './components/TableOfContentsModal';
import { BookInfoModal } from './components/BookInfoModal';
import { UploadDocumentModal } from './components/UploadDocumentModal';
import { LibraryDrawer } from './components/LibraryDrawer';
import { ExtensionGuideModal } from './components/ExtensionGuideModal';
import { SectionEditorModal } from './components/SectionEditorModal';
import { ExportModal } from './components/ExportModal';
import { DetectionCalibratorModal } from './components/DetectionCalibratorModal';
import { QuickIndexSidebar } from './components/QuickIndexSidebar';
import { DiagnosticLogModal } from './components/DiagnosticLogModal';
import { DocumentSearchModal } from './components/DocumentSearchModal';
import { AnnotationsDrawer } from './components/AnnotationsDrawer';
import { AnnotationEditorModal } from './components/AnnotationEditorModal';
import { loadAnnotations, saveAnnotation, deleteAnnotation } from './utils/annotationsStorage';
import { logger } from './utils/appLogger';
import { Terminal, FileDown, Sparkles } from 'lucide-react';
import { ReadingTheme, ParagraphItem, TextAnnotation } from './types';

export default function App() {
  const {
    books,
    activeBook,
    activeBookId,
    selectBook,
    addDocumentFile,
    addPastedText,
    deleteBook,
    updateBookInfo,
    updateBookSections,
    updateBookBookmarks,
    addCustomBookmark,
    deleteCustomBookmark,
    updateSectionTitle,
    moveSection,
    mergeSectionWithNext,
    splitSectionAtParagraph,
    addParagraph,
    joinParagraphs,
    joinFirstSentenceToPrevious,
    autoFixPageTransitions,
    updateParagraph,
    moveParagraph,
    deleteParagraph,
    applyGlobalTextAction,
    recalibrateActiveBook,
    saveSectionTranslations,
    resetAllAppData,
    isProcessingFile,
    processingStatus,
  } = useBookLibrary();

  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [isTOCModalOpen, setIsTOCModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isLibraryDrawerOpen, setIsLibraryDrawerOpen] = useState<boolean>(false);
  const [isExtensionGuideOpen, setIsExtensionGuideOpen] = useState<boolean>(false);
  const [isSectionEditorOpen, setIsSectionEditorOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCalibratorOpen, setIsCalibratorOpen] = useState<boolean>(false);
  const [isDiagnosticLogOpen, setIsDiagnosticLogOpen] = useState<boolean>(false);

  // In-Document Search and Annotations State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isAnnotationsDrawerOpen, setIsAnnotationsDrawerOpen] = useState<boolean>(false);
  const [isAnnotationEditorOpen, setIsAnnotationEditorOpen] = useState<boolean>(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Partial<TextAnnotation> | null>(null);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(() => {
    return loadAnnotations(activeBookId);
  });

  // Reload annotations when active book changes
  useEffect(() => {
    setAnnotations(loadAnnotations(activeBook.id));
  }, [activeBook.id]);

  // Global Keyboard Shortcut for Ctrl+F / Cmd+F to open In-Document Search
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  // Night mode naturally as default (retrieved from localStorage if present)
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audiobook_theme') as ReadingTheme;
      if (saved && ['light', 'dark'].includes(saved)) {
        return saved;
      }
    }
    return 'dark'; // Default to Night Mode
  });
  const [fontSize, setFontSize] = useState<number>(18);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Screen Width & Layout Customization State (persisted in localStorage)
  const [readerContentWidth, setReaderContentWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audiobook_reader_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 2400) return parsed;
      }
    }
    return 960;
  });
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [isSideBySide, setIsSideBySide] = useState<boolean>(false);
  const [autoTranslateSlidingWindow, setAutoTranslateSlidingWindow] = useState<boolean>(false);
  const [targetLang, setTargetLang] = useState<string>('pt');
  const [isTranslationBarOpen, setIsTranslationBarOpen] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showAICalibratePrompt, setShowAICalibratePrompt] = useState<boolean>(false);
  const translateTriggerRef = useRef<((lang: string) => void) | null>(null);

  const handleTriggerTranslation = useCallback((lang: string) => {
    setTargetLang(lang);
    if (translateTriggerRef.current) {
      translateTriggerRef.current(lang);
    }
  }, []);

  const handleUpdateReaderWidth = (w: number) => {
    setReaderContentWidth(w);
    if (typeof window !== 'undefined') {
      localStorage.setItem('audiobook_reader_width', w.toString());
    }
    logger.action('Layout', `Largura de leitura ajustada para ${w}px`);
  };

  // Sync theme with localStorage and root HTML dark class
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audiobook_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    logger.action('Theme', `Tema alterado para ${theme}`);
  }, [theme]);

  // Check if opened from extension context menu with selected text
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      const chromeStorage = (window as any).chrome.storage.local;
      chromeStorage.get(['importedText'], (result: any) => {
        if (result?.importedText?.text) {
          const { title, text } = result.importedText;
          addPastedText(title || 'Texto Selecionado', 'Web / Navegador', text);
          logger.action('ExtensionImport', 'Texto importado via extensão');
          // Clear after consumption
          chromeStorage.remove(['importedText']);
        }
      });
    }
  }, [addPastedText]);

  // Ensure activeSectionIndex stays within range if sections change
  useEffect(() => {
    if (activeSectionIndex >= activeBook.sections.length) {
      setActiveSectionIndex(Math.max(0, activeBook.sections.length - 1));
    }
  }, [activeBook.sections.length, activeSectionIndex]);

  // Reset section index when active book changes
  useEffect(() => {
    setActiveSectionIndex(0);
    logger.info('BookSelection', `Livro ativo: "${activeBook.title}" (${activeBook.sections.length} seções)`);
  }, [activeBookId, activeBook.title, activeBook.sections.length]);

  const currentSection = activeBook.sections[activeSectionIndex] || activeBook.sections[0];

  const handleNextSection = useCallback(() => {
    if (activeSectionIndex < activeBook.sections.length - 1) {
      setActiveSectionIndex((idx) => idx + 1);
      logger.action('Navigation', `Avançando para página ${activeSectionIndex + 2}`);
    }
  }, [activeBook.sections.length, activeSectionIndex]);

  const handleSectionEnd = useCallback(() => {
    if (activeSectionIndex < activeBook.sections.length - 1) {
      setActiveSectionIndex((prev) => prev + 1);
      logger.audio('Playback', `Fim da seção atingido. Avançando automaticamente para página ${activeSectionIndex + 2}`);
    }
  }, [activeSectionIndex, activeBook.sections.length]);

  const narrator = useAudiobookNarrator(currentSection, activeSectionIndex, handleSectionEnd);

  const hasPrevSection = activeSectionIndex > 0;
  const hasNextSection = activeSectionIndex < activeBook.sections.length - 1;

  const handlePrevSection = useCallback(() => {
    if (hasPrevSection) {
      setActiveSectionIndex((idx) => idx - 1);
      logger.action('Navigation', `Voltando para página ${activeSectionIndex}`);
    }
  }, [hasPrevSection, activeSectionIndex]);

  const handleSelectBookmark = useCallback(
    (secIdx: number, paraIdx?: number, paragraphId?: string) => {
      let targetSecIdx = secIdx;
      let targetParaIdx = typeof paraIdx === 'number' && paraIdx >= 0 ? paraIdx : 0;

      // If paragraphId is provided, verify and match its exact section & paragraph index
      if (paragraphId) {
        for (let s = 0; s < activeBook.sections.length; s++) {
          const pIndex = activeBook.sections[s].paragraphs.findIndex((p) => p.id === paragraphId);
          if (pIndex !== -1) {
            targetSecIdx = s;
            targetParaIdx = pIndex;
            break;
          }
        }
      }

      if (targetSecIdx >= 0 && targetSecIdx < activeBook.sections.length) {
        logger.action(
          'IndexNavigation',
          `Navegando via índice para página ${targetSecIdx + 1}, parágrafo ${targetParaIdx + 1}`
        );
        setActiveSectionIndex(targetSecIdx);
        setTimeout(() => {
          narrator.navigateToParagraph(targetParaIdx, false);
          const el =
            document.getElementById(`paragraph-${targetSecIdx}-${targetParaIdx}`) ||
            (paragraphId ? document.getElementById(`paragraph-${paragraphId}`) : null) ||
            document.getElementById(`section-${targetSecIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 80);
      }
    },
    [activeBook.sections, narrator]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        narrator.togglePlay();
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNextSection();
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePrevSection();
      } else if (e.code === 'ArrowRight') {
        narrator.skipForward();
      } else if (e.code === 'ArrowLeft') {
        narrator.skipBackward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [narrator, handleNextSection, handlePrevSection]);

  const themeBgClasses = {
    light: 'bg-slate-50 text-slate-900',
    dark: 'bg-[#12161c] text-slate-100',
  }[theme];

  return (
    <div
      id="audiobook-app-root"
      className={`min-h-screen flex flex-col ${themeBgClasses} transition-colors duration-300 selection:bg-amber-500 selection:text-white`}
    >
      {/* Top Header with Responsive Translation Menu and Screen Size Adjustments */}
      <BookHeader
        activeBook={activeBook}
        onOpenLibrary={() => setIsLibraryDrawerOpen(true)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenTOC={() => setIsTOCModalOpen(true)}
        onOpenCalibrator={() => setIsCalibratorOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenDiagnosticLog={() => setIsDiagnosticLogOpen(true)}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        onOpenExtensionGuide={() => setIsExtensionGuideOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenAnnotations={() => setIsAnnotationsDrawerOpen(true)}
        annotationsCount={annotations.length}
        onResetAllAppData={resetAllAppData}
        onResetAudioEngine={narrator.resetAudioEngine}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        isTranslationBarOpen={isTranslationBarOpen}
        onToggleTranslationBar={() => setIsTranslationBarOpen((prev) => !prev)}
        readerContentWidth={readerContentWidth}
        setReaderContentWidth={handleUpdateReaderWidth}
        isFullWidth={isFullWidth}
        setIsFullWidth={setIsFullWidth}
        isSideBySide={isSideBySide}
        setIsSideBySide={setIsSideBySide}
        autoTranslateSlidingWindow={autoTranslateSlidingWindow}
        setAutoTranslateSlidingWindow={setAutoTranslateSlidingWindow}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        onTranslateCurrentSection={(selectedLang) => handleTriggerTranslation(selectedLang || targetLang)}
        isTranslating={isTranslating}
      />

      {/* AI Calibration Prompt */}
      {showAICalibratePrompt && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 py-3 px-6 flex flex-col md:flex-row md:items-center justify-between shadow-lg relative z-40 gap-4">
          <div className="flex items-start md:items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 mt-1 md:mt-0 flex-shrink-0" />
            <div className="text-sm">
              <strong>Calibração Inteligente Disponível:</strong> O documento foi carregado. Deseja que a IA analise a estrutura e gere regras para limpar automaticamente cabeçalhos e formatações indesejadas?
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button 
              onClick={() => { setShowAICalibratePrompt(false); setIsCalibratorOpen(true); }}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-xl text-xs hover:bg-amber-400 transition"
            >
              Auto-Calibrar
            </button>
            <button 
              onClick={() => setShowAICalibratePrompt(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-xl text-xs hover:bg-slate-700 transition"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
      {/* Floating Responsive Unified Cascading Index & Bookmarks Sidebar */}
      <QuickIndexSidebar
        book={activeBook}
        activeSectionIndex={activeSectionIndex}
        currentParagraphIndex={narrator.currentParagraphIndex}
        onSelectBookmark={handleSelectBookmark}
        onUpdateBookmarks={(bm) => updateBookBookmarks(activeBook.id, bm)}
        theme={theme}
      />

      {/* Main Reading Surface with Continuous Infinite Scroll */}
      <main className="flex-1 w-full">
        <ReaderView
          sections={activeBook.sections}
          bookId={activeBook.id}
          activeSectionIndex={activeSectionIndex}
          currentParagraphIndex={narrator.currentParagraphIndex}
          isPlaying={narrator.isPlaying}
          onParagraphClick={(secIdx, paraIdx) => {
            if (secIdx !== activeSectionIndex) {
              setActiveSectionIndex(secIdx);
              setTimeout(() => {
                narrator.jumpToParagraph(paraIdx);
              }, 40);
            } else {
              narrator.jumpToParagraph(paraIdx);
            }
          }}
          onOpenSectionEditor={(secIdx) => {
            if (secIdx !== undefined) {
              setActiveSectionIndex(secIdx);
            }
            setIsSectionEditorOpen(true);
          }}
          onAddBookmark={(title, secIdx, pIdx) => {
            addCustomBookmark(activeBook.id, {
              title,
              sectionIndex: secIdx,
              paragraphIndex: pIdx,
            });
          }}
          onOpenCalibrator={() => setIsCalibratorOpen(true)}
          onApplyGlobalAction={(term, action) => {
            applyGlobalTextAction(activeBook.id, term, action);
          }}
          annotations={annotations}
          onAddOrEditAnnotation={(ann, openModal = false) => {
            if (openModal || (ann.id && ann.comment)) {
              setEditingAnnotation(ann);
              setIsAnnotationEditorOpen(true);
            } else {
              saveAnnotation(activeBook.id, ann);
              setAnnotations(loadAnnotations(activeBook.id));
              logger.action('Annotation', `Destaque salvo no livro "${activeBook.title}"`);
            }
          }}
          onDeleteAnnotation={(annId) => {
            deleteAnnotation(activeBook.id, annId);
            setAnnotations(loadAnnotations(activeBook.id));
          }}
          onJoinParagraphs={(secIdx, firstIndex, secondIndex) => {
            joinParagraphs(activeBookId, secIdx, firstIndex, secondIndex);
          }}
          onJoinFirstSentenceToPrevious={(secIdx, paraIdx) => {
            return joinFirstSentenceToPrevious(activeBookId, secIdx, paraIdx);
          }}
          onUpdateParagraphType={(secIdx, paragraphId, newType, isNonFree) => {
            updateParagraph(activeBookId, secIdx, paragraphId, undefined, newType, isNonFree);
          }}
          onUpdateParagraphText={(secIdx, paragraphId, newText) => {
            updateParagraph(activeBookId, secIdx, paragraphId, newText);
          }}
          onSaveSectionTranslations={(secIdx, translations, targetLang) => {
            saveSectionTranslations(activeBookId, secIdx, translations, targetLang);
          }}
          onMoveParagraph={(secIdx, fromIndex, direction) => {
            moveParagraph(activeBookId, secIdx, fromIndex, direction);
          }}
          isTranslationBarOpen={isTranslationBarOpen}
          setIsTranslationBarOpen={setIsTranslationBarOpen}
          readerContentWidth={readerContentWidth}
          isFullWidth={isFullWidth}
          isSideBySide={isSideBySide}
          setIsSideBySide={setIsSideBySide}
          autoTranslateSlidingWindow={autoTranslateSlidingWindow}
          setAutoTranslateSlidingWindow={setAutoTranslateSlidingWindow}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          onRegisterTranslateHandler={(fn) => {
            translateTriggerRef.current = fn;
          }}
          setIsTranslatingExternal={setIsTranslating}
          fontSize={fontSize}
          autoScroll={autoScroll}
          theme={theme}
        />
      </main>

      {/* Persistent Bottom Audio Player Dock */}
      <AudioPlayerDock
        narrator={narrator}
        section={currentSection}
        onPrevSection={handlePrevSection}
        onNextSection={handleNextSection}
        hasPrevSection={hasPrevSection}
        hasNextSection={hasNextSection}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        theme={theme}
      />

      {/* In-Document Full Text Search Modal (Ctrl+F / Cmd+F) */}
      <DocumentSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        book={activeBook}
        onNavigateToMatch={handleSelectBookmark}
        theme={theme}
      />

      {/* Annotations & Comments Drawer (Adobe Acrobat Style) */}
      <AnnotationsDrawer
        isOpen={isAnnotationsDrawerOpen}
        onClose={() => setIsAnnotationsDrawerOpen(false)}
        book={activeBook}
        annotations={annotations}
        onSelectAnnotation={(ann) => handleSelectBookmark(ann.sectionIndex, undefined, ann.paragraphId)}
        onEditAnnotation={(ann) => {
          setEditingAnnotation(ann);
          setIsAnnotationEditorOpen(true);
        }}
        onDeleteAnnotation={(annId) => {
          deleteAnnotation(activeBook.id, annId);
          setAnnotations(loadAnnotations(activeBook.id));
        }}
        onAddAnnotation={() => {
          setEditingAnnotation({
            bookId: activeBook.id,
            sectionIndex: activeSectionIndex,
            paragraphId: currentSection.paragraphs[0]?.id || '',
            selectedText: '',
            color: 'yellow',
            comment: '',
          });
          setIsAnnotationEditorOpen(true);
        }}
        theme={theme}
      />

      {/* Annotation Editor Modal (Add/Edit Comments and Pick Colors) */}
      <AnnotationEditorModal
        isOpen={isAnnotationEditorOpen}
        onClose={() => {
          setIsAnnotationEditorOpen(false);
          setEditingAnnotation(null);
        }}
        annotation={editingAnnotation}
        onSave={(ann) => {
          saveAnnotation(activeBook.id, ann);
          setAnnotations(loadAnnotations(activeBook.id));
          logger.action('Annotation', `Anotação salva no livro "${activeBook.title}"`);
        }}
        onDelete={(annId) => {
          deleteAnnotation(activeBook.id, annId);
          setAnnotations(loadAnnotations(activeBook.id));
          logger.action('Annotation', `Anotação removida do livro "${activeBook.title}"`);
        }}
        theme={theme}
      />

      {/* Table of Contents & Cascading Bookmarks Modal (Unified with QuickIndexSidebar) */}
      <TableOfContentsModal
        isOpen={isTOCModalOpen}
        onClose={() => setIsTOCModalOpen(false)}
        book={activeBook}
        activeSectionIndex={activeSectionIndex}
        currentParagraphIndex={narrator.currentParagraphIndex}
        onSelectBookmark={handleSelectBookmark}
        onUpdateBookmarks={(bm) => updateBookBookmarks(activeBook.id, bm)}
        theme={theme}
      />

      {/* Structure & Section Editor Modal */}
      <SectionEditorModal
        isOpen={isSectionEditorOpen}
        onClose={() => setIsSectionEditorOpen(false)}
        book={activeBook}
        activeSectionIndex={activeSectionIndex}
        onSelectSection={(idx) => setActiveSectionIndex(idx)}
        onUpdateBookSections={(updatedSections) => updateBookSections(activeBook.id, updatedSections)}
        readFootnotes={narrator.readFootnotes}
        onToggleReadFootnotes={narrator.setReadFootnotes}
        theme={theme}
      />

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        book={activeBook}
        currentSection={currentSection}
        selectedVoice={narrator.selectedVoice}
        readFootnotes={narrator.readFootnotes}
        theme={theme}
      />

      {/* Book Info Modal */}
      <BookInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        book={activeBook}
        onDeleteBook={deleteBook}
        onResetAllAppData={resetAllAppData}
        theme={theme}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadFile={async (file) => {
          await addDocumentFile(file);
          setShowAICalibratePrompt(true);
        }}
        onAddText={addPastedText}
        isProcessing={isProcessingFile}
        processingStatus={processingStatus}
        theme={theme}
      />

      {/* Library Drawer */}
      <LibraryDrawer
        isOpen={isLibraryDrawerOpen}
        onClose={() => setIsLibraryDrawerOpen(false)}
        books={books}
        activeBookId={activeBookId}
        onSelectBook={selectBook}
        onDeleteBook={deleteBook}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        theme={theme}
      />

      {/* Detection Calibrator & Pattern Verifier Modal (v0.7) */}
      <DetectionCalibratorModal
        isOpen={isCalibratorOpen}
        onClose={() => setIsCalibratorOpen(false)}
        book={activeBook}
        onRecalibrate={(options) => recalibrateActiveBook(activeBook.id, options)}
        onApplyGlobalAction={(term, action) => applyGlobalTextAction(activeBook.id, term, action)}
        onUpdateBookSections={(updatedSections) => updateBookSections(activeBook.id, updatedSections)}
        onAutoFixTransitions={() => autoFixPageTransitions(activeBook.id)}
        onOpenSectionEditor={(secIdx) => {
          if (typeof secIdx === 'number') {
            setActiveSectionIndex(secIdx);
          }
          setIsSectionEditorOpen(true);
        }}
      />

      {/* Extension & App Installation Guide Modal */}
      <ExtensionGuideModal
        isOpen={isExtensionGuideOpen}
        onClose={() => setIsExtensionGuideOpen(false)}
        theme={theme}
      />

      {/* Floating Bottom-Right Diagnostic Log & Console Trigger Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsDiagnosticLogOpen(true)}
          title="Console de Diagnóstico, Operações e Salvar Log (.TXT)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 text-amber-300 dark:bg-slate-800 dark:text-amber-400 shadow-xl border border-slate-700 hover:border-amber-500 hover:bg-slate-950 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 cursor-pointer text-xs font-bold"
        >
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Salvar Log (.TXT)</span>
        </button>
      </div>

      {/* Diagnostic & Operations Log Modal */}
      <DiagnosticLogModal
        isOpen={isDiagnosticLogOpen}
        onClose={() => setIsDiagnosticLogOpen(false)}
        book={activeBook}
        theme={theme}
      />
    </div>
  );
}
