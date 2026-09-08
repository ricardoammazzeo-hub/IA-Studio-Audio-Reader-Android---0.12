import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Layers,
  Merge,
  Split,
  Edit3,
  Trash2,
  Heading,
  AlignLeft,
  Quote,
  Bookmark,
  Check,
  Plus,
  ArrowRight,
  Info,
  FileText,
  Volume2,
  VolumeX,
  EyeOff,
  Scissors,
  Undo2,
  Redo2,
  Sparkles,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle2,
  MousePointer,
  MousePointerClick,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Sliders,
  SlidersHorizontal,
  BarChart2,
  Activity,
  Cpu,
  Zap,
  HelpCircle,
  FolderTree,
  FolderPlus,
  FilePlus2,
  Folder,
  FileCode,
  ShieldAlert,
  SlidersVertical,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  MoveRight,
  ListTree,
} from 'lucide-react';
import { BookItem, SectionItem, ParagraphItem, ParagraphType, ReadingTheme } from '../types';
import { splitFusedRunningHeaders } from '../utils/documentParser';
import {
  calculateParagraphProbabilities,
  reevaluateBookWithProbabilities,
  CalibrationWeights,
  DEFAULT_CALIBRATION_WEIGHTS,
  ProbabilityScores,
} from '../utils/probabilisticEngine';

interface SectionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  activeSectionIndex: number;
  onSelectSection: (index: number) => void;
  onUpdateBookSections: (updatedSections: SectionItem[]) => void;
  readFootnotes?: boolean;
  onToggleReadFootnotes?: (enabled: boolean) => void;
  theme: ReadingTheme;
}

export const SectionEditorModal: React.FC<SectionEditorModalProps> = ({
  isOpen,
  onClose,
  book,
  activeSectionIndex,
  onSelectSection,
  onUpdateBookSections,
  readFootnotes = false,
  onToggleReadFootnotes,
  theme,
}) => {
  // Local state with History Stack for Undo/Redo
  const [sectionsHistory, setSectionsHistory] = useState<SectionItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [selectedSecIdx, setSelectedSecIdx] = useState<number>(activeSectionIndex);
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingSectionTitle, setEditingSectionTitle] = useState<boolean>(false);
  const [secTitleInput, setSecTitleInput] = useState<string>('');

  // Mouse Cut Mode & Splitting state
  const [isMouseCutMode, setIsMouseCutMode] = useState<boolean>(false);
  const [splittingParagraphId, setSplittingParagraphId] = useState<string | null>(null);
  const [splitPart1Text, setSplitPart1Text] = useState<string>('');
  const [splitPart2Text, setSplitPart2Text] = useState<string>('');
  const [splitPart1Type, setSplitPart1Type] = useState<ParagraphType>('header_footer');
  const [splitPart2Type, setSplitPart2Type] = useState<ParagraphType>('text');
  const [splitOptions, setSplitOptions] = useState<{ label: string; part1: string; part2: string; type1: ParagraphType; type2: ParagraphType }[]>([]);

  // Probabilistic Calibration & Comparison state
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [calibrationWeights, setCalibrationWeights] = useState<CalibrationWeights>(DEFAULT_CALIBRATION_WEIGHTS);
  const [inspectedParagraphId, setInspectedParagraphId] = useState<string | null>(null);

  // Page-by-Page & Hierarchy Management State
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState<boolean>(false);
  const [newPageNumber, setNewPageNumber] = useState<number>(1);
  const [newPageContent, setNewPageContent] = useState<string>('');
  const [newPageIsNonFree, setNewPageIsNonFree] = useState<boolean>(false);
  const [newPageTargetChapterIdx, setNewPageTargetChapterIdx] = useState<number>(0);
  const [pageHierarchyFilter, setPageHierarchyFilter] = useState<number | 'all'>('all');

  // Pattern Propagation state
  const [propagationModal, setPropagationModal] = useState<{
    isOpen: boolean;
    pattern: string;
    targetType: ParagraphType;
  }>({
    isOpen: false,
    pattern: '',
    targetType: 'pre_post_textual',
  });
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Initialize history on modal open or book change
  useEffect(() => {
    if (isOpen && book.sections.length > 0) {
      setSectionsHistory([JSON.parse(JSON.stringify(book.sections))]);
      setHistoryIndex(0);
      setSelectedSecIdx(activeSectionIndex);
      setEditingParagraphId(null);
      setSplittingParagraphId(null);
      setNotificationToast(null);
    }
  }, [isOpen, book.id]);

  // Current working sections
  const currentSections =
    historyIndex >= 0 && sectionsHistory[historyIndex]
      ? sectionsHistory[historyIndex]
      : book.sections;

  const currentSec = currentSections[selectedSecIdx] || currentSections[0];

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < sectionsHistory.length - 1;

  // Helper to commit a new state to history and persist
  const commitNewSections = (newSections: SectionItem[]) => {
    const newHistory = sectionsHistory.slice(0, historyIndex + 1);
    const updatedHistory = [...newHistory, newSections];
    setSectionsHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    onUpdateBookSections(newSections);
  };

  const handleUndo = () => {
    if (!canUndo) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    onUpdateBookSections(sectionsHistory[nextIdx]);
    showToast('Ação desfeita');
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    onUpdateBookSections(sectionsHistory[nextIdx]);
    showToast('Ação refeita');
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input or textarea and standard undo is preferred
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else if (!isInput) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isInput) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canUndo, canRedo, historyIndex, sectionsHistory]);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => {
      setNotificationToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  if (!isOpen) return null;

  const modalBgClasses = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-[#181e26] text-slate-100 border-slate-700',
  }[theme];

  // ================= PARAGRAPH EDITING =================
  const handleStartEdit = (p: ParagraphItem) => {
    setEditingParagraphId(p.id);
    setEditingText(p.text);
  };

  const handleSaveEdit = (pId: string) => {
    if (editingText.trim()) {
      const updated = currentSections.map((sec, sIdx) => {
        if (sIdx !== selectedSecIdx) return sec;
        return {
          ...sec,
          paragraphs: sec.paragraphs.map((p) =>
            p.id === pId ? { ...p, text: editingText.trim() } : p
          ),
        };
      });
      commitNewSections(updated);
    }
    setEditingParagraphId(null);
  };

  const handleChangeType = (pId: string, newType: ParagraphType) => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.id === pId) {
            return {
              ...p,
              type: newType,
              isHeading: newType === 'heading',
              isQuote: newType === 'quote',
              isFootnote: newType === 'footnote',
              isHeaderFooter: newType === 'header_footer',
              isPrePostTextual: newType === 'pre_post_textual',
            };
          }
          return p;
        }),
      };
    });
    commitNewSections(updated);
  };

  // Move paragraph up or down in the section list
  const handleMoveParagraph = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      if (toIndex < 0 || toIndex >= sec.paragraphs.length) return sec;
      const newParas = [...sec.paragraphs];
      const [moved] = newParas.splice(fromIndex, 1);
      newParas.splice(toIndex, 0, moved);
      return {
        ...sec,
        paragraphs: newParas,
      };
    });
    commitNewSections(updated);
    showToast(direction === 'up' ? '⬆️ Bloco movido para cima' : '⬇️ Bloco movido para baixo');
  };

  // Move paragraph to top or bottom of section
  const handleMoveParagraphToExtremity = (fromIndex: number, position: 'top' | 'bottom') => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      const newParas = [...sec.paragraphs];
      const [moved] = newParas.splice(fromIndex, 1);
      if (position === 'top') {
        newParas.unshift(moved);
      } else {
        newParas.push(moved);
      }
      return {
        ...sec,
        paragraphs: newParas,
      };
    });
    commitNewSections(updated);
    showToast(position === 'top' ? '⬆️ Bloco movido para o início da seção' : '⬇️ Bloco movido para o fim da seção');
  };

  // Move paragraph to a specific page or index
  const handleMoveParagraphToPage = (fromIndex: number, targetPage: number) => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      const newParas = [...sec.paragraphs];
      const current = newParas[fromIndex];
      if (!current) return sec;

      // Update paragraph page
      const updatedPara = { ...current, page: targetPage };
      newParas.splice(fromIndex, 1);

      // Find first insertion index matching targetPage or append
      const targetIndex = newParas.findIndex((p) => (p.page || 1) >= targetPage);
      if (targetIndex === -1) {
        newParas.push(updatedPara);
      } else {
        newParas.splice(targetIndex, 0, updatedPara);
      }

      return {
        ...sec,
        paragraphs: newParas,
      };
    });
    commitNewSections(updated);
    showToast(`📄 Bloco reposicionado para a Página ${targetPage}`);
  };

  const handleDeleteParagraph = (pId: string) => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      const filtered = sec.paragraphs.filter((p) => p.id !== pId);
      return {
        ...sec,
        paragraphs: filtered.length > 0 ? filtered : [{ id: `p-${Date.now()}`, text: '', type: 'text' }],
      };
    });
    commitNewSections(updated);
    showToast('Parágrafo excluído');
  };

  // Toggle Non-Free flag for an individual paragraph
  const handleToggleParagraphNonFree = (pId: string) => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.id === pId) {
            const nextVal = !p.isNonFree;
            return {
              ...p,
              isNonFree: nextVal,
              includeInReading: nextVal ? false : undefined,
            };
          }
          return p;
        }),
      };
    });
    commitNewSections(updated);
    showToast('Status Não-Livre / Ignorado atualizado!');
  };

  // Toggle Non-Free flag for an entire page block
  const handleTogglePageNonFree = (pageNum: number, isNonFree: boolean) => {
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.page === pageNum) {
            return {
              ...p,
              isNonFree,
              includeInReading: isNonFree ? false : undefined,
            };
          }
          return p;
        }),
      };
    });
    commitNewSections(updated);
    showToast(`Página ${pageNum} marcada como ${isNonFree ? 'Não-Livre (Ignorada na narração)' : 'Livre (Ativa para narração)'}`);
  };

  // Toggle Non-Free flag for the entire Section
  const handleToggleSectionNonFree = () => {
    const nextNonFree = !currentSec?.isNonFree;
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      return {
        ...sec,
        isNonFree: nextNonFree,
        paragraphs: sec.paragraphs.map((p) => ({
          ...p,
          isNonFree: nextNonFree ? true : p.isNonFree,
        })),
      };
    });
    commitNewSections(updated);
    showToast(`Seção marcada como ${nextNonFree ? 'Não-Livre / Índice (Ignorada na narração)' : 'Livre (Ativa para narração)'}`);
  };

  // Add individual page directly to any chapter/section
  const handleAddPageSubmit = () => {
    if (!newPageContent.trim()) {
      showToast('⚠️ Digite ou cole o texto da página.');
      return;
    }

    const lines = newPageContent
      .split(/\n\s*\n|\r\n\s*\r\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newParagraphs: ParagraphItem[] = lines.map((line, lIdx) => {
      const probs = calculateParagraphProbabilities(line, calibrationWeights);
      return {
        id: `p-page-${newPageNumber}-${Date.now()}-${lIdx}`,
        page: newPageNumber,
        text: line,
        type: probs.dominantType,
        isHeading: probs.dominantType === 'heading',
        isFootnote: probs.dominantType === 'footnote',
        isQuote: probs.dominantType === 'quote',
        isHeaderFooter: probs.dominantType === 'header_footer',
        isPrePostTextual: probs.dominantType === 'pre_post_textual',
        isNonFree: newPageIsNonFree,
        includeInReading: newPageIsNonFree ? false : undefined,
      };
    });

    const targetIdx = newPageTargetChapterIdx;
    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== targetIdx) return sec;
      const combined = [...sec.paragraphs, ...newParagraphs];
      return {
        ...sec,
        paragraphs: combined,
      };
    });

    commitNewSections(updated);
    setSelectedSecIdx(targetIdx);
    setIsAddPageModalOpen(false);
    setNewPageContent('');
    setNewPageNumber((prev) => prev + 1);
    showToast(`📄 Página ${newPageNumber} adicionada com sucesso ao capítulo "${currentSections[targetIdx]?.partTitle}"!`);
  };

  // Re-run calibration and apply to all sections
  const handleApplyCalibrationToBook = () => {
    const result = reevaluateBookWithProbabilities(currentSections, calibrationWeights);
    commitNewSections(result.reinterpretedSections);
    setIsCalibrationOpen(false);
    showToast(
      `🎯 Calibração Aplicada: ${result.stats.totalEvaluated} parágrafos reavaliados (${result.stats.reclassifiedCount} reclassificados, ${result.stats.detectedNotesCount} notas, ${result.stats.detectedQuotesCount} citações)!`
    );
  };

  // ================= SMART RE-ANALYSIS & AUDIT =================
  const handleExecuteFullReanalysis = () => {
    let totalSplit = 0;
    let totalReclassified = 0;

    const updated = currentSections.map((sec) => {
      const newParas: ParagraphItem[] = [];

      for (const p of sec.paragraphs) {
        // Step 1: Check if running header or uppercase title is fused at start
        const splitRes = splitFusedRunningHeaders(p.text);
        if (splitRes.isSplit && splitRes.parts.length >= 2) {
          totalSplit++;
          const p1: ParagraphItem = {
            id: `p-audit-h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: splitRes.parts[0].text,
            page: p.page,
            type: splitRes.parts[0].isHeader ? 'header_footer' : 'pre_post_textual',
            isHeading: false,
            isFootnote: false,
            isQuote: false,
            isHeaderFooter: splitRes.parts[0].isHeader,
            isPrePostTextual: splitRes.parts[0].isPreTextual,
          };

          const p2: ParagraphItem = {
            id: `p-audit-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: splitRes.parts[1].text,
            page: p.page,
            type: 'text',
            isHeading: false,
            isFootnote: false,
            isQuote: false,
            isHeaderFooter: false,
            isPrePostTextual: false,
          };

          newParas.push(p1, p2);
          continue;
        }

        // Step 2: Probabilistic text classification for standalone patterns
        const trimmed = p.text.trim();
        let newType = p.type;

        // Header/Footer patterns (isolated page numbers, isbn, running heads)
        if (
          /^(p[áa]g\w*\.?\s*\d+|\d+\s*\/\s*\d+|p[áa]gina\s+\d+|page\s+\d+|\d+\s*[-–|•]\s*\d+)$/i.test(trimmed) ||
          (/^\d{1,4}$/.test(trimmed) && trimmed.length <= 4) ||
          /^(isbn\s*[\d\-Xx]+|issn\s*[\d\-Xx]+|doi:\s*10\.\d+)/i.test(trimmed)
        ) {
          newType = 'header_footer';
        } else if (
          /^(ficha\s+catalogr[áa]fica|dados\s+internacionais\s+de\s+cataloga[çc][ãa]o|sum[áa]rio|índice|ep[íi]grafe|dedicat[óo]ria|agradecimentos|bibliografia|ap[êe]ndice|anexo[s]?|gloss[áa]rio)\b/i.test(
            trimmed
          )
        ) {
          newType = 'pre_post_textual';
        } else if (
          /^\[\d+\]/i.test(trimmed) ||
          /^\(\d+\)/i.test(trimmed) ||
          (/^\d+\.\s{1,3}[A-ZÀ-Ú]/.test(trimmed) && trimmed.length < 350) ||
          /^(\*|†|‡)\s+/i.test(trimmed) ||
          /^(nota\s+(do\s+autor|do\s+tradutor|da\s+edi[çc][ãa]o|de\s+rodap[ée])|footnote|note:?)\b/i.test(trimmed)
        ) {
          newType = 'footnote';
        } else if (
          (trimmed.startsWith('“') && trimmed.endsWith('”')) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith('«') && trimmed.endsWith('»'))
        ) {
          newType = 'quote';
        }

        if (newType && newType !== p.type) {
          totalReclassified++;
          newParas.push({
            ...p,
            type: newType,
            isHeading: newType === 'heading',
            isFootnote: newType === 'footnote',
            isQuote: newType === 'quote',
            isHeaderFooter: newType === 'header_footer',
            isPrePostTextual: newType === 'pre_post_textual',
          });
        } else {
          newParas.push(p);
        }
      }

      return {
        ...sec,
        paragraphs: newParas,
      };
    });

    commitNewSections(updated);
    showToast(`⚡ Auditoria Concluída: ${totalSplit} cabeçalhos separados e ${totalReclassified} blocos reclassificados!`);
  };

  // ================= PARAGRAPH SPLITTING =================
  const handleOpenSplit = (p: ParagraphItem) => {
    setSplittingParagraphId(p.id);

    const detectedOptions: { label: string; part1: string; part2: string; type1: ParagraphType; type2: ParagraphType }[] = [];

    // 1. Check if typographical header transition exists
    const autoSplit = splitFusedRunningHeaders(p.text);
    if (autoSplit.isSplit && autoSplit.parts.length >= 2) {
      detectedOptions.push({
        label: '✂️ Transição de Caixa Alta / Cabeçalho',
        part1: autoSplit.parts[0].text,
        part2: autoSplit.parts[1].text,
        type1: autoSplit.parts[0].isHeader ? 'header_footer' : 'pre_post_textual',
        type2: 'text',
      });
      setSplitPart1Text(autoSplit.parts[0].text);
      setSplitPart2Text(autoSplit.parts[1].text);
      setSplitPart1Type(autoSplit.parts[0].isHeader ? 'header_footer' : 'pre_post_textual');
      setSplitPart2Type('text');
    }

    // 2. Option: Split at first sentence
    const firstSentenceMatch = p.text.match(/^([^.!?]+[.!?])\s+(.+)$/);
    if (firstSentenceMatch) {
      detectedOptions.push({
        label: '✂️ Primeira Frase (Ponto Final)',
        part1: firstSentenceMatch[1],
        part2: firstSentenceMatch[2],
        type1: 'text',
        type2: 'text',
      });
      if (!autoSplit.isSplit) {
        setSplitPart1Text(firstSentenceMatch[1]);
        setSplitPart2Text(firstSentenceMatch[2]);
        setSplitPart1Type('text');
        setSplitPart2Type('text');
      }
    }

    // 3. Option: Split at colon
    const colonMatch = p.text.match(/^([^:]+:)\s+(.+)$/);
    if (colonMatch) {
      detectedOptions.push({
        label: '✂️ Prefixo / Dois Pontos (:)',
        part1: colonMatch[1],
        part2: colonMatch[2],
        type1: 'pre_post_textual',
        type2: 'text',
      });
    }

    // Fallback if no specific rule matched
    if (detectedOptions.length === 0) {
      const mid = Math.floor(p.text.length / 2);
      const spaceIdx = p.text.indexOf(' ', mid);
      const cut = spaceIdx !== -1 ? spaceIdx : mid;
      const p1 = p.text.slice(0, cut).trim();
      const p2 = p.text.slice(cut).trim();
      detectedOptions.push({
        label: '✂️ Corte ao Meio',
        part1: p1,
        part2: p2,
        type1: 'text',
        type2: 'text',
      });
      setSplitPart1Text(p1);
      setSplitPart2Text(p2);
      setSplitPart1Type('text');
      setSplitPart2Type('text');
    }

    setSplitOptions(detectedOptions);
  };

  const handleApplySplitOption = (opt: { part1: string; part2: string; type1: ParagraphType; type2: ParagraphType }) => {
    setSplitPart1Text(opt.part1);
    setSplitPart2Text(opt.part2);
    setSplitPart1Type(opt.type1);
    setSplitPart2Type(opt.type2);
  };

  const handleSwapSplitParts = () => {
    const prevP1Text = splitPart1Text;
    const prevP2Text = splitPart2Text;
    const prevP1Type = splitPart1Type;
    const prevP2Type = splitPart2Type;
    setSplitPart1Text(prevP2Text);
    setSplitPart2Text(prevP1Text);
    setSplitPart1Type(prevP2Type);
    setSplitPart2Type(prevP1Type);
    showToast('Partes invertidas (Cima ⇋ Baixo)');
  };

  const handleParagraphMouseUp = (e: React.MouseEvent, p: ParagraphItem) => {
    if (editingParagraphId === p.id) return;
    const sel = window.getSelection();
    if (!sel) return;
    const selectedText = sel.toString().trim();
    if (selectedText && selectedText.length >= 1 && p.text.includes(selectedText)) {
      const startIndex = p.text.indexOf(selectedText);
      const endIndex = startIndex + selectedText.length;
      const textBefore = p.text.substring(0, startIndex).trim();
      const textAfter = p.text.substring(endIndex).trim();

      setSplittingParagraphId(p.id);

      // Determine smart initial division
      if (startIndex === 0 || textBefore.length === 0) {
        setSplitPart1Text(selectedText);
        setSplitPart2Text(textAfter || p.text);
        setSplitPart1Type('header_footer');
        setSplitPart2Type('text');
      } else {
        setSplitPart1Text(textBefore);
        setSplitPart2Text(selectedText + (textAfter ? ' ' + textAfter : ''));
        setSplitPart1Type('text');
        setSplitPart2Type('text');
      }

      setSplitOptions([
        {
          label: '⬆️ Seleção para CIMA (Cabeçalho/Não Lido) | Resto para BAIXO ⬇️',
          part1: selectedText,
          part2: (textBefore ? textBefore + ' ' : '') + textAfter,
          type1: 'header_footer',
          type2: 'text',
        },
        {
          label: '⬆️ Texto Anterior para CIMA | Seleção + Resto para BAIXO ⬇️',
          part1: textBefore || selectedText,
          part2: textBefore ? selectedText + (textAfter ? ' ' + textAfter : '') : textAfter,
          type1: 'text',
          type2: 'text',
        },
        {
          label: '⬆️ Seleção para CIMA (Título) | Resto para BAIXO ⬇️',
          part1: selectedText,
          part2: (textBefore ? textBefore + ' ' : '') + textAfter,
          type1: 'heading',
          type2: 'text',
        },
        {
          label: '⬆️ Seleção para CIMA (Nota de Rodapé) | Resto para BAIXO ⬇️',
          part1: selectedText,
          part2: (textBefore ? textBefore + ' ' : '') + textAfter,
          type1: 'footnote',
          type2: 'text',
        },
      ]);
    }
  };

  const handleWordClickSplit = (words: string[], clickIdx: number) => {
    if (clickIdx <= 0 || clickIdx >= words.length) return;
    const p1 = words.slice(0, clickIdx).join(' ').trim();
    const p2 = words.slice(clickIdx).join(' ').trim();
    if (p1 && p2) {
      setSplitPart1Text(p1);
      setSplitPart2Text(p2);
    }
  };

  const handleConfirmSplit = (originalPId: string) => {
    if (!splitPart1Text.trim() || !splitPart2Text.trim()) return;

    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      const targetIdx = sec.paragraphs.findIndex((p) => p.id === originalPId);
      if (targetIdx === -1) return sec;

      const origP = sec.paragraphs[targetIdx];
      const p1: ParagraphItem = {
        id: `p-split1-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: splitPart1Text.trim(),
        page: origP.page,
        type: splitPart1Type,
        isHeading: splitPart1Type === 'heading',
        isFootnote: splitPart1Type === 'footnote',
        isQuote: splitPart1Type === 'quote',
        isHeaderFooter: splitPart1Type === 'header_footer',
        isPrePostTextual: splitPart1Type === 'pre_post_textual',
      };

      const p2: ParagraphItem = {
        id: `p-split2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: splitPart2Text.trim(),
        page: origP.page,
        type: splitPart2Type,
        isHeading: splitPart2Type === 'heading',
        isFootnote: splitPart2Type === 'footnote',
        isQuote: splitPart2Type === 'quote',
        isHeaderFooter: splitPart2Type === 'header_footer',
        isPrePostTextual: splitPart2Type === 'pre_post_textual',
      };

      const nextParas = [
        ...sec.paragraphs.slice(0, targetIdx),
        p1,
        p2,
        ...sec.paragraphs.slice(targetIdx + 1),
      ];

      return {
        ...sec,
        paragraphs: nextParas,
      };
    });

    commitNewSections(updated);
    setSplittingParagraphId(null);
    showToast('Parágrafo dividido com sucesso em 2 blocos!');
  };

  // ================= PARAGRAPH MERGING =================
  const handleMergeParagraphs = (firstIdx: number, secondIdx: number) => {
    if (firstIdx < 0 || secondIdx >= currentSec.paragraphs.length) return;

    const p1 = currentSec.paragraphs[firstIdx];
    const p2 = currentSec.paragraphs[secondIdx];
    const mergedText = `${p1.text} ${p2.text}`.trim();

    const mergedP: ParagraphItem = {
      ...p1,
      text: mergedText,
    };

    const updated = currentSections.map((sec, sIdx) => {
      if (sIdx !== selectedSecIdx) return sec;
      const nextParas = [
        ...sec.paragraphs.slice(0, firstIdx),
        mergedP,
        ...sec.paragraphs.slice(secondIdx + 1),
      ];
      return {
        ...sec,
        paragraphs: nextParas,
      };
    });

    commitNewSections(updated);
    showToast('Parágrafos fundidos com sucesso!');
  };

  // ================= SECTION MERGING & SPLITTING =================
  const handleMergeSectionWithNext = () => {
    if (selectedSecIdx >= currentSections.length - 1) return;

    const nextSec = currentSections[selectedSecIdx + 1];
    const mergedParas = [...currentSec.paragraphs, ...nextSec.paragraphs];
    const wordCount = mergedParas.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);

    const mergedSection: SectionItem = {
      ...currentSec,
      partTitle: `${currentSec.partTitle} & ${nextSec.partTitle}`,
      durationEstimateMinutes: Math.max(1, Math.round(wordCount / 140)),
      paragraphs: mergedParas,
    };

    const updated = [
      ...currentSections.slice(0, selectedSecIdx),
      mergedSection,
      ...currentSections.slice(selectedSecIdx + 2),
    ];

    commitNewSections(updated);
    showToast('Seções fundidas com sucesso!');
  };

  const handleSplitSectionAtParagraph = (pIdx: number) => {
    if (pIdx <= 0 || pIdx >= currentSec.paragraphs.length) return;

    const firstPartParas = currentSec.paragraphs.slice(0, pIdx);
    const secondPartParas = currentSec.paragraphs.slice(pIdx);

    const sec1: SectionItem = {
      ...currentSec,
      partTitle: `${currentSec.partTitle} (Parte 1)`,
      paragraphs: firstPartParas,
    };

    const sec2: SectionItem = {
      ...currentSec,
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      chapterNumber: currentSec.chapterNumber + 1,
      chapterTitle: `Seção ${currentSec.chapterNumber + 1}`,
      partTitle: `${currentSec.partTitle} (Parte 2)`,
      paragraphs: secondPartParas,
    };

    const updated = [
      ...currentSections.slice(0, selectedSecIdx),
      sec1,
      sec2,
      ...currentSections.slice(selectedSecIdx + 1),
    ];

    commitNewSections(updated);
    showToast('Novo capítulo criado a partir deste ponto!');
  };

  const handleSaveSectionTitle = () => {
    if (secTitleInput.trim()) {
      const updated = currentSections.map((sec, sIdx) =>
        sIdx === selectedSecIdx ? { ...sec, partTitle: secTitleInput.trim() } : sec
      );
      commitNewSections(updated);
    }
    setEditingSectionTitle(false);
  };

  // ================= BATCH PATTERN PROPAGATION =================
  const handleOpenPatternPropagation = (sampleText: string, defaultType: ParagraphType = 'pre_post_textual') => {
    // Clean string to find recurring signature: remove trailing digits/page numbers
    const cleanPattern = sampleText
      .replace(/\b\d{1,4}\b/g, '')
      .replace(/^[\s—–:,-]+|[\s—–:,-]+$/g, '')
      .trim();

    setPropagationModal({
      isOpen: true,
      pattern: cleanPattern || sampleText.trim(),
      targetType: defaultType,
    });
  };

  const handleExecutePatternPropagation = () => {
    const rawPattern = propagationModal.pattern.trim();
    if (!rawPattern || rawPattern.length < 3) return;

    const normalizedPattern = rawPattern.toLowerCase().replace(/\s+/g, ' ');
    const targetType = propagationModal.targetType;

    let totalMatched = 0;
    let totalSplit = 0;

    const updated = currentSections.map((sec) => {
      const newParagraphs: ParagraphItem[] = [];

      for (const p of sec.paragraphs) {
        const textLower = p.text.toLowerCase().replace(/\s+/g, ' ');

        // Case A: standalone match (entire paragraph matches or contains mainly this pattern)
        if (textLower === normalizedPattern || (textLower.includes(normalizedPattern) && p.text.length < rawPattern.length + 25)) {
          totalMatched++;
          newParagraphs.push({
            ...p,
            type: targetType,
            isHeading: targetType === 'heading',
            isFootnote: targetType === 'footnote',
            isQuote: targetType === 'quote',
            isHeaderFooter: targetType === 'header_footer',
            isPrePostTextual: targetType === 'pre_post_textual',
          });
          continue;
        }

        // Case B: fused header at start of paragraph
        // e.g. "ROMEU E JULIETA E A ORIGEM DO EsTADO 137 as linhas da autoridade..."
        const patternIndex = textLower.indexOf(normalizedPattern);
        if (patternIndex === 0) {
          // Find boundary where pattern ends (and any trailing page numbers)
          const afterPattern = p.text.slice(rawPattern.length).trim();
          const pageNumMatch = afterPattern.match(/^(\d{1,4})\s+(.+)$/);

          let headerPart = rawPattern;
          let bodyPart = afterPattern;

          if (pageNumMatch) {
            headerPart = `${p.text.slice(0, rawPattern.length)} ${pageNumMatch[1]}`.trim();
            bodyPart = pageNumMatch[2].trim();
          }

          if (bodyPart.length > 5) {
            totalSplit++;
            totalMatched++;

            const pHeader: ParagraphItem = {
              id: `p-prop-h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: headerPart,
              page: p.page,
              type: targetType,
              isHeading: targetType === 'heading',
              isFootnote: targetType === 'footnote',
              isQuote: targetType === 'quote',
              isHeaderFooter: targetType === 'header_footer',
              isPrePostTextual: targetType === 'pre_post_textual',
            };

            const pBody: ParagraphItem = {
              id: `p-prop-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: bodyPart,
              page: p.page,
              type: 'text',
              isHeading: false,
              isFootnote: false,
              isQuote: false,
              isHeaderFooter: false,
              isPrePostTextual: false,
            };

            newParagraphs.push(pHeader, pBody);
            continue;
          }
        }

        // Fallthrough: unchanged
        newParagraphs.push(p);
      }

      return {
        ...sec,
        paragraphs: newParagraphs,
      };
    });

    commitNewSections(updated);
    setPropagationModal({ isOpen: false, pattern: '', targetType: 'pre_post_textual' });
    showToast(`⚡ ${totalMatched} ocorrências encontradas e classificadas em todo o livro!`);
  };

  return (
    <div
      id="section-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="section-editor-container"
        className={`w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${modalBgClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header with Undo/Redo & Global controls */}
        <div className="p-3 sm:p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/15 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg">
                Organizador & Editor de Estrutura
              </h3>
              <p className="text-xs opacity-75">
                {book.title} • {currentSections.length} {currentSections.length === 1 ? 'seção' : 'seções'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* MOUSE CUT MODE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => {
                setIsMouseCutMode((prev) => !prev);
                if (!isMouseCutMode) {
                  showToast('🖱️ Modo Corte com Mouse ATIVO: Selecione qualquer texto com o mouse para cortar.');
                }
              }}
              title="Ativar/Desativar seleção rápida com o mouse para cortar e dividir trechos"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
                isMouseCutMode
                  ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/50 animate-pulse'
                  : 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-800 dark:text-amber-300 border-amber-600/25'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cortar c/ Mouse</span>
            </button>

            {/* CALIBRATION OF DETECTION SYSTEM BUTTON */}
            <button
              type="button"
              onClick={() => setIsCalibrationOpen(true)}
              title="Calibrar pesos do motor probabilístico de detecção (Títulos, Cabeçalhos, Notas, Citações e Metadados PDF)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-900 dark:text-purple-200 border border-purple-500/30 text-xs font-bold transition shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Calibrar Sistema</span>
            </button>

            {/* FULL RE-ANALYSIS / AUDIT BUTTON */}
            <button
              type="button"
              onClick={handleExecuteFullReanalysis}
              title="Executar releitura e auditoria heurística em todo o livro (separa cabeçalhos colados e reclassifica notas/citações)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-bold transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden sm:inline">Releitura Inteligente</span>
            </button>

            {/* UNDO / REDO BUTTONS */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
              <button
                type="button"
                disabled={!canUndo}
                onClick={handleUndo}
                title="Desfazer alteração (Ctrl+Z)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  canUndo
                    ? 'hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-300'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desfazer</span>
              </button>

              <button
                type="button"
                disabled={!canRedo}
                onClick={handleRedo}
                title="Refazer alteração (Ctrl+Y)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  canRedo
                    ? 'hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-300'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refazer</span>
              </button>
            </div>

            {/* Footnotes Narration Switch */}
            {onToggleReadFootnotes && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-medium">
                <Bookmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Notas de Rodapé:</span>
                <button
                  type="button"
                  onClick={() => onToggleReadFootnotes(!readFootnotes)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition ${
                    readFootnotes
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {readFootnotes ? 'Lendo' : 'Omitir'}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Notification Toast */}
        {notificationToast && (
          <div className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-between shadow-md transition animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notificationToast}</span>
            </div>
            <button onClick={() => setNotificationToast(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Main Body: Sidebar (Sections) + Content (Paragraphs) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Sections List */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 flex flex-col shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-75">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-amber-600" />
                <span>Capítulos / Seções</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewPageTargetChapterIdx(selectedSecIdx);
                    setIsAddPageModalOpen(true);
                  }}
                  title="Adicionar página avulsa do texto a um capítulo"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-800 dark:text-amber-300 font-bold transition lowercase text-[10px]"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Página</span>
                </button>
                <span>{currentSections.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {currentSections.map((sec, idx) => {
                const isSelected = idx === selectedSecIdx;
                const wordCount = sec.paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);
                const hasNonFree = sec.isNonFree || sec.paragraphs.some((p) => p.isNonFree);

                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedSecIdx(idx);
                      setEditingSectionTitle(false);
                      setEditingParagraphId(null);
                      setSplittingParagraphId(null);
                      setPageHierarchyFilter('all');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col gap-1 border relative ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-semibold'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium flex items-center gap-1">
                        {sec.isNonFree && <Lock className="w-3 h-3 text-rose-300 shrink-0" />}
                        {sec.chapterTitle}
                      </span>
                      <span className="text-[10px] opacity-80">{sec.durationEstimateMinutes} min</span>
                    </div>
                    <div className="font-serif truncate opacity-90">{sec.partTitle}</div>
                    <div className="text-[10px] opacity-70 flex justify-between items-center">
                      <span>{sec.paragraphs.length} parágrafos</span>
                      <div className="flex items-center gap-1">
                        {hasNonFree && (
                          <span className="px-1 py-0.2 rounded bg-black/20 text-[9px] uppercase font-bold">
                            Ignorado/Não-Livre
                          </span>
                        )}
                        <span>{sec.pageRange}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Area: Selected Section Paragraphs & Classifications */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
            {/* Section Controls Bar */}
            <div className="p-3 sm:p-4 border-b border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-[200px]">
                {editingSectionTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={secTitleInput}
                      onChange={(e) => setSecTitleInput(e.target.value)}
                      placeholder="Nome do capítulo ou seção"
                      className="px-2.5 py-1 text-xs sm:text-sm font-serif rounded-lg border border-amber-500 bg-white dark:bg-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveSectionTitle}
                      className="px-2 py-1 bg-amber-600 text-white text-xs rounded-lg font-medium"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingSectionTitle(false)}
                      className="px-2 py-1 text-xs opacity-75"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-serif font-bold text-sm sm:text-base flex items-center gap-1.5">
                      {currentSec?.chapterTitle}: {currentSec?.partTitle}
                    </h4>
                    <button
                      onClick={() => {
                        setSecTitleInput(currentSec?.partTitle || '');
                        setEditingSectionTitle(true);
                      }}
                      title="Renomear título da seção"
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Section Non-Free Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleSectionNonFree}
                      title={
                        currentSec?.isNonFree
                          ? 'Esta seção está marcada como NÃO-LIVRE / ÍNDICE (omitida pelo narrador). Clique para torná-la livre.'
                          : 'Marcar esta seção inteira como NÃO-LIVRE / ÍNDICE / REFERÊNCIAS (será ignorada na narração)'
                      }
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                        currentSec?.isNonFree
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100 border-black/10 dark:border-white/10'
                      }`}
                    >
                      {currentSec?.isNonFree ? (
                        <>
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>Seção Ignorada (Não-Livre)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>Marcar como Não-Livre</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                <span className="text-[11px] opacity-60">
                  {currentSec?.paragraphs.length} parágrafos • {currentSec?.pageRange}
                </span>
              </div>

              {/* Section Actions: Add Page to this chapter & Merge with next */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setNewPageTargetChapterIdx(selectedSecIdx);
                    setIsAddPageModalOpen(true);
                  }}
                  title="Adicionar uma nova página avulsa a este capítulo"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Página</span>
                </button>

                {selectedSecIdx < currentSections.length - 1 && (
                  <button
                    onClick={handleMergeSectionWithNext}
                    title="Juntar esta seção com a próxima"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-800 dark:text-amber-300 border border-amber-600/30 text-xs font-semibold transition"
                  >
                    <Merge className="w-3.5 h-3.5" />
                    <span>Juntar com Próxima</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onSelectSection(selectedSecIdx);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold shadow transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Ler Seção</span>
                </button>
              </div>
            </div>

            {/* Paragraphs List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* PAGE HIERARCHY & BLOCK NAVIGATION BAR */}
              {(() => {
                const uniquePages = Array.from(
                  new Set<number>((currentSec?.paragraphs || []).map((p) => Number(p.page) || 1))
                ).sort((a, b) => a - b);

                return (
                  <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ListTree className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold font-serif">Hierarquia de Páginas / Blocos</span>
                        <span className="text-[11px] opacity-60">({uniquePages.length} {uniquePages.length === 1 ? 'página' : 'páginas'} neste capítulo)</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPageHierarchyFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            pageHierarchyFilter === 'all'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-black/5 dark:bg-white/5 opacity-75 hover:opacity-100'
                          }`}
                        >
                          Ver Todas as Páginas
                        </button>
                      </div>
                    </div>

                    {/* Page Pills with Non-Free quick toggle */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {uniquePages.map((pgNum) => {
                        const pageParas = currentSec.paragraphs.filter((p) => (p.page || 1) === pgNum);
                        const isPageAllNonFree = pageParas.length > 0 && pageParas.every((p) => p.isNonFree);
                        const isPageActiveFilter = pageHierarchyFilter === pgNum;

                        return (
                          <div
                            key={pgNum}
                            className={`flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-xl text-xs border transition ${
                              isPageActiveFilter
                                ? 'bg-amber-600/20 border-amber-600 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30'
                                : isPageAllNonFree
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-amber-500/40'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setPageHierarchyFilter(isPageActiveFilter ? 'all' : pgNum)}
                              className="font-medium flex items-center gap-1"
                            >
                              <span>Pág. {pgNum}</span>
                              <span className="text-[10px] opacity-60">({pageParas.length})</span>
                            </button>

                            {/* Page Non-Free Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePageNonFree(pgNum, !isPageAllNonFree);
                              }}
                              title={
                                isPageAllNonFree
                                  ? `Página ${pgNum} marcada como NÃO-LIVRE / ÍNDICE (ignorada na leitura). Clique para reativar.`
                                  : `Marcar toda a Página ${pgNum} como NÃO-LIVRE / ÍNDICE (será ignorada pelo leitor)`
                              }
                              className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                                isPageAllNonFree ? 'text-rose-600' : 'opacity-40 hover:opacity-100 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isPageAllNonFree ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Classification Info & Filter Legend */}
              <div className="p-3 rounded-xl bg-amber-600/10 dark:bg-amber-500/10 border border-amber-600/20 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Filtro de Narração & Ações nos Trechos</span>
                  </div>
                  <span className="text-[11px] font-normal opacity-75">
                    Dica: Use ✂️ para cortar cabeçalhos colados e 🔒 para marcar como Não-Livre (ignorado)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] opacity-90">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded font-bold bg-green-500/20 text-green-800 dark:text-green-300">
                      Narrados:
                    </span>
                    <span>[Título], [Texto] e [Citação]</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-800 dark:text-red-300">
                      Nunca Narrados:
                    </span>
                    <span>[Não-Livre/Índice], [Cabeçalho/Rodapé] e [Pré/Pós-Textual]</span>
                  </div>
                </div>
              </div>

              {currentSec?.paragraphs
                .filter((p) => pageHierarchyFilter === 'all' || (p.page || 1) === pageHierarchyFilter)
                .map((p, pIdx) => {
                const isEditing = editingParagraphId === p.id;
                const isSplitting = splittingParagraphId === p.id;

                const pType: ParagraphType =
                  p.type ||
                  (p.isHeaderFooter
                    ? 'header_footer'
                    : p.isPrePostTextual
                    ? 'pre_post_textual'
                    : p.isHeading
                    ? 'heading'
                    : p.isFootnote
                    ? 'footnote'
                    : p.isQuote
                    ? 'quote'
                    : 'text');

                const willBeRead =
                  p.isNonFree || currentSec.isNonFree
                    ? false
                    : pType === 'header_footer' || pType === 'pre_post_textual'
                    ? false
                    : pType === 'footnote'
                    ? readFootnotes
                    : true;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      p.isNonFree
                        ? 'bg-slate-500/10 border-dashed border-slate-500/40 opacity-75'
                        : pType === 'heading'
                        ? 'bg-amber-600/10 border-amber-600/30 font-bold'
                        : pType === 'quote'
                        ? 'bg-blue-500/5 border-blue-500/30 italic pl-5 border-l-4'
                        : pType === 'footnote'
                        ? 'bg-purple-500/5 border-purple-500/30 text-xs'
                        : pType === 'header_footer'
                        ? 'bg-rose-500/5 border-rose-500/30 opacity-60'
                        : pType === 'pre_post_textual'
                        ? 'bg-orange-500/5 border-orange-500/30 opacity-70'
                        : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/10 dark:border-white/10'
                    }`}
                  >
                    {/* Paragraph Header: Type Badges & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      {/* Classification Pills & Non-Free Toggle */}
                      <div className="flex flex-wrap items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                        {/* Non-Free / Ignored toggle for paragraph */}
                        <button
                          type="button"
                          onClick={() => handleToggleParagraphNonFree(p.id)}
                          title={
                            p.isNonFree
                              ? 'Trecho marcado como NÃO-LIVRE / ÍNDICE (ignorado na narração). Clique para liberar.'
                              : 'Marcar este trecho como NÃO-LIVRE / ÍNDICE (ignorado pelo narrador)'
                          }
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition ${
                            p.isNonFree
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'opacity-60 hover:opacity-100 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.isNonFree ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{p.isNonFree ? 'Não-Livre (Ignorado)' : 'Livre'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'heading')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'heading'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Heading className="w-3 h-3" />
                          <span>Título</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'text')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'text'
                              ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <AlignLeft className="w-3 h-3" />
                          <span>Texto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'quote')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'quote'
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Quote className="w-3 h-3" />
                          <span>Citação</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'footnote')}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'footnote'
                              ? 'bg-purple-600 text-white font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>Nota</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'header_footer')}
                          title="Cabeçalho, rodapé ou número de página (ignorado na narração)"
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'header_footer'
                              ? 'bg-rose-600 text-white font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Cabeçalho/Rodapé</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeType(p.id, 'pre_post_textual')}
                          title="Elemento pré/pós-textual (ignorado na narração)"
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            pType === 'pre_post_textual'
                              ? 'bg-orange-600 text-white font-bold shadow-xs'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>Pré/Pós-Textual</span>
                        </button>

                        {/* Batch Propagation Trigger */}
                        {(pType === 'pre_post_textual' || pType === 'header_footer' || pType === 'heading') && (
                          <button
                            type="button"
                            onClick={() => handleOpenPatternPropagation(p.text, pType)}
                            title="Buscar frases do mesmo padrão e classificar em todo o livro"
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold transition ml-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Propagar no Livro</span>
                          </button>
                        )}
                      </div>

                      {/* Narration Status Indicator & Action Tools */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            willBeRead
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 line-through opacity-80'
                          }`}
                        >
                          {willBeRead ? (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Voz Ativa</span>
                            </>
                          ) : (
                            <>
                              <VolumeX className="w-3 h-3" />
                              <span>Não Lido</span>
                            </>
                          )}
                        </div>

                        {/* REORDER / MOVE PARAGRAPH CONTROLS */}
                        <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg">
                          <button
                            type="button"
                            disabled={pIdx === 0}
                            onClick={() => handleMoveParagraph(pIdx, 'up')}
                            title="Mover este bloco para CIMA (reposicionar citação ou nota fora de ordem)"
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-amber-700 dark:text-amber-300 transition"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={pIdx === currentSec.paragraphs.length - 1}
                            onClick={() => handleMoveParagraph(pIdx, 'down')}
                            title="Mover este bloco para BAIXO (reposicionar citação ou nota fora de ordem)"
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-amber-700 dark:text-amber-300 transition"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* SPLIT PARAGRAPH BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenSplit(p)}
                          title="Dividir este parágrafo / cortar cabeçalho"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600/10 hover:bg-amber-600/20 text-amber-800 dark:text-amber-300 text-[11px] font-semibold transition"
                        >
                          <Scissors className="w-3.5 h-3.5 text-amber-600" />
                          <span>Cortar / Dividir</span>
                        </button>

                        {/* MERGE BUTTONS */}
                        {pIdx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMergeParagraphs(pIdx - 1, pIdx)}
                            title="Juntar com o parágrafo anterior"
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 text-[11px] transition"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {pIdx < currentSec.paragraphs.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMergeParagraphs(pIdx, pIdx + 1)}
                            title="Juntar com o próximo parágrafo"
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 text-[11px] transition"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {pIdx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSplitSectionAtParagraph(pIdx)}
                            title="Iniciar nova seção/capítulo a partir daqui"
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[11px] opacity-75 hover:opacity-100 transition"
                          >
                            <Split className="w-3 h-3 text-amber-600" />
                            <span>Nova Seção</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          title="Editar texto do parágrafo"
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteParagraph(p.id)}
                          title="Excluir este bloco"
                          className="p-1 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 opacity-75 hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* INTERACTIVE SPLIT SUB-PANEL */}
                    {isSplitting && (
                      <div className="mt-3 p-3 sm:p-4 rounded-xl border border-amber-500/50 bg-amber-500/5 space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <Scissors className="w-4 h-4 text-amber-600" />
                            <span>Dividir com o Mouse: Escolha o que vai para Cima ⬆️ e o que vai para Baixo ⬇️</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSplittingParagraphId(null)}
                            className="p-1 hover:bg-black/10 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive Click-on-Word Visual Cutter */}
                        <div className="p-2.5 rounded-xl border border-amber-500/30 bg-black/5 dark:bg-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <MousePointerClick className="w-3.5 h-3.5 text-amber-600" />
                              <span>Clique em qualquer palavra ou selecione com o mouse para cortar:</span>
                            </div>
                            <span className="text-[10px] opacity-75 hidden sm:inline">Palavras em Âmbar (Cima ⬆️) | Palavras em Azul (Baixo ⬇️)</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 text-xs font-serif leading-relaxed select-text cursor-pointer flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                            {p.text.split(' ').map((word, wIdx, allWords) => {
                              const isP1 = splitPart1Text && splitPart1Text.includes(word) && wIdx < (allWords.length * 0.7);
                              return (
                                <button
                                  key={wIdx}
                                  type="button"
                                  onClick={() => {
                                    const p1 = allWords.slice(0, wIdx + 1).join(' ').trim();
                                    const p2 = allWords.slice(wIdx + 1).join(' ').trim();
                                    if (p1 && p2) {
                                      setSplitPart1Text(p1);
                                      setSplitPart2Text(p2);
                                    }
                                  }}
                                  title={`Clique para cortar até aqui: "${word}"`}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-sans font-medium transition ${
                                    isP1
                                      ? 'bg-amber-500/25 text-amber-950 dark:text-amber-200 hover:bg-amber-500/40 border border-amber-500/30'
                                      : 'bg-blue-500/15 text-blue-950 dark:text-blue-200 hover:bg-blue-500/30 border border-blue-500/20'
                                  }`}
                                >
                                  {word}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick Presets / Inflexion Chips */}
                        {splitOptions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[11px] font-semibold opacity-70">Sugestões Rápidas:</span>
                            {splitOptions.map((opt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplySplitOption(opt)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition shadow-2xs"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Visual Split Cards: Part 1 (Up) & Part 2 (Down) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                          {/* Part 1 (Go Up) */}
                          <div className="space-y-1.5 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-200">
                                <MoveUp className="w-3.5 h-3.5 text-amber-600" />
                                <span>Parte de CIMA (⬆️ Bloco Superior)</span>
                              </span>
                              <select
                                value={splitPart1Type}
                                onChange={(e) => setSplitPart1Type(e.target.value as ParagraphType)}
                                className="px-2 py-0.5 rounded border border-black/20 dark:border-white/20 bg-white dark:bg-slate-800 text-[10px] font-medium"
                              >
                                <option value="header_footer">Cabeçalho/Rodapé (Não lido)</option>
                                <option value="pre_post_textual">Pré/Pós-Textual (Não lido)</option>
                                <option value="heading">Título (Lido)</option>
                                <option value="footnote">Nota de Rodapé</option>
                                <option value="text">Texto Normal (Lido)</option>
                              </select>
                            </div>
                            <textarea
                              value={splitPart1Text}
                              onChange={(e) => setSplitPart1Text(e.target.value)}
                              rows={3}
                              className="w-full p-2 text-xs font-serif rounded-lg border border-amber-500/50 bg-white dark:bg-slate-800 focus:outline-none"
                              placeholder="Texto que subirá para o bloco superior..."
                            />
                          </div>

                          {/* Swap Button (Floating or Centered) */}
                          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                              type="button"
                              onClick={handleSwapSplitParts}
                              title="Inverter: Parte de Cima vira Baixo e vice-versa"
                              className="p-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-md border-2 border-white dark:border-slate-800 transition transform hover:scale-110"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Part 2 (Go Down) */}
                          <div className="space-y-1.5 p-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold flex items-center gap-1 text-blue-900 dark:text-blue-200">
                                <MoveDown className="w-3.5 h-3.5 text-blue-600" />
                                <span>Parte de BAIXO (⬇️ Bloco Inferior)</span>
                              </span>
                              <select
                                value={splitPart2Type}
                                onChange={(e) => setSplitPart2Type(e.target.value as ParagraphType)}
                                className="px-2 py-0.5 rounded border border-black/20 dark:border-white/20 bg-white dark:bg-slate-800 text-[10px] font-medium"
                              >
                                <option value="text">Texto Normal (Lido)</option>
                                <option value="quote">Citação (Lida)</option>
                                <option value="footnote">Nota de Rodapé</option>
                                <option value="heading">Título (Lido)</option>
                              </select>
                            </div>
                            <textarea
                              value={splitPart2Text}
                              onChange={(e) => setSplitPart2Text(e.target.value)}
                              rows={3}
                              className="w-full p-2 text-xs font-serif rounded-lg border border-blue-500/50 bg-white dark:bg-slate-800 focus:outline-none"
                              placeholder="Texto que descerá para o bloco inferior..."
                            />
                          </div>
                        </div>

                        {/* Mobile Swap Button */}
                        <div className="flex md:hidden justify-center">
                          <button
                            type="button"
                            onClick={handleSwapSplitParts}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 dark:text-amber-200 text-xs font-semibold"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>Inverter Partes (Cima ⇋ Baixo)</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const res = splitFusedRunningHeaders(p.text);
                              if (res.isSplit) {
                                setSplitPart1Text(res.parts[0].text);
                                setSplitPart2Text(res.parts[1].text);
                                setSplitPart1Type('header_footer');
                                setSplitPart2Type('text');
                              }
                            }}
                            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Recalcular divisão automática</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSplittingParagraphId(null)}
                              className="px-3 py-1 text-xs opacity-75 hover:opacity-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmSplit(p.id)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirmar Divisão (Cima ⬆️ / Baixo ⬇️)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Content text / Edit Mode */}
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-amber-500 bg-white dark:bg-slate-800 text-xs font-serif leading-relaxed focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingParagraphId(null)}
                            className="px-3 py-1 rounded-lg text-xs opacity-75 hover:opacity-100"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveEdit(p.id)}
                            className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      !isSplitting && (
                        <p
                          onMouseUp={(e) => handleParagraphMouseUp(e, p)}
                          title="Selecione com o mouse para cortar ou classificar o trecho"
                          className={`text-xs sm:text-sm font-serif leading-relaxed text-justify opacity-90 select-text transition ${
                            isMouseCutMode
                              ? 'cursor-text ring-1 ring-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 p-2 rounded-lg'
                              : 'cursor-text'
                          }`}
                        >
                          {p.text}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DIALOG FOR BATCH PATTERN PROPAGATION */}
        {propagationModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div
              className={`w-full max-w-lg p-5 rounded-2xl shadow-2xl border ${modalBgClasses} space-y-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h4 className="font-serif font-bold text-base">
                    Localizar & Propagar Padrão no Livro
                  </h4>
                </div>
                <button
                  onClick={() =>
                    setPropagationModal({ isOpen: false, pattern: '', targetType: 'pre_post_textual' })
                  }
                  className="p-1 rounded-full hover:bg-black/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <p className="opacity-80">
                  O sistema localizará ocorrências deste texto repetitivo (cabeçalhos recorrentes, títulos ou números de página colados) em <strong>todas as seções do livro</strong>, separando-os automaticamente do texto principal.
                </p>

                <div className="space-y-1">
                  <label className="font-semibold block opacity-80">Texto ou Padrão a Localizar:</label>
                  <input
                    type="text"
                    value={propagationModal.pattern}
                    onChange={(e) =>
                      setPropagationModal((prev) => ({ ...prev, pattern: e.target.value }))
                    }
                    placeholder="Ex: ROMEU E JULIETA E A ORIGEM DO ESTADO"
                    className="w-full px-3 py-2 text-xs font-serif rounded-xl border border-amber-500 bg-white dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block opacity-80">Classificar todas as ocorrências como:</label>
                  <select
                    value={propagationModal.targetType}
                    onChange={(e) =>
                      setPropagationModal((prev) => ({
                        ...prev,
                        targetType: e.target.value as ParagraphType,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="pre_post_textual">Pré/Pós-Textual (Nunca lido pelo narrador)</option>
                    <option value="header_footer">Cabeçalho/Rodapé (Nunca lido pelo narrador)</option>
                    <option value="heading">Título / Capítulo (Lido pelo narrador)</option>
                    <option value="footnote">Nota de Rodapé</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                  ⚡ Ocorrências coladas no início de parágrafos serão automaticamente cortadas em 2 blocos, preservando a narração do texto subsequente. Esta ação pode ser desfeita a qualquer momento pelo botão <strong>Desfazer</strong>.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setPropagationModal({ isOpen: false, pattern: '', targetType: 'pre_post_textual' })
                  }
                  className="px-3 py-1.5 text-xs opacity-75 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutePatternPropagation}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aplicar em Todo o Livro</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG FOR SYSTEM CALIBRATION (Probabilistic Weights Adjustment) */}
        {isCalibrationOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div
              className={`w-full max-w-xl p-5 sm:p-6 rounded-2xl shadow-2xl border ${modalBgClasses} space-y-5`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <h4 className="font-serif font-bold text-base sm:text-lg">
                    Calibrar Sistema de Detecção Probabilística
                  </h4>
                </div>
                <button
                  onClick={() => setIsCalibrationOpen(false)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="opacity-80 leading-relaxed">
                  Ajuste os pesos e a sensibilidade do algoritmo para detectar cabeçalhos, rodapés, citações em recuo, notas explicativas e títulos com máxima precisão conforme a formatação deste livro:
                </p>

                <div className="space-y-3.5 bg-black/[0.03] dark:bg-white/[0.03] p-4 rounded-xl border border-black/5 dark:border-white/5">
                  {/* PDF Metadata / Headers weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Sensibilidade para Cabeçalhos / Rodapés / Nº Página:</span>
                      <span className="text-amber-600 font-mono font-bold">{calibrationWeights.pdfMetadataWeight.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={calibrationWeights.pdfMetadataWeight}
                      onChange={(e) =>
                        setCalibrationWeights((prev) => ({
                          ...prev,
                          pdfMetadataWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] opacity-60">
                      <span>Conservador (Menos exclusões)</span>
                      <span>Agressivo (Remove cabeçalhos colados)</span>
                    </div>
                  </div>

                  {/* Footnotes weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Detecção de Notas de Rodapé & Citações Acadêmicas:</span>
                      <span className="text-purple-600 font-mono font-bold">{calibrationWeights.footnoteWeight.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={calibrationWeights.footnoteWeight}
                      onChange={(e) =>
                        setCalibrationWeights((prev) => ({
                          ...prev,
                          footnoteWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  {/* Quotes weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Detecção de Citações / Diálogos em Destaque:</span>
                      <span className="text-blue-600 font-mono font-bold">{calibrationWeights.listQuoteWeight.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={calibrationWeights.listQuoteWeight}
                      onChange={(e) =>
                        setCalibrationWeights((prev) => ({
                          ...prev,
                          listQuoteWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Headings weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Detecção de Títulos e Subtítulos:</span>
                      <span className="text-amber-600 font-mono font-bold">{calibrationWeights.headingWeight.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={calibrationWeights.headingWeight}
                      onChange={(e) =>
                        setCalibrationWeights((prev) => ({
                          ...prev,
                          headingWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] opacity-75">
                  <button
                    type="button"
                    onClick={() => setCalibrationWeights(DEFAULT_CALIBRATION_WEIGHTS)}
                    className="underline hover:opacity-100"
                  >
                    Restaurar Pesos Padrão (1.0x)
                  </button>
                  <span>Aplica a todas as seções e parágrafos</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCalibrationOpen(false)}
                  className="px-3.5 py-1.5 text-xs opacity-75 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyCalibrationToBook}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aplicar Calibração no Livro</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG FOR ADDING INDIVIDUAL PAGE BY PAGE */}
        {isAddPageModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div
              className={`w-full max-w-lg p-5 rounded-2xl shadow-2xl border ${modalBgClasses} space-y-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="w-5 h-5 text-amber-600" />
                  <h4 className="font-serif font-bold text-base">
                    Adicionar Página Avulsa do Texto
                  </h4>
                </div>
                <button
                  onClick={() => setIsAddPageModalOpen(false)}
                  className="p-1 rounded-full hover:bg-black/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <p className="opacity-80">
                  Adicione o texto de uma página individual e atribua-a a qualquer capítulo ou bloco hierárquico:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold block opacity-80">Número da Página:</label>
                    <input
                      type="number"
                      min="1"
                      value={newPageNumber}
                      onChange={(e) => setNewPageNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block opacity-80">Inserir no Capítulo / Seção:</label>
                    <select
                      value={newPageTargetChapterIdx}
                      onChange={(e) => setNewPageTargetChapterIdx(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-slate-800 focus:outline-none truncate"
                    >
                      {currentSections.map((s, sI) => (
                        <option key={s.id} value={sI}>
                          {s.chapterTitle} - {s.partTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Non-Free Option for the added page */}
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      {newPageIsNonFree ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>Conteúdo Não-Livre / Índice / Referências</span>
                    </div>
                    <p className="text-[11px] opacity-70">
                      O narrador ignorará esta página durante a leitura em voz alta.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newPageIsNonFree}
                    onChange={(e) => setNewPageIsNonFree(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block opacity-80">Texto da Página:</label>
                  <textarea
                    rows={6}
                    value={newPageContent}
                    onChange={(e) => setNewPageContent(e.target.value)}
                    placeholder="Cole aqui o texto da página. Os parágrafos serão detectados e classificados automaticamente..."
                    className="w-full p-2.5 text-xs font-serif rounded-xl border border-amber-500 bg-white dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(false)}
                  className="px-3 py-1.5 text-xs opacity-75 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddPageSubmit}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Adicionar à Hierarquia</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
