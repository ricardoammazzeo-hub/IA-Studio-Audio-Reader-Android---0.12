// Application Operation & Diagnostic Logger Utility
// Captures actions, state adjustments, audio events, and errors for debug export (.txt)

export type LogLevel = 'info' | 'warn' | 'error' | 'action' | 'audio' | 'edit';

export interface LogEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, any> | string;
}

class AppLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: Array<(logs: LogEntry[]) => void> = [];

  constructor() {
    // Capture uncaught window errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('WindowError', event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reasonStr = event.reason?.message || (typeof event.reason === 'string' ? event.reason : '');
        // Only log meaningful non-benign rejections
        if (reasonStr && !reasonStr.includes('canceled') && !reasonStr.includes('interrupted')) {
          this.warn('UnhandledPromise', reasonStr, {
            reason: event.reason,
          });
        }
      });
    }

    this.info('System', 'Logger initialized successfully (v0.12.3 Diagnostic Suite)');
  }

  private notify() {
    const slice = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(slice);
      } catch (err) {
        console.error('Logger listener error:', err);
      }
    });
  }

  public subscribe(callback: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public log(level: LogLevel, category: string, message: string, details?: any) {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: now.toISOString(),
      timeFormatted,
      level,
      category,
      message,
      details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : undefined,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also write to dev console
    if (level === 'error') {
      console.error(`[${category}] ${message}`, details || '');
    } else if (level === 'warn') {
      console.warn(`[${category}] ${message}`, details || '');
    }

    this.notify();
  }

  public info(category: string, message: string, details?: any) {
    this.log('info', category, message, details);
  }

  public action(category: string, message: string, details?: any) {
    this.log('action', category, message, details);
  }

  public edit(category: string, message: string, details?: any) {
    this.log('edit', category, message, details);
  }

  public audio(category: string, message: string, details?: any) {
    this.log('audio', category, message, details);
  }

  public warn(category: string, message: string, details?: any) {
    this.log('warn', category, message, details);
  }

  public error(category: string, message: string, details?: any) {
    this.log('error', category, message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.info('System', 'Logs limpos pelo usuário.');
    this.notify();
  }

  public generateDiagnosticReport(bookInfo?: any): string {
    const now = new Date();
    const divider = '='.repeat(80);
    const subDivider = '-'.repeat(80);

    let report = `${divider}\n`;
    report += ` RELATÓRIO DE DIAGNÓSTICO E OPERAÇÕES — LEITOR AUDIOBOOK v0.12.3\n`;
    report += ` Data/Hora: ${now.toLocaleString('pt-BR')} (${now.toISOString()})\n`;
    report += `${divider}\n\n`;

    // 1. ENVIRONMENT SUMMARY
    report += `[1. AMBIENTE & SISTEMA]\n`;
    report += `Navegador / User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}\n`;
    report += `Plataforma: ${typeof navigator !== 'undefined' ? navigator.platform : 'N/A'}\n`;
    report += `Resolução da Tela: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} (pixelRatio: ${window.devicePixelRatio})` : 'N/A'}\n`;
    report += `Suporte a SpeechSynthesis: ${typeof window !== 'undefined' && 'speechSynthesis' in window ? 'Sim' : 'Não'}\n`;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      report += `Vozes Disponíveis no Sistema: ${voices.length} vozes detectadas\n`;
    }
    report += `\n${subDivider}\n\n`;

    // 2. ACTIVE BOOK SNAPSHOT
    if (bookInfo) {
      report += `[2. SNAPSHOT DO LIVRO ATIVO]\n`;
      report += `Título: ${bookInfo.title || 'Sem título'}\n`;
      report += `Autor: ${bookInfo.author || 'Desconhecido'}\n`;
      report += `Total de Seções / Páginas: ${bookInfo.sections?.length || 0}\n`;
      
      let totalParagraphs = 0;
      let headingsCount = 0;
      let textCount = 0;
      let quotesCount = 0;
      let footnotesCount = 0;
      let nonFreeCount = 0;
      let editedCount = 0;

      if (Array.isArray(bookInfo.sections)) {
        bookInfo.sections.forEach((sec: any) => {
          if (Array.isArray(sec.paragraphs)) {
            totalParagraphs += sec.paragraphs.length;
            sec.paragraphs.forEach((p: any) => {
              if (p.isNonFree) nonFreeCount++;
              if (p.type === 'heading' || p.isHeading) headingsCount++;
              else if (p.type === 'quote' || p.isQuote) quotesCount++;
              else if (p.type === 'footnote' || p.isFootnote) footnotesCount++;
              else textCount++;
              if (p.isCustomEdited) editedCount++;
            });
          }
        });
      }

      report += `Total de Parágrafos / Blocos: ${totalParagraphs}\n`;
      report += `  - Títulos identificados: ${headingsCount}\n`;
      report += `  - Textos normais: ${textCount}\n`;
      report += `  - Citações: ${quotesCount}\n`;
      report += `  - Notas de rodapé: ${footnotesCount}\n`;
      report += `  - Blocos omitidos/não-livres: ${nonFreeCount}\n`;
      report += `  - Parágrafos editados manualmente: ${editedCount}\n`;
      report += `Marcadores cadastrados: ${bookInfo.bookmarks?.length || 0}\n`;
      report += `\n${subDivider}\n\n`;
    }

    // 3. LOGS TIMELINE
    report += `[3. HISTÓRICO CRONOLÓGICO DE OPERAÇÕES E EVENTOS (${this.logs.length} registros)]\n\n`;
    
    if (this.logs.length === 0) {
      report += `Nenhum evento registrado até o momento.\n`;
    } else {
      this.logs.forEach((item, index) => {
        const num = String(index + 1).padStart(4, '0');
        const levelTag = item.level.toUpperCase().padEnd(6, ' ');
        const catTag = `[${item.category}]`.padEnd(16, ' ');
        report += `${num} | ${item.timeFormatted} | ${levelTag} | ${catTag} | ${item.message}\n`;
        if (item.details) {
          const detStr = typeof item.details === 'string' ? item.details : JSON.stringify(item.details, null, 2);
          report += `       Detalhes: ${detStr.replace(/\n/g, '\n       ')}\n`;
        }
      });
    }

    report += `\n${divider}\n`;
    report += ` FIM DO RELATÓRIO — PRONTO PARA ENVIO E ANÁLISE\n`;
    report += `${divider}\n`;

    return report;
  }

  public downloadLogFile(bookInfo?: any) {
    const reportText = this.generateDiagnosticReport(bookInfo);
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `log_operacoes_audiobook_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.action('LogExport', 'Arquivo de log baixado como TXT com sucesso');
  }
}

export const logger = new AppLogger();
