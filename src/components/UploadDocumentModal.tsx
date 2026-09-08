import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  BookOpen,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCode,
  FilePlus,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { ReadingTheme } from '../types';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFile: (file: File) => Promise<any>;
  onAddText: (title: string, text: string, author?: string) => void;
  isProcessing: boolean;
  processingStatus: string;
  theme: ReadingTheme;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUploadFile,
  onAddText,
  isProcessing,
  processingStatus,
  theme,
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [pastedTitle, setPastedTitle] = useState<string>('');
  const [pastedAuthor, setPastedAuthor] = useState<string>('');
  const [pastedContent, setPastedContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-[#181d24] text-slate-100',
  }[theme];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage('');
    try {
      await onUploadFile(file);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o arquivo.');
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedContent.trim()) {
      setErrorMessage('Por favor, cole algum texto para gerar o audiobook.');
      return;
    }
    onAddText(
      pastedTitle.trim() || 'Texto Sem Título',
      pastedContent.trim(),
      pastedAuthor.trim() || 'Autor não informado'
    );
    setPastedTitle('');
    setPastedAuthor('');
    setPastedContent('');
    onClose();
  };

  return (
    <div
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="upload-modal-container"
        className={`w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-amber-900/20 dark:border-slate-700 ${bgClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-amber-200/50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-600/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">Novo Audiobook</h3>
              <p className="text-xs opacity-75">Importe PDF, Word (.docx), ePub ou Texto para audição</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 border-b border-amber-200/40 dark:border-slate-800 flex gap-4">
          <button
            type="button"
            onClick={() => { setTab('upload'); setErrorMessage(''); }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              tab === 'upload'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Carregar Arquivo (PDF / Docx / ePub)
          </button>
          <button
            type="button"
            onClick={() => { setTab('paste'); setErrorMessage(''); }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              tab === 'paste'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Colar Texto / Artigo
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-amber-600 dark:text-amber-400" />
              <h4 className="font-serif font-bold text-base">Convertendo Documento em Audiobook...</h4>
              <p className="text-xs opacity-75 max-w-sm font-mono">{processingStatus || 'Processando parágrafos e estrutura...'}</p>
            </div>
          ) : tab === 'upload' ? (
            <div>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragOver
                    ? 'border-amber-600 bg-amber-500/10 scale-[0.99]'
                    : 'border-amber-900/20 dark:border-slate-700 hover:border-amber-600/60 bg-black/[0.01] dark:bg-white/[0.01]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.epub,.txt,.md,.audiobook,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 border border-amber-600/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-serif font-bold text-sm">
                    Arraste seu arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    Formatos suportados: <strong>TXT / MD</strong>, <strong>.audiobook (Projeto Salvo)</strong>, <strong>PDF</strong>, <strong>DOCX</strong>, <strong>ePub</strong>
                  </p>
                </div>
              </div>

              {/* Badges of supported formats */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] opacity-80">
                <div className="p-2 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="font-bold block text-purple-600 dark:text-purple-400">TXT / MD</span>
                  <span>Textos e Notas</span>
                </div>
                <div className="p-2 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="font-bold block text-emerald-600 dark:text-emerald-400">.AUDIOBOOK</span>
                  <span>Projetos Salvos</span>
                </div>
                <div className="p-2 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="font-bold block text-amber-700 dark:text-amber-400">PDF</span>
                  <span>Livros & Artigos</span>
                </div>
                <div className="p-2 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="font-bold block text-blue-600 dark:text-blue-400">DOCX / EPUB</span>
                  <span>Documentos Digitais</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold opacity-80 block mb-1">
                  Título da Obra / Capítulo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Artigo sobre Filosofia Grega"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-80 block mb-1">
                  Autor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome do autor"
                  value={pastedAuthor}
                  onChange={(e) => setPastedAuthor(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-80 block mb-1">
                  Conteúdo do Texto
                </label>
                <textarea
                  rows={8}
                  placeholder="Cole aqui os parágrafos do seu texto, artigo ou capítulo..."
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-3 outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar Audiobook
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
