import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Trash2,
  Save,
  Volume2,
  Palette,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { TextAnnotation, AnnotationColor, ReadingTheme } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface AnnotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  annotation: TextAnnotation | null;
  onSave: (updated: TextAnnotation) => void;
  onDelete?: (annotationId: string) => void;
  onSpeakText?: (text: string) => void;
  theme: ReadingTheme;
}

const COLOR_OPTIONS: { color: AnnotationColor; label: string; bgClass: string; borderClass: string }[] = [
  { color: 'yellow', label: 'Amarelo', bgClass: 'bg-amber-400', borderClass: 'border-amber-500' },
  { color: 'green', label: 'Verde', bgClass: 'bg-emerald-400', borderClass: 'border-emerald-500' },
  { color: 'blue', label: 'Azul', bgClass: 'bg-sky-400', borderClass: 'border-sky-500' },
  { color: 'purple', label: 'Roxo', bgClass: 'bg-purple-400', borderClass: 'border-purple-500' },
  { color: 'orange', label: 'Laranja', bgClass: 'bg-orange-400', borderClass: 'border-orange-500' },
  { color: 'pink', label: 'Rosa', bgClass: 'bg-rose-400', borderClass: 'border-rose-500' },
];

export const AnnotationEditorModal: React.FC<AnnotationEditorModalProps> = ({
  isOpen,
  onClose,
  annotation,
  onSave,
  onDelete,
  onSpeakText,
  theme,
}) => {
  const [comment, setComment] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow');

  useEffect(() => {
    if (annotation) {
      setComment(annotation.comment || '');
      setSelectedColor(annotation.color || 'yellow');
    }
  }, [annotation]);

  if (!isOpen || !annotation) return null;

  const handleSave = () => {
    soundEffects.success();
    onSave({
      ...annotation,
      comment: comment.trim(),
      color: selectedColor,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Deseja realmente remover esta anotação e destaque?')) {
      soundEffects.click();
      if (onDelete) onDelete(annotation.id);
      onClose();
    }
  };

  const themeClasses = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-slate-900 text-slate-100 border-slate-700',
  }[theme];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${themeClasses}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-bold text-sm">
              {annotation.comment ? 'Editar Anotação' : 'Adicionar Anotação / Comentário'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quoted Highlighted Text Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] opacity-70 font-semibold">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>Trecho Selecionado:</span>
              </span>
              {onSpeakText && (
                <button
                  type="button"
                  onClick={() => onSpeakText(annotation.selectedText)}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold transition cursor-pointer"
                  title="Ouvir este trecho com voz"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Ouvir</span>
                </button>
              )}
            </div>
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-serif italic text-xs sm:text-sm leading-relaxed max-h-32 overflow-y-auto">
              "{annotation.selectedText}"
            </div>
          </div>

          {/* Color Selection Palette */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold opacity-80 flex items-center gap-1">
              <Palette className="w-3 h-3" />
              <span>Cor do Destaque:</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    setSelectedColor(item.color);
                  }}
                  className={`w-7 h-7 rounded-full ${item.bgClass} border-2 transition transform cursor-pointer flex items-center justify-center ${
                    selectedColor === item.color
                      ? 'scale-115 border-black dark:border-white shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  title={item.label}
                />
              ))}
            </div>
          </div>

          {/* Comment input textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold opacity-80 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>Seu Comentário / Observação:</span>
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva seus pensamentos, ideias, resumo ou reflexões sobre este trecho..."
              className="w-full p-3 rounded-xl text-sm border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans leading-relaxed resize-none"
              autoFocus
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 px-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Nota</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
