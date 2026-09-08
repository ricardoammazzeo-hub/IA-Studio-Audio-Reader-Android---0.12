import React, { useState } from 'react';
import {
  X,
  Download,
  FileAudio,
  FileText,
  FileJson,
  Loader2,
  CheckCircle,
  Volume2,
  Sparkles,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import { BookItem, SectionItem, ReadingTheme } from '../types';
import {
  exportToMarkdown,
  exportSectionToText,
  exportAudioTrack,
  triggerFileDownload,
} from '../utils/audioExporter';
import { exportAudiobookProject } from '../utils/projectSaveManager';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  currentSection: SectionItem;
  selectedVoice?: string;
  readFootnotes?: boolean;
  theme: ReadingTheme;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  book,
  currentSection,
  selectedVoice = '',
  readFootnotes = false,
  theme,
}) => {
  const [exportScope, setExportScope] = useState<'section' | 'book'>('section');
  const [isExportingAudio, setIsExportingAudio] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3');

  if (!isOpen) return null;

  const modalBgClasses = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-[#181e26] text-slate-100 border-slate-700',
  }[theme];

  // Export Audio File (.mp3 or .wav) with Natural Voices / Synthesizer
  const handleExportAudio = async () => {
    setIsExportingAudio(true);
    setStatusMessage('Preparando parágrafos para síntese de áudio...');
    setSuccessMessage('');

    try {
      // Collect readable text depending on scope
      let textToSpeak = '';
      if (exportScope === 'section') {
        textToSpeak = currentSection.paragraphs
          .filter((p) => !p.isNonFree && (readFootnotes || p.type !== 'footnote'))
          .map((p) => p.text)
          .join('\n\n');
      } else {
        textToSpeak = book.sections
          .map((sec) =>
            sec.paragraphs
              .filter((p) => !p.isNonFree && (readFootnotes || p.type !== 'footnote'))
              .map((p) => p.text)
              .join('\n\n')
          )
          .join('\n\n---\n\n');
      }

      setStatusMessage(`Sintetizando ${audioFormat.toUpperCase()} com vozes naturais...`);

      const audioBlob = await exportAudioTrack(
        textToSpeak,
        selectedVoice || 'Kore',
        audioFormat,
        (msg) => setStatusMessage(msg)
      );

      const scopeName =
        exportScope === 'section'
          ? `${book.title}_${currentSection.partTitle || 'Pagina'}`
          : `${book.title}_Completo`;

      const cleanFilename = `${scopeName.replace(/[^a-zA-Z0-9À-ú]/g, '_')}.${audioFormat}`;
      triggerFileDownload(audioBlob, cleanFilename);

      setSuccessMessage(
        `Áudio ${audioFormat.toUpperCase()} gerado e baixado com sucesso (${cleanFilename})!`
      );
    } catch (err: any) {
      console.error('Audio export error:', err);
      setStatusMessage('');
      setSuccessMessage('⚠️ Não foi possível sintetizar todo o áudio offline.');
    } finally {
      setIsExportingAudio(false);
      setStatusMessage('');
    }
  };

  const handleExportMarkdown = () => {
    const mdContent = exportToMarkdown(book);
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const filename = `${book.title.replace(/[^a-zA-Z0-9À-ú]/g, '_')}.md`;
    triggerFileDownload(blob, filename);
    setSuccessMessage('Texto exportado em Markdown (.md) com sucesso!');
  };

  const handleExportText = () => {
    const txtContent =
      exportScope === 'section'
        ? exportSectionToText(currentSection)
        : book.sections.map((s) => exportSectionToText(s)).join('\n\n\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const filename = `${(exportScope === 'section' ? currentSection.partTitle : book.title).replace(/[^a-zA-Z0-9À-ú]/g, '_')}.txt`;
    triggerFileDownload(blob, filename);
    setSuccessMessage('Texto formatado exportado em TXT com sucesso!');
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify(book, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const filename = `${book.title.replace(/[^a-zA-Z0-9À-ú]/g, '_')}_audiobook.json`;
    triggerFileDownload(blob, filename);
    setSuccessMessage('Estrutura do Livro exportada em JSON com sucesso!');
  };

  return (
    <div
      id="export-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-modal-container"
        className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border ${modalBgClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg">Exportar Áudio & Texto</h3>
              <p className="text-xs opacity-75">Gere o arquivo de áudio MP3/WAV ou baixe o texto formatado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-75">
            Escopo da Exportação
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportScope('section')}
              className={`p-3 rounded-xl border text-left transition ${
                exportScope === 'section'
                  ? 'border-amber-600 bg-amber-600/10 font-semibold'
                  : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="text-xs font-bold truncate">Esta Página / Seção</div>
              <div className="text-[11px] opacity-75 truncate">{currentSection.partTitle}</div>
            </button>
            <button
              onClick={() => setExportScope('book')}
              className={`p-3 rounded-xl border text-left transition ${
                exportScope === 'book'
                  ? 'border-amber-600 bg-amber-600/10 font-semibold'
                  : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="text-xs font-bold truncate">Livro Completo</div>
              <div className="text-[11px] opacity-75 truncate">{book.sections.length} páginas</div>
            </button>
          </div>
        </div>

        {/* Text Formats & Project Save Grid */}
        <div className="space-y-2.5 mb-5">
          <label className="text-[11px] font-bold uppercase tracking-wider block opacity-70">
            Exportar Textos & Salvar Projeto
          </label>

          <button
            onClick={handleExportText}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-emerald-600 hover:bg-emerald-600/5 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Arquivo Texto Formatado (.txt)</div>
                <div className="text-[10px] opacity-70">Texto limpo e legível com cabeçalhos filtrados</div>
              </div>
            </div>
            <Download className="w-4 h-4 opacity-50" />
          </button>

          <button
            onClick={handleExportMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-emerald-600 hover:bg-emerald-600/5 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Documento Markdown (.md)</div>
                <div className="text-[10px] opacity-70">Com títulos, citações, notas e estrutura de seções</div>
              </div>
            </div>
            <Download className="w-4 h-4 opacity-50" />
          </button>

          <button
            onClick={() => {
              exportAudiobookProject(book);
              setSuccessMessage('Projeto (.audiobook) salvo com todas as edições, marcadores e anotações!');
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-purple-600 hover:bg-purple-600/5 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300">
                <FileJson className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Salvar Projeto Completo (.audiobook)</div>
                <div className="text-[10px] opacity-70">Salva todas as edições de texto, marcadores e anotações</div>
              </div>
            </div>
            <Download className="w-4 h-4 opacity-50" />
          </button>
        </div>

        {/* Audio Export Card (MP3 / WAV with Natural Voices) */}
        {/* REMOVED AUDIO EXPORT FEATURE AS BROWSER TTS CANNOT BE EXPORTED TO MP3 */}
        {/* Feedback messages */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
