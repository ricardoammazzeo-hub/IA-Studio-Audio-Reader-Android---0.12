import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Search,
  Download,
  Trash2,
  Edit3,
  BookOpen,
  ArrowRight,
  Sparkles,
  Share2,
  FileText,
  Volume2,
} from 'lucide-react';
import { TextAnnotation, BookItem, ReadingTheme, AnnotationColor } from '../types';
import { exportAnnotationsAsMarkdown } from '../utils/annotationsStorage';
import { soundEffects } from '../utils/soundEffects';

interface AnnotationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  annotations: TextAnnotation[];
  onSelectAnnotation: (sectionIndex: number, paragraphId: string) => void;
  onEditAnnotation: (annotation: TextAnnotation) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  theme: ReadingTheme;
}

const COLOR_FILTERS: { color: AnnotationColor | 'all'; label: string; dotClass: string }[] = [
  { color: 'all', label: 'Todos', dotClass: 'bg-slate-400' },
  { color: 'yellow', label: 'Amarelo', dotClass: 'bg-amber-400' },
  { color: 'green', label: 'Verde', dotClass: 'bg-emerald-400' },
  { color: 'blue', label: 'Azul', dotClass: 'bg-sky-400' },
  { color: 'purple', label: 'Roxo', dotClass: 'bg-purple-400' },
  { color: 'orange', label: 'Laranja', dotClass: 'bg-orange-400' },
  { color: 'pink', label: 'Rosa', dotClass: 'bg-rose-400' },
];

export const AnnotationsDrawer: React.FC<AnnotationsDrawerProps> = ({
  isOpen,
  onClose,
  book,
  annotations,
  onSelectAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<AnnotationColor | 'all'>('all');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const filteredAnnotations = useMemo(() => {
    return annotations.filter((ann) => {
      if (colorFilter !== 'all' && ann.color !== colorFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchText = ann.selectedText.toLowerCase().includes(q);
      const matchComment = (ann.comment || '').toLowerCase().includes(q);
      return matchText || matchComment;
    });
  }, [annotations, colorFilter, searchQuery]);

  if (!isOpen) return null;

  const handleExportMarkdown = () => {
    soundEffects.success();
    const md = exportAnnotationsAsMarkdown(book, annotations);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Anotacoes_${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    soundEffects.click();
    const md = exportAnnotationsAsMarkdown(book, annotations);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {}
  };

  const themeClasses = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-slate-900 text-slate-100 border-slate-700',
  }[theme];

  const getColorBgClass = (color: AnnotationColor) => {
    switch (color) {
      case 'yellow':
        return 'border-amber-400 bg-amber-400/10 text-amber-900 dark:text-amber-200';
      case 'green':
        return 'border-emerald-400 bg-emerald-400/10 text-emerald-900 dark:text-emerald-200';
      case 'blue':
        return 'border-sky-400 bg-sky-400/10 text-sky-900 dark:text-sky-200';
      case 'purple':
        return 'border-purple-400 bg-purple-400/10 text-purple-900 dark:text-purple-200';
      case 'orange':
        return 'border-orange-400 bg-orange-400/10 text-orange-900 dark:text-orange-200';
      case 'pink':
        return 'border-rose-400 bg-rose-400/10 text-rose-900 dark:text-rose-200';
      default:
        return 'border-amber-400 bg-amber-400/10 text-amber-900 dark:text-amber-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg h-full shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-200 ${themeClasses}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-black/10 dark:border-white/10 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-sm">Anotações e Destaques</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold font-mono">
                {annotations.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search inside notes */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em anotações ou trechos..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/10 opacity-60"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Color filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
            {COLOR_FILTERS.map((item) => (
              <button
                key={item.color}
                type="button"
                onClick={() => {
                  soundEffects.click();
                  setColorFilter(item.color);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer border shrink-0 text-[11px] ${
                  colorFilter === item.color
                    ? 'bg-amber-600 text-white border-amber-600 font-bold'
                    : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List of Annotations */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {annotations.length === 0 ? (
            <div className="text-center py-16 opacity-60 space-y-3">
              <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
              <p className="text-sm font-semibold">Nenhuma anotação neste livro ainda</p>
              <p className="text-xs max-w-xs mx-auto leading-relaxed opacity-80">
                Selecione qualquer trecho de texto no leitor ou clique no botão de anotação de um parágrafo para destacar e adicionar comentários no estilo Adobe Acrobat.
              </p>
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <p className="text-xs font-semibold">Nenhum destaque corresponde ao filtro atual.</p>
            </div>
          ) : (
            filteredAnnotations.map((ann) => {
              const sec = book.sections[ann.sectionIndex];
              const pageNumber = sec?.chapterNumber || ann.sectionIndex + 1;
              const hasComment = Boolean(ann.comment && ann.comment.trim());

              return (
                <div
                  key={ann.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2.5 group relative ${getColorBgClass(
                    ann.color
                  )}`}
                >
                  {/* Top Bar with Page label and Actions */}
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1 font-bold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Página / Seção {pageNumber}</span>
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.click();
                          onEditAnnotation(ann);
                        }}
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                        title="Editar comentário / cor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Deseja excluir esta anotação?')) {
                            soundEffects.click();
                            onDeleteAnnotation(ann.id);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-rose-500/20 text-rose-600 transition cursor-pointer"
                        title="Remover anotação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quoted Text */}
                  <div
                    onClick={() => {
                      soundEffects.success();
                      onSelectAnnotation(ann.sectionIndex, ann.paragraphId);
                      onClose();
                    }}
                    className="font-serif italic text-xs sm:text-sm leading-relaxed cursor-pointer hover:underline"
                    title="Clique para ir ao parágrafo no leitor"
                  >
                    "{ann.selectedText}"
                  </div>

                  {/* User Comment Note (if present) */}
                  {hasComment && (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-sans leading-relaxed space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold opacity-70">
                        <MessageSquare className="w-3 h-3 text-amber-600" />
                        <span>Comentário:</span>
                      </div>
                      <p className="whitespace-pre-wrap">{ann.comment}</p>
                    </div>
                  )}

                  {/* Footer metadata & jump button */}
                  <div className="flex items-center justify-between text-[10px] opacity-60 pt-1 border-t border-black/10 dark:border-white/10">
                    <span>{new Date(ann.createdAt).toLocaleDateString('pt-BR')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.success();
                        onSelectAnnotation(ann.sectionIndex, ann.paragraphId);
                        onClose();
                      }}
                      className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                    >
                      <span>Ir ao texto</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions: Export Markdown & Copy */}
        {annotations.length > 0 && (
          <div className="p-3.5 px-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{copiedToast ? 'Copiado!' : 'Copiar Todas'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (.md)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
