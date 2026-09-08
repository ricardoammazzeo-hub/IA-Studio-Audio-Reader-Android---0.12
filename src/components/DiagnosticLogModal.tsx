import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Download,
  Copy,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Info,
  Sliders,
  Volume2,
  Edit3,
  Search,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { LogEntry, logger, LogLevel } from '../utils/appLogger';
import { BookItem, ReadingTheme } from '../types';

interface DiagnosticLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: BookItem;
  theme: ReadingTheme;
}

export const DiagnosticLogModal: React.FC<DiagnosticLogModalProps> = ({
  isOpen,
  onClose,
  book,
  theme,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.category.toLowerCase().includes(q) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, filterLevel, searchQuery]);

  const handleClearCacheAndReload = () => {
    if (typeof window !== 'undefined') {
      // Unregister Service Workers (PWA)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      localStorage.clear();
      sessionStorage.clear();
      
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  const bgClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-[#141820] text-slate-100',
  }[theme];

  const handleCopy = () => {
    const report = logger.generateDiagnosticReport(book);
    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    logger.downloadLogFile(book);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-600/30">
            ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            WARN
          </span>
        );
      case 'action':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            ACTION
          </span>
        );
      case 'edit':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            EDIT
          </span>
        );
      case 'audio':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            AUDIO
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            INFO
          </span>
        );
    }
  };

  return (
    <div
      id="diagnostic-log-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="diagnostic-log-modal-container"
        className={`w-full max-w-4xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-black/15 dark:border-slate-700 ${bgClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-amber-400 dark:bg-amber-500/20 dark:text-amber-300 shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg">
                  Console de Operações & Diagnóstico
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-mono font-bold">
                  v0.12.3
                </span>
              </div>
              <p className="text-xs opacity-75">
                Histórico de comandos, edições, ajustes de áudio e erros do leitor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="p-3 sm:p-4 border-b border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 bg-black/[0.02] dark:bg-white/[0.02]">
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[180px] max-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder="Filtrar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              {(['all', 'action', 'edit', 'audio', 'error', 'info'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
                    filterLevel === lvl
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  {lvl === 'all' ? 'Todos' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearCacheAndReload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/10 text-rose-600 hover:bg-rose-600/20 text-xs font-semibold transition cursor-pointer border border-rose-600/20"
              title="Limpar todos os dados do PWA e atualizar aplicativo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Forçar Atualização</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold transition cursor-pointer border border-black/10 dark:border-white/10"
              title="Copiar relatório completo para a área de transferência"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copiado!' : 'Copiar Log'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Baixar arquivo TXT com todas as operações e erros"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salvar Log (.TXT)</span>
            </button>

            <button
              type="button"
              onClick={() => logger.clearLogs()}
              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
              title="Limpar logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Viewer Screen */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950 text-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 select-none py-12">
              <FileText className="w-10 h-10 opacity-30" />
              <p>Nenhum log encontrado para o filtro atual.</p>
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 text-[11px]">{item.timeFormatted}</span>
                    {getLevelBadge(item.level)}
                    <span className="text-amber-400 font-bold">[{item.category}]</span>
                    <span className="text-slate-200 font-medium">{item.message}</span>
                  </div>
                </div>

                {item.details && (
                  <pre className="mt-1 p-2 rounded bg-black/40 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {typeof item.details === 'string' ? item.details : JSON.stringify(item.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-3 sm:p-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs opacity-75 bg-black/[0.02] dark:bg-white/[0.02]">
          <span>Total de eventos: {logs.length} (Exibindo: {filteredLogs.length})</span>
          <span className="hidden sm:inline">
            Clique em "Salvar Log (.TXT)" para anexar nas mensagens de diagnóstico.
          </span>
        </div>
      </div>
    </div>
  );
};
