import React, { useState } from 'react';
import { X, Book, Feather, Layers, ShieldCheck, Award, FileText, Trash2, RotateCcw } from 'lucide-react';
import { BOOK_METADATA } from '../data/bookContent';
import { BookItem, ReadingTheme } from '../types';

interface BookInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  onDeleteBook?: (bookId: string) => void;
  onResetAllAppData?: () => void;
  theme: ReadingTheme;
}

export const BookInfoModal: React.FC<BookInfoModalProps> = ({
  isOpen,
  onClose,
  book,
  onDeleteBook,
  onResetAllAppData,
  theme,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-[#181d24] text-slate-100',
  }[theme];

  const totalParagraphs = book.sections.reduce((acc, s) => acc + s.paragraphs.length, 0);
  const totalEstMinutes = book.sections.reduce((acc, s) => acc + s.durationEstimateMinutes, 0);

  const handleDelete = () => {
    if (confirmDelete && onDeleteBook) {
      onDeleteBook(book.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div
      id="book-info-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="book-info-modal-container"
        className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-amber-900/20 dark:border-slate-700 ${bgClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDelete(false);
        }}
      >
        <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h3 className="font-serif font-bold text-lg">Sobre a Obra</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-600/10 dark:bg-white/5 border border-amber-600/20">
            <h4 className="font-serif font-bold text-base text-amber-900 dark:text-amber-300">
              {book.title}
            </h4>
            {book.subtitle && (
              <p className="text-xs italic mt-0.5 opacity-80">{book.subtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="opacity-60 block text-[11px]">Autor</span>
              <span className="font-semibold">{book.author}</span>
            </div>
            <div className="p-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="opacity-60 block text-[11px]">Formato / Origem</span>
              <span className="font-semibold uppercase">{book.fileType} {book.isPreloaded ? '(Clássico)' : ''}</span>
            </div>
            <div className="p-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] col-span-2 flex items-center justify-between">
              <div>
                <span className="opacity-60 block text-[11px]">Estrutura do Audiobook</span>
                <span className="font-medium">
                  {book.sections.length} seções • {totalParagraphs} parágrafos • ~{totalEstMinutes} min de áudio
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-amber-200/50 dark:border-slate-800 pt-3">
            <h5 className="font-semibold text-xs mb-1 flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              Diretrizes de Conversão & Narração
            </h5>
            <p className="text-xs opacity-80 text-justify">
              Este leitor universal preserva rigorosamente e de forma integral o texto de qualquer documento PDF, DOCX, ePub ou TXT importado, dividindo-o em parágrafos e seções de áudio sem abreviações e com sincronização visual contínua.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
            {onResetAllAppData && (
              <button
                type="button"
                onClick={() => {
                  if (confirmReset) {
                    onResetAllAppData();
                    onClose();
                  } else {
                    setConfirmReset(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  confirmReset
                    ? 'bg-amber-600 text-white shadow-md animate-pulse'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{confirmReset ? 'Confirmar Reset de Configurações' : 'Resetar Configurações e Áudio'}</span>
              </button>
            )}

            {onDeleteBook && (
              <button
                type="button"
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  confirmDelete
                    ? 'bg-red-600 text-white shadow-md animate-pulse'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'Confirmar Exclusão Desta Obra' : 'Excluir Obra da Biblioteca'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
