import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { BookItem, BookmarkItem, ReadingTheme } from '../types';
import { CascadingBookmarksIndex } from './CascadingBookmarksIndex';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  activeSectionIndex: number;
  currentParagraphIndex?: number;
  onSelectBookmark: (sectionIndex: number, paragraphIndex?: number, paragraphId?: string) => void;
  onUpdateBookmarks?: (bookmarks: BookmarkItem[]) => void;
  theme: ReadingTheme;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  book,
  activeSectionIndex,
  currentParagraphIndex = 0,
  onSelectBookmark,
  onUpdateBookmarks,
  theme,
}) => {
  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-[#181d24] text-slate-100',
  }[theme];

  return (
    <div
      id="toc-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="toc-modal-container"
        className={`w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-amber-900/20 dark:border-slate-700 ${bgClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600/15 text-amber-700 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg">
                Índice Inteligente & Marcadores
              </h3>
              <p className="text-xs opacity-75">
                {book.title} {book.author ? `— ${book.author}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list using unified cascading index */}
        <div className="p-4 sm:p-5 flex-1 overflow-hidden">
          <CascadingBookmarksIndex
            sections={book.sections || []}
            bookmarks={book.bookmarks}
            activeSectionIndex={activeSectionIndex}
            currentParagraphIndex={currentParagraphIndex}
            onSelectBookmark={onSelectBookmark}
            onUpdateBookmarks={onUpdateBookmarks}
            theme={theme}
            mode="modal"
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

