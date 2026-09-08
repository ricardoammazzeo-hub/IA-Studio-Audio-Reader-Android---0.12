import React, { useState, useRef } from 'react';
import {
  Bookmark,
  X,
  List,
  Layers,
} from 'lucide-react';
import { BookItem, BookmarkItem, ReadingTheme } from '../types';
import { CascadingBookmarksIndex } from './CascadingBookmarksIndex';

interface QuickIndexSidebarProps {
  book: BookItem;
  activeSectionIndex: number;
  currentParagraphIndex?: number;
  onSelectBookmark: (sectionIndex: number, paragraphIndex?: number, paragraphId?: string) => void;
  onUpdateBookmarks?: (bookmarks: BookmarkItem[]) => void;
  theme: ReadingTheme;
}

export const QuickIndexSidebar: React.FC<QuickIndexSidebarProps> = ({
  book,
  activeSectionIndex,
  currentParagraphIndex = 0,
  onSelectBookmark,
  onUpdateBookmarks,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 450);
  };

  const isVisible = isOpen || isHovered;

  // Theme styling for drawer
  const themeBgClasses = {
    light: 'bg-white/98 text-slate-800 border-slate-200',
    dark: 'bg-slate-900/98 text-slate-100 border-slate-700',
  }[theme];

  return (
    <>
      {/* Floating Left Margin Handle Button (Accessible anytime on hover or click) */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Acesso Rápido ao Índice e Marcadores em Cascata"
          aria-label="Abrir Menu de Índice Rápido"
          className="p-2.5 rounded-r-2xl bg-amber-600/90 hover:bg-amber-600 text-white shadow-xl backdrop-blur-md transition-all duration-300 transform hover:scale-105 flex items-center gap-1.5 cursor-pointer border border-l-0 border-white/20"
        >
          <List className="w-4 h-4" />
          <span className="text-[11px] font-bold tracking-wide hidden sm:inline writing-mode-vertical">
            Índice
          </span>
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sliding Responsive Drawer Panel */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 sm:w-80 border-r shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 ease-out ${themeBgClasses} ${
          isVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">
                Índice & Marcadores
              </h3>
              <p className="text-[11px] opacity-60 truncate max-w-[170px]">
                {book.title || 'Documento'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsHovered(false);
            }}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Cascading Tree Content */}
        <div className="flex-1 overflow-hidden p-3">
          <CascadingBookmarksIndex
            sections={book.sections || []}
            bookmarks={book.bookmarks}
            activeSectionIndex={activeSectionIndex}
            currentParagraphIndex={currentParagraphIndex}
            onSelectBookmark={(secIdx, pIdx, pId) => {
              onSelectBookmark(secIdx, pIdx, pId);
              setIsOpen(false);
              setIsHovered(false);
            }}
            onUpdateBookmarks={onUpdateBookmarks}
            theme={theme}
            mode="sidebar"
          />
        </div>
      </aside>
    </>
  );
};

