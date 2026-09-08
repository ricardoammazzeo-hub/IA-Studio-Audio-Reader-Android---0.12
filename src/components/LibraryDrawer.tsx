import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Clock,
  Layers,
  ChevronRight,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { BookItem, ReadingTheme } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookItem[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onOpenUploadModal: () => void;
  theme: ReadingTheme;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  isOpen,
  onClose,
  books,
  activeBookId,
  onSelectBook,
  onDeleteBook,
  onOpenUploadModal,
  theme,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-[#181d24] text-slate-100',
  }[theme];

  const getFormatBadge = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">PDF</span>;
      case 'docx':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">DOCX</span>;
      case 'epub':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">EPUB</span>;
      case 'txt':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300">TXT</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-600/20 text-amber-900 dark:text-amber-200">OBRA</span>;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === bookId) {
      onDeleteBook(bookId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(bookId);
    }
  };

  return (
    <div
      id="library-drawer-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="library-drawer-container"
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-amber-900/20 dark:border-slate-700 ${bgClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDeleteId(null);
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-amber-200/50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-600/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">Minha Biblioteca de Audiobooks</h3>
              <p className="text-xs opacity-75">{books.length} {books.length === 1 ? 'obra disponível' : 'obras disponíveis'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenUploadModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar PDF / ePub / DOCX</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Book list */}
        <div className="p-5 overflow-y-auto space-y-3">
          {books.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-amber-900/20 dark:border-slate-800 rounded-xl">
              <BookOpen className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="font-serif text-sm font-semibold">Sua biblioteca está vazia</p>
              <p className="text-xs opacity-70 mt-1 mb-4">Adicione um novo livro em PDF, DOCX, ePub ou cole um texto.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition hover:bg-amber-700"
              >
                Importar Livro Agora
              </button>
            </div>
          ) : (
            books.map((book) => {
              const isActive = book.id === activeBookId;
              const isConfirming = confirmDeleteId === book.id;
              const totalParagraphs = book.sections.reduce((acc, s) => acc + s.paragraphs.length, 0);
              const totalEstMinutes = book.sections.reduce((acc, s) => acc + s.durationEstimateMinutes, 0);

              return (
                <div
                  key={book.id}
                  onClick={() => {
                    onSelectBook(book.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex items-center justify-between gap-4 ${
                    isActive
                      ? 'border-amber-600 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30'
                      : 'border-amber-900/10 dark:border-slate-800 hover:border-amber-600/40 bg-black/[0.01] dark:bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5">
                      {isActive ? (
                        <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <BookOpen className="w-5 h-5 opacity-40 shrink-0 group-hover:opacity-75 transition" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getFormatBadge(book.fileType)}
                        <h4 className="font-serif font-bold text-sm sm:text-base truncate">
                          {book.title}
                        </h4>
                      </div>

                      <p className="text-xs opacity-75 mt-0.5 truncate">
                        {book.author} {book.subtitle ? `• ${book.subtitle}` : ''}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] opacity-60 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {book.sections.length} {book.sections.length === 1 ? 'seção' : 'seções'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {totalParagraphs} parágrafos
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{totalEstMinutes} min de áudio
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-600 text-white">
                        Em Leitura
                      </span>
                    )}

                    {/* High-visibility delete button with safe 2-step inline confirmation */}
                    <button
                      type="button"
                      title={isConfirming ? 'Clique novamente para confirmar a exclusão' : 'Excluir da biblioteca'}
                      onClick={(e) => handleDeleteClick(e, book.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isConfirming
                          ? 'bg-red-600 text-white animate-pulse shadow-md'
                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isConfirming ? 'Confirmar Exclusão' : 'Excluir'}</span>
                    </button>

                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
