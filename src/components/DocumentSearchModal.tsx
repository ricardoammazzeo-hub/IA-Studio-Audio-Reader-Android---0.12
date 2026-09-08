import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { SectionItem, ReadingTheme, BookItem } from '../types';
import { soundEffects } from '../utils/soundEffects';

export interface SearchMatchResult {
  id: string;
  sectionIndex: number;
  paragraphIndex: number;
  paragraphId: string;
  chapterNumber: number;
  chapterTitle: string;
  previewBefore: string;
  matchText: string;
  previewAfter: string;
  fullParagraphText: string;
}

interface DocumentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: BookItem;
  sections?: SectionItem[];
  activeSectionIndex?: number;
  onNavigateToMatch: (sectionIndex: number, paragraphIndex?: number, paragraphId?: string) => void;
  theme: ReadingTheme;
}

export const DocumentSearchModal: React.FC<DocumentSearchModalProps> = ({
  isOpen,
  onClose,
  book,
  sections: propSections,
  activeSectionIndex = 0,
  onNavigateToMatch,
  theme,
}) => {
  const [query, setQuery] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Safely resolve sections list from either book prop or sections prop
  const resolvedSections: SectionItem[] = useMemo(() => {
    if (book && Array.isArray(book.sections)) return book.sections;
    if (Array.isArray(propSections)) return propSections;
    return [];
  }, [book, propSections]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
    }
  }, [isOpen]);

  // Compute matches across all sections and paragraphs safely
  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1 || !resolvedSections || resolvedSections.length === 0) {
      return [];
    }

    const results: SearchMatchResult[] = [];
    const searchTarget = caseSensitive ? trimmed : trimmed.toLowerCase();

    resolvedSections.forEach((sec, secIdx) => {
      if (!sec || !Array.isArray(sec.paragraphs)) return;

      sec.paragraphs.forEach((p, pIdx) => {
        if (!p || !p.text) return;
        const text = p.text;
        const compareText = caseSensitive ? text : text.toLowerCase();
        let startIndex = 0;
        let pos = compareText.indexOf(searchTarget, startIndex);

        while (pos !== -1) {
          const matchEnd = pos + searchTarget.length;
          const previewStart = Math.max(0, pos - 40);
          const previewEnd = Math.min(text.length, matchEnd + 50);

          const before = (previewStart > 0 ? '...' : '') + text.substring(previewStart, pos);
          const matchStr = text.substring(pos, matchEnd);
          const after = text.substring(matchEnd, previewEnd) + (previewEnd < text.length ? '...' : '');

          results.push({
            id: `match-${secIdx}-${pIdx}-${pos}`,
            sectionIndex: secIdx,
            paragraphIndex: pIdx,
            paragraphId: p.id,
            chapterNumber: sec.chapterNumber || secIdx + 1,
            chapterTitle: sec.chapterTitle || sec.partTitle || `Página ${sec.chapterNumber || secIdx + 1}`,
            previewBefore: before,
            matchText: matchStr,
            previewAfter: after,
            fullParagraphText: text,
          });

          startIndex = matchEnd;
          pos = compareText.indexOf(searchTarget, startIndex);
        }
      });
    });

    return results;
  }, [query, resolvedSections, caseSensitive]);

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [query]);

  const handleNext = () => {
    if (matches.length === 0) return;
    soundEffects.click();
    const next = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(next);
    const item = matches[next];
    if (item) {
      onNavigateToMatch(item.sectionIndex, item.paragraphIndex, item.paragraphId);
    }
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    soundEffects.click();
    const prev = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prev);
    const item = matches[prev];
    if (item) {
      onNavigateToMatch(item.sectionIndex, item.paragraphIndex, item.paragraphId);
    }
  };

  const handleSelectMatch = (idx: number) => {
    soundEffects.success();
    setCurrentMatchIndex(idx);
    const item = matches[idx];
    if (item) {
      onNavigateToMatch(item.sectionIndex, item.paragraphIndex, item.paragraphId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-[#181d24] text-slate-100 border-slate-700',
  }[theme];

  const currentMatch = matches[currentMatchIndex];

  return (
    <div
      id="document-search-modal-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="document-search-modal-container"
        className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${bgClasses}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar palavras, termos ou conceitos no livro..."
              className="w-full bg-transparent border-none outline-none font-medium text-sm sm:text-base placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Match Counter */}
            {query.trim().length > 0 && (
              <span className="text-xs font-mono px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
                {matches.length === 0
                  ? '0 resultados'
                  : `${currentMatchIndex + 1} de ${matches.length}`}
              </span>
            )}

            {/* Navigation Arrows */}
            {matches.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  title="Ocorrência Anterior (Shift+Enter)"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  title="Próxima Ocorrência (Enter)"
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded accent-amber-600"
            />
            <span>Diferenciar maiúsculas/minúsculas</span>
          </label>

          <span className="text-[11px] text-slate-400">
            Pressione <kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">Enter</kbd> para navegar
          </span>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {query.trim().length === 0 ? (
            <div className="text-center py-12 px-4 opacity-60">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-600" />
              <p className="font-serif font-bold text-sm">Pesquise em todo o documento</p>
              <p className="text-xs mt-1">
                Digite um termo para encontrar instantaneamente todas as ocorrências no livro.
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-10 px-4 opacity-75">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-500" />
              <p className="font-serif font-bold text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Não encontramos correspondências para "{query}". Tente um termo diferente.
              </p>
            </div>
          ) : (
            matches.map((item, idx) => {
              const isSelected = idx === currentMatchIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectMatch(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-xs ring-1 ring-amber-500/30'
                      : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold font-mono text-amber-700 dark:text-amber-400">
                      Pág. {item.chapterNumber} • {item.chapterTitle}
                    </span>
                    <span className="text-[10px] opacity-60">
                      Parágrafo #{item.paragraphIndex + 1}
                    </span>
                  </div>

                  <p className="text-xs font-serif leading-relaxed text-slate-800 dark:text-slate-200">
                    <span className="opacity-70">{item.previewBefore}</span>
                    <mark className="bg-amber-400 text-slate-950 font-bold px-1 py-0.2 rounded mx-0.5">
                      {item.matchText}
                    </mark>
                    <span className="opacity-70">{item.previewAfter}</span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
