import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Check,
  Scissors,
  Trash2,
  Eye,
  Paintbrush,
  Layers,
  HelpCircle,
  RefreshCw,
  BookOpen,
  Hash,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Split,
  Save,
  Undo2,
  ExternalLink,
  Plus,
  MousePointer,
  CheckCircle2,
  EyeOff,
  Copy,
  ArrowRight,
  ArrowDown,
  Quote,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react';
import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions } from '../types';
import { logger } from '../utils/appLogger';
import {
  splitFirstSentence,
  transferFirstSentenceToPrevious,
  detectDocumentTransitions,
  applyAllHighConfidenceTransitions,
  TransitionCandidate,
} from '../utils/transitionParser';

interface DetectionCalibratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem;
  onRecalibrate: (options: CalibrationOptions) => void;
  onApplyGlobalAction: (
    term: string,
    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'
  ) => void;
  onUpdateBookSections?: (sections: SectionItem[]) => void;
  onAutoFixTransitions?: () => number;
  onOpenSectionEditor?: (sectionIndex?: number) => void;
}

type CalibratorTab = 'visual' | 'transitions' | 'rules';
type PaintTool = 'text' | 'heading' | 'quote' | 'footnote' | 'header_footer' | 'omit';
type InteractionMode = 'edit' | 'brush';

export const DetectionCalibratorModal: React.FC<DetectionCalibratorModalProps> = ({
  isOpen,
  onClose,
  book,
  onRecalibrate,
  onApplyGlobalAction,
  onUpdateBookSections,
  onAutoFixTransitions,
  onOpenSectionEditor,
}) => {
  // Active main tab in modal
  const [activeTab, setActiveTab] = useState<CalibratorTab>('visual');

  // Interaction mode in visual tab: 'edit' allows direct editing/split; 'brush' applies selected type on click
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('edit');
  const [selectedTool, setSelectedTool] = useState<PaintTool>('header_footer');

  // Selected sample page index
  const [selectedSamplePageIndex, setSelectedSamplePageIndex] = useState<number>(0);

  // Custom term for global fine cutter
  const [customTerm, setCustomTerm] = useState<string>('');

  // Calibration engine toggle switches
  const [stripRunningHeaders, setStripRunningHeaders] = useState<boolean>(true);
  const [splitFusedPageNumbers, setSplitFusedPageNumbers] = useState<boolean>(true);
  const [classifyFootnotes, setClassifyFootnotes] = useState<boolean>(true);
  const [usePdfBookmarks, setUsePdfBookmarks] = useState<boolean>(true);
  const [stripTopLines, setStripTopLines] = useState<boolean>(true);

  // Live editable working copy of the book's sections with history stack for undo
  const [localSections, setLocalSections] = useState<SectionItem[]>([]);
  const [sectionsHistory, setSectionsHistory] = useState<SectionItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Inline editing state for a paragraph
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Inline splitting state for a paragraph
  const [splittingParagraphId, setSplittingParagraphId] = useState<string | null>(null);
  const [splitPrefixText, setSplitPrefixText] = useState<string>('');
  const [splitRemainingText, setSplitRemainingText] = useState<string>('');
  const [splitPrefixType, setSplitPrefixType] = useState<ParagraphType>('header_footer');
  const [splitRemainingType, setSplitRemainingType] = useState<ParagraphType>('text');

  // Filter for transition candidates
  const [transitionFilter, setTransitionFilter] = useState<'all' | 'broken_sentence' | 'footnote_continuation'>('all');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };


  const applyGlobalRuleLocally = (
    cleanTerm: string,
    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'
  ) => {
    logger.edit('Calibration', `Aplicando regra global: "${cleanTerm}" -> ${action}`);
    let currentSections = [...localSections];
    currentSections = currentSections.map((sec) => {
      const newParas: ParagraphItem[] = [];
      for (const p of sec.paragraphs) {
        const text = p.text;
        if (!text.toLowerCase().includes(cleanTerm.toLowerCase())) {
          newParas.push(p);
          continue;
        }
        if (action === 'remove_term') {
          const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
          const regex = new RegExp(escaped, 'gi');
          const newText = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
          if (newText.length > 0) newParas.push({ ...p, text: newText });
        } else if (action === 'split_term') {
          const lowerText = text.toLowerCase();
          const lowerTerm = cleanTerm.toLowerCase();
          const idx = lowerText.indexOf(lowerTerm);
          if (idx !== -1) {
            const before = text.substring(0, idx).trim();
            const matched = text.substring(idx, idx + cleanTerm.length).trim();
            const after = text.substring(idx + cleanTerm.length).trim();
            if (before) newParas.push({ id: `p-pre-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: before, page: p.page, type: p.type });
            newParas.push({ id: `p-term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: matched, page: p.page, type: 'header_footer', isHeaderFooter: true, isNonFree: true });
            if (after) newParas.push({ id: `p-post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: after, page: p.page, type: p.type });
          } else {
            newParas.push(p);
          }
        } else if (action === 'mark_pretextual') {
          newParas.push({ ...p, type: 'pre_post_textual', isPrePostTextual: true, isNonFree: true });
        } else if (action === 'omit_block') {
          newParas.push({ ...p, isNonFree: true });
        } else if (action === 'mark_footnote') {
          newParas.push({ ...p, type: 'footnote', isFootnote: true });
        } else if (action === 'mark_quote') {
          newParas.push({ ...p, type: 'quote', isQuote: true });
        } else if (action === 'mark_heading') {
          newParas.push({ ...p, type: 'heading', isHeading: true });
        } else {
          newParas.push(p);
        }
      }
      return { ...sec, paragraphs: newParas };
    });
    commitSections(currentSections);
  };

  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);
  const [isLearningFromEdits, setIsLearningFromEdits] = useState(false);

  const handleLearnFromEdits = async () => {
    setIsLearningFromEdits(true);
    try {
      if (!localSections || localSections.length === 0) return;

      const allPages = Array.from(new Set(localSections.flatMap((s) => s.paragraphs.map((p) => p.page || 1)))).sort((a: any, b: any) => a - b);
      // Pega as primeiras 15 páginas onde o usuário possivelmente fez edições
      const samplePages = allPages.slice(0, 15);

      let editedSample = '';
      samplePages.forEach((pageNum) => {
        editedSample += `\n\n--- PAGE ${pageNum} ---\n\n`;
        localSections.forEach((sec) => {
          sec.paragraphs.filter(p => p.page === pageNum).forEach((p) => {
             const tags = [];
             if (p.isNonFree) tags.push('OMITIDO');
             if (p.isFootnote) tags.push('RODAPÉ');
             if (p.isHeading) tags.push('TÍTULO');
             if (p.isPrePostTextual) tags.push('PRÉ-TEXTUAL');
             
             const tagStr = tags.length > 0 ? `[${tags.join(', ')}]` : `[NORMAL]`;
             editedSample += `${tagStr} ${p.text}\n`;
          });
        });
      });

      const response = await fetch('/api/learn-from-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedSample }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Apply learned rules
      if (data.globalRules && Array.isArray(data.globalRules)) {
        for (const rule of data.globalRules) {
          if (rule.term && rule.action) {
            applyGlobalRuleLocally(rule.term, rule.action);
          }
        }
      }

      showToast('✨ Aprendizado concluído! Regras baseadas nas suas edições foram aplicadas.');
      onRecalibrate({
        stripRunningHeaders: data.calibrationOptions?.stripRunningHeaders ?? stripRunningHeaders,
        splitFusedPageNumbers: data.calibrationOptions?.splitFusedPageNumbers ?? splitFusedPageNumbers,
        classifyFootnotes: data.calibrationOptions?.classifyFootnotes ?? classifyFootnotes,
        stripTopLines: data.calibrationOptions?.stripTopLines ?? stripTopLines,
        usePdfBookmarks,
      });
    } catch (err: any) {
      showToast('❌ Erro no Aprendizado de IA: ' + err.message);
    } finally {
      setIsLearningFromEdits(false);
    }
  };


  const handleAutoCalibrateWithAI = async () => {
    logger.action('Calibration', `Iniciando auto-calibração AI (amostrando páginas)`);
    setIsCalibratingWithAI(true);
    try {
      if (!localSections || localSections.length === 0) return;

      const allPages = Array.from(new Set(localSections.flatMap((s) => s.paragraphs.map((p) => p.page || 1)))).sort((a: any, b: any) => a - b);
      const startIndex = Math.max(0, Math.floor(allPages.length * 0.1));
      
      // Combine first 5 pages + 10 pages from the middle to get a full picture of pre-textual vs textual
      const firstPages = allPages.slice(0, 5);
      const middlePages = allPages.slice(startIndex, startIndex + 10);
      const samplePages = Array.from(new Set([...firstPages, ...middlePages])).sort((a: any, b: any) => a - b);

      if (samplePages.length === 0) {
        showToast('⚠️ Documento muito curto para amostragem.');
        return;
      }

      let sampleText = '';
      samplePages.forEach((pageNum) => {
        sampleText += `\n\n--- PAGE ${pageNum} ---\n\n`;
        const paras = localSections.flatMap((s) => s.paragraphs).filter((p) => p.page === pageNum);
        paras.forEach((p) => {
          sampleText += p.text + '\n\n';
        });
      });

      const res = await fetch('/api/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na conexão com a IA');

      if (data.calibrationOptions) {
        setStripRunningHeaders(data.calibrationOptions.stripRunningHeaders ?? true);
        setSplitFusedPageNumbers(data.calibrationOptions.splitFusedPageNumbers ?? true);
        setClassifyFootnotes(data.calibrationOptions.classifyFootnotes ?? true);
        setStripTopLines(data.calibrationOptions.stripTopLines ?? true);
      }

            if (data.globalRules && Array.isArray(data.globalRules)) {
        for (const rule of data.globalRules) {
          if (rule.term && rule.action) {
            applyGlobalRuleLocally(rule.term, rule.action);
          }
        }
      }

      showToast('✨ Calibração Inteligente concluída! Parâmetros e regras aplicadas.');
      onRecalibrate({
        stripRunningHeaders: data.calibrationOptions?.stripRunningHeaders ?? true,
        splitFusedPageNumbers: data.calibrationOptions?.splitFusedPageNumbers ?? true,
        classifyFootnotes: data.calibrationOptions?.classifyFootnotes ?? true,
        stripTopLines: data.calibrationOptions?.stripTopLines ?? true,
        usePdfBookmarks,
      });
    } catch (err: any) {
      showToast('❌ Erro na Calibração IA: ' + err.message);
    } finally {
      setIsCalibratingWithAI(false);
    }
  };

  // Helper to commit new sections to local history & sync back to parent book
  const commitSections = (newSections: SectionItem[], msg?: string) => {
    const updatedHistory = [...sectionsHistory.slice(0, historyIndex + 1), newSections];
    setSectionsHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setLocalSections(newSections);
    if (onUpdateBookSections) {
      onUpdateBookSections(newSections);
    }
    if (msg) showToast(msg);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevSections = sectionsHistory[prevIdx];
      setHistoryIndex(prevIdx);
      setLocalSections(prevSections);
      if (onUpdateBookSections) {
        onUpdateBookSections(prevSections);
      }
      showToast('↩️ Ação desfeita');
    }
  };

  // Sync initial local state when modal opens
  useEffect(() => {
    if (isOpen && book && book.sections && book.sections.length > 0) {
      const cloned = JSON.parse(JSON.stringify(book.sections)) as SectionItem[];
      setLocalSections(cloned);
      setSectionsHistory([cloned]);
      setHistoryIndex(0);
      setEditingParagraphId(null);
      setSplittingParagraphId(null);

      // Auto-detect common recurring top header prefix across pages (e.g. "三国演义 26" or book title)
      const topLines: string[] = [];
      book.sections.forEach((s) => {
        if (s.paragraphs.length > 0) {
          const first = s.paragraphs[0].text.trim();
          if (first.length < 60) topLines.push(first);
        }
      });

      const cjkPattern = topLines.find((l) => /[\u4e00-\u9fa5]/.test(l));
      if (cjkPattern) {
        const match = cjkPattern.match(/^([\u4e00-\u9fa5\w\s]+)/);
        if (match) setCustomTerm(match[1].trim());
      } else if (topLines.length > 0) {
        const cleanFirst = topLines[0].replace(/\d+/g, '').trim();
        if (cleanFirst.length > 3) setCustomTerm(cleanFirst);
      }
    }
  }, [isOpen, book.id]);

  // Extract representative sample pages dynamically from localSections
  const samplePages = useMemo(() => {
    if (!localSections || localSections.length === 0) return [];

    const pages: {
      pageNum: number;
      sectionIndex: number;
      title: string;
      paragraphs: ParagraphItem[];
    }[] = [];
    const seenPages = new Set<number>();

    for (let sIdx = 0; sIdx < localSections.length; sIdx++) {
      const sec = localSections[sIdx];
      const pageGroups: Record<number, ParagraphItem[]> = {};

      sec.paragraphs.forEach((p) => {
        const pNum = p.page || 1;
        if (!pageGroups[pNum]) pageGroups[pNum] = [];
        pageGroups[pNum].push(p);
      });

      Object.entries(pageGroups).forEach(([pNumStr, paras]) => {
        const pNum = parseInt(pNumStr, 10);
        if (!seenPages.has(pNum)) {
          seenPages.add(pNum);
          pages.push({
            pageNum: pNum,
            sectionIndex: sIdx,
            title: sec.partTitle || sec.chapterTitle || `Página ${pNum}`,
            paragraphs: paras,
          });
        }
      });
    }

    return pages.slice(0, 25);
  }, [localSections]);

  // Detect all document transition candidates (broken sentences & footnote continuations)
  const transitionCandidates = useMemo(() => {
    if (!localSections || localSections.length === 0) return [];
    return detectDocumentTransitions(localSections);
  }, [localSections]);

  const filteredTransitions = useMemo(() => {
    if (transitionFilter === 'all') return transitionCandidates;
    return transitionCandidates.filter((c) => c.type === transitionFilter);
  }, [transitionCandidates, transitionFilter]);

  if (!isOpen) return null;

  const currentSample = samplePages[selectedSamplePageIndex] || samplePages[0];

  // 1. Direct paragraph type changer
  const handleChangeParagraphType = (
    targetSecIdx: number,
    paragraphId: string,
    newType: ParagraphType,
    isNonFree?: boolean
  ) => {
    const isHeading = newType === 'heading';
    const isQuote = newType === 'quote';
    const isFootnote = newType === 'footnote';
    const isHeaderFooter = newType === 'header_footer';
    const isPrePost = newType === 'pre_post_textual';

    const updated = localSections.map((sec, sIdx) => {
      if (sIdx !== targetSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          return {
            ...p,
            type: newType,
            isHeading,
            isQuote,
            isFootnote,
            isHeaderFooter: isHeaderFooter || isPrePost,
            isPrePostTextual: isPrePost || isHeaderFooter,
            isNonFree: isNonFree !== undefined ? isNonFree : isHeaderFooter || isPrePost ? true : false,
          };
        }),
      };
    });

    const typeNames: Record<ParagraphType, string> = {
      text: 'Texto Normal',
      heading: 'Título de Seção',
      quote: 'Citação em Bloco',
      footnote: 'Nota de Rodapé',
      header_footer: 'Cabeçalho / Topo',
      pre_post_textual: 'Elemento Pré-Textual',
    };

    commitSections(updated, `🏷️ Bloco reclassificado como ${typeNames[newType]}`);
  };

  // 2. Toggle omit / non-free reading
  const handleToggleOmit = (targetSecIdx: number, paragraphId: string) => {
    const updated = localSections.map((sec, sIdx) => {
      if (sIdx !== targetSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          const nextNonFree = !p.isNonFree;
          return {
            ...p,
            isNonFree: nextNonFree,
          };
        }),
      };
    });

    commitSections(updated, '👁️ Visibilidade de leitura alternada');
  };

  // 3. Save inline text edit
  const handleSaveTextEdit = (targetSecIdx: number, paragraphId: string) => {
    if (!editingText.trim()) {
      showToast('⚠️ O texto não pode ficar em branco');
      return;
    }

    const updated = localSections.map((sec, sIdx) => {
      if (sIdx !== targetSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          return {
            ...p,
            text: editingText.trim(),
          };
        }),
      };
    });

    commitSections(updated, '💾 Texto do parágrafo atualizado com sucesso!');
    setEditingParagraphId(null);
    setEditingText('');
  };

  // 4. Delete paragraph
  const handleDeleteParagraph = (targetSecIdx: number, paragraphId: string) => {
    const updated = localSections.map((sec, sIdx) => {
      if (sIdx !== targetSecIdx) return sec;
      return {
        ...sec,
        paragraphs: sec.paragraphs.filter((p) => p.id !== paragraphId),
      };
    });

    commitSections(updated, '🗑️ Parágrafo excluído');
    if (editingParagraphId === paragraphId) setEditingParagraphId(null);
    if (splittingParagraphId === paragraphId) setSplittingParagraphId(null);
  };

  // 5. Transfer first sentence to previous paragraph
  const handleTransferSentenceToPrevious = (targetSecIdx: number, pIdx: number) => {
    const res = transferFirstSentenceToPrevious(localSections, targetSecIdx, pIdx);
    if (!res) {
      showToast('⚠️ Não há parágrafo anterior disponível para anexar.');
      return;
    }

    commitSections(
      res.updatedSections,
      res.mergedWholeBlock
        ? '✂️ Bloco inteiro transferido para o parágrafo anterior!'
        : '✂️ 1ª Frase (até o ponto) enviada para o parágrafo anterior!'
    );
  };

  // 6. Open split tool for paragraph
  const handleOpenSplit = (p: ParagraphItem) => {
    setSplittingParagraphId(p.id);

    const text = p.text.trim();
    const prefixMatch = text.match(/^([\u4e00-\u9fa5\w\s.\-–—]{2,30}?\s*\d{1,4}|\d{1,4})\s+(.+)$/s);

    if (prefixMatch) {
      setSplitPrefixText(prefixMatch[1].trim());
      setSplitRemainingText(prefixMatch[2].trim());
      setSplitPrefixType('header_footer');
      setSplitRemainingType('text');
    } else {
      const firstLineBreak = text.indexOf('\n');
      if (firstLineBreak > 0) {
        setSplitPrefixText(text.slice(0, firstLineBreak).trim());
        setSplitRemainingText(text.slice(firstLineBreak).trim());
      } else {
        const { firstSentence, remainingText } = splitFirstSentence(text);
        if (remainingText) {
          setSplitPrefixText(firstSentence);
          setSplitRemainingText(remainingText);
        } else {
          const firstWords = text.split(/\s+/).slice(0, 3).join(' ');
          const remaining = text.slice(firstWords.length).trim();
          setSplitPrefixText(firstWords);
          setSplitRemainingText(remaining);
        }
      }
      setSplitPrefixType('header_footer');
      setSplitRemainingType('text');
    }
  };

  // 7. Confirm and apply split
  const handleConfirmSplit = (targetSecIdx: number, originalParagraph: ParagraphItem) => {
    if (!splitPrefixText.trim() || !splitRemainingText.trim()) {
      showToast('⚠️ Ambas as partes devem conter texto');
      return;
    }

    const updated = localSections.map((sec, sIdx) => {
      if (sIdx !== targetSecIdx) return sec;

      const newParas: ParagraphItem[] = [];
      for (const p of sec.paragraphs) {
        if (p.id === originalParagraph.id) {
          newParas.push({
            id: `p-spl1-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            page: p.page,
            text: splitPrefixText.trim(),
            type: splitPrefixType,
            isHeaderFooter: splitPrefixType === 'header_footer' || splitPrefixType === 'pre_post_textual',
            isPrePostTextual: splitPrefixType === 'pre_post_textual' || splitPrefixType === 'header_footer',
            isHeading: splitPrefixType === 'heading',
            isQuote: splitPrefixType === 'quote',
            isFootnote: splitPrefixType === 'footnote',
            isNonFree: splitPrefixType === 'header_footer' || splitPrefixType === 'pre_post_textual',
          });

          newParas.push({
            id: `p-spl2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            page: p.page,
            text: splitRemainingText.trim(),
            type: splitRemainingType,
            isHeaderFooter: splitRemainingType === 'header_footer' || splitRemainingType === 'pre_post_textual',
            isPrePostTextual: splitRemainingType === 'pre_post_textual' || splitRemainingType === 'header_footer',
            isHeading: splitRemainingType === 'heading',
            isQuote: splitRemainingType === 'quote',
            isFootnote: splitRemainingType === 'footnote',
            isNonFree: splitRemainingType === 'header_footer' || splitRemainingType === 'pre_post_textual',
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

    commitSections(updated, '✂️ Bloco dividido com sucesso em duas partes!');
    setSplittingParagraphId(null);
    setSplitPrefixText('');
    setSplitRemainingText('');
  };

  // 8. Brush mode click handler
  const handleBlockClickInBrushMode = (targetSecIdx: number, paragraphId: string) => {
    if (interactionMode !== 'brush') return;

    if (selectedTool === 'omit') {
      handleToggleOmit(targetSecIdx, paragraphId);
    } else {
      handleChangeParagraphType(targetSecIdx, paragraphId, selectedTool);
    }
  };

  // 9. Single transition candidate apply
  const handleApplyTransitionCandidate = (cand: TransitionCandidate) => {
    const res = transferFirstSentenceToPrevious(localSections, cand.toSecIndex, cand.toParaIndex);
    if (res) {
      commitSections(res.updatedSections, '✂️ Transição unida com sucesso!');
    }
  };

  // 10. Batch fix all high confidence transitions
  const handleBatchFixTransitions = () => {
    const res = applyAllHighConfidenceTransitions(localSections, 70);
    if (res.joinedCount > 0) {
      commitSections(res.updatedSections, `✨ ${res.joinedCount} transições quebradas foram unidas automaticamente!`);
    } else {
      showToast('ℹ️ Nenhuma transição com quebra pendente encontrada.');
    }
  };

  // 11. Run full re-calibration engine with options
  const handleRunFullCalibration = () => {
    onRecalibrate({
      stripRunningHeaders,
      splitFusedPageNumbers,
      classifyFootnotes,
      usePdfBookmarks,
      stripTopLines,
      customHeaderPattern: customTerm.trim() || undefined,
    });
    showToast('🚀 Livro recalibrado com sucesso com as novas regras!');
  };

  // Open full section editor shortcut
  const handleOpenEditorForCurrentSection = () => {
    if (onOpenSectionEditor && currentSample) {
      onOpenSectionEditor(currentSample.sectionIndex);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-6xl h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl overflow-hidden">
        {/* Toast feedback banner */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl animate-bounce flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">
                  Calibrador & Verificador de Padrões
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                  v0.8 Refined
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ajuste fino de notas de rodapé, títulos, citações, quebras de página e cabeçalhos em «{book.title}»
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'visual'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Amostragem & Edição</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transitions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition relative ${
                activeTab === 'transitions'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 rotate-180" />
              <span>Transições de Página</span>
              {transitionCandidates.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-extrabold ml-1">
                  {transitionCandidates.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Regras de Detecção</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo Action */}
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              title="Desfazer última alteração"
              className="px-2.5 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desfazer</span>
            </button>

            {/* Jump to Full Section Editor */}
            {onOpenSectionEditor && (
              <button
                type="button"
                onClick={handleOpenEditorForCurrentSection}
                title="Abrir esta seção no Editor Estrutural Completo"
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Editor Completo</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Depending on activeTab */}
        {activeTab === 'visual' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Panel: Tools, Pente Fino (5 cols) */}
            <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-700/80 overflow-y-auto space-y-5 bg-slate-900/95">
              {/* Mode Switch: Direct Edit / Split vs Painting Tool */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo de Interação nas Páginas</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInteractionMode('edit')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      interactionMode === 'edit'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edição Direta & Corte</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInteractionMode('brush')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      interactionMode === 'brush'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    <span>Pincel de Classificação</span>
                  </button>
                </div>
              </div>

              {/* Brush Palette (active if in brush mode) */}
              {interactionMode === 'brush' && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 animate-fadeIn">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Selecione a cor e clique no bloco na página:</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTool('header_footer')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'header_footer'
                          ? 'bg-rose-500/25 border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">Cabeçalho</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTool('text')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'text'
                          ? 'bg-blue-500/25 border-blue-500 text-blue-300 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">Texto Normal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTool('heading')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'heading'
                          ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">Título</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTool('quote')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'quote'
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">Citação</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTool('footnote')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'footnote'
                          ? 'bg-purple-500/25 border-purple-500 text-purple-300 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                      <span className="truncate">Nota Rodapé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTool('omit')}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        selectedTool === 'omit'
                          ? 'bg-slate-600/50 border-slate-400 text-slate-200 font-bold'
                          : 'bg-slate-900/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">Omitir/Ocultar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Global Fine Cutter (Pente Fino Global) */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4" />
                    <span>Pente Fino Global no Documento</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customTerm}
                    onChange={(e) => setCustomTerm(e.target.value)}
                    placeholder="Ex: Romance dos Três Reinos 26 ou Capítulo"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500 font-sans"
                  />

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={!customTerm.trim()}
                      onClick={() => {
                        applyGlobalRuleLocally(customTerm.trim(), 'split_term');
                        showToast(`✂️ Cabeçalho "${customTerm}" descolado de todos os blocos!`);
                      }}
                      className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold disabled:opacity-30 transition flex items-center justify-center gap-1.5"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Descolar do Texto</span>
                    </button>

                    <button
                      type="button"
                      disabled={!customTerm.trim()}
                      onClick={() => {
                        applyGlobalRuleLocally(customTerm.trim(), 'mark_heading');
                        showToast(`🏷️ Termo "${customTerm}" marcado como Título em todo o livro!`);
                      }}
                      className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold disabled:opacity-30 transition flex items-center justify-center gap-1.5"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Virar Título Global</span>
                    </button>

                    <button
                      type="button"
                      disabled={!customTerm.trim()}
                      onClick={() => {
                        applyGlobalRuleLocally(customTerm.trim(), 'remove_term');
                        showToast(`🗑️ Termo "${customTerm}" removido de todas as páginas!`);
                      }}
                      className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold disabled:opacity-30 transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Termo</span>
                    </button>

                    <button
                      type="button"
                      disabled={!customTerm.trim()}
                      onClick={() => {
                        applyGlobalRuleLocally(customTerm.trim(), 'omit_block');
                        showToast(`👁️ Blocos com "${customTerm}" marcados para não serem lidos!`);
                      }}
                      className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-bold disabled:opacity-30 transition flex items-center justify-center gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Omitir da Leitura</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs text-amber-200/90">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <HelpCircle className="w-4 h-4" />
                  <span>Dica de Uso & 1ª Frase</span>
                </div>
                <p>
                  Use o botão <strong>«1ª Frase»</strong> no cartão de cada parágrafo para puxar a primeira oração (até o ponto final) e anexar ao parágrafo/página anterior.
                </p>
              </div>
            </div>

            {/* Right Interactive Page View (7 cols) */}
            <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-950/90">
              {/* Sample Page Navigator */}
              <div className="p-3 sm:px-5 sm:py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedSamplePageIndex <= 0}
                    onClick={() => setSelectedSamplePageIndex((p) => Math.max(0, p - 1))}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-slate-300">
                    Amostra {selectedSamplePageIndex + 1} de {samplePages.length} ({currentSample?.title || 'Página'})
                  </span>

                  <button
                    type="button"
                    disabled={selectedSamplePageIndex >= samplePages.length - 1}
                    onClick={() => setSelectedSamplePageIndex((p) => Math.min(samplePages.length - 1, p + 1))}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  {currentSample?.paragraphs.length || 0} blocos nesta amostra
                </div>
              </div>

              {/* Scrollable list of paragraphs on this sample page */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
                {currentSample?.paragraphs.map((p, pIdx) => {
                  const targetSecIdx = currentSample.sectionIndex;
                  const isEditing = editingParagraphId === p.id;
                  const isSplitting = splittingParagraphId === p.id;

                  const isHeaderFooter = p.type === 'header_footer' || p.isHeaderFooter;
                  const isHeading = p.type === 'heading' || p.isHeading;
                  const isQuote = p.type === 'quote' || p.isQuote;
                  const isFootnote = p.type === 'footnote' || p.isFootnote;
                  const isOmitted = p.isNonFree;

                  const borderClasses = isOmitted
                    ? 'border-slate-700 bg-slate-900/40 text-slate-400 opacity-60'
                    : isHeaderFooter
                    ? 'border-rose-500/50 bg-rose-950/20 text-rose-100'
                    : isHeading
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-100 font-bold'
                    : isQuote
                    ? 'border-amber-500/50 bg-amber-950/20 text-amber-100 italic'
                    : isFootnote
                    ? 'border-purple-500/50 bg-purple-950/20 text-purple-100'
                    : 'border-blue-500/30 bg-slate-900/80 text-slate-200';

                  const badgeLabel = isOmitted
                    ? 'Omitido'
                    : isHeaderFooter
                    ? 'Cabeçalho / Topo'
                    : isHeading
                    ? 'Título'
                    : isQuote
                    ? 'Citação'
                    : isFootnote
                    ? 'Nota'
                    : 'Texto';

                  const badgeColor = isOmitted
                    ? 'bg-slate-700 text-slate-300'
                    : isHeaderFooter
                    ? 'bg-rose-600 text-white'
                    : isHeading
                    ? 'bg-emerald-600 text-white'
                    : isQuote
                    ? 'bg-amber-600 text-white'
                    : isFootnote
                    ? 'bg-purple-600 text-white'
                    : 'bg-blue-600 text-white';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleBlockClickInBrushMode(targetSecIdx, p.id)}
                      className={`relative p-3 sm:p-3.5 rounded-xl border transition-all ${borderClasses} ${
                        interactionMode === 'brush' ? 'cursor-pointer hover:border-amber-400' : ''
                      }`}
                    >
                      {/* Top Bar on each Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {badgeLabel}
                          </span>

                          {/* Quick Type Switchers */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangeParagraphType(targetSecIdx, p.id, 'header_footer');
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                                isHeaderFooter ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title="Marcar como Cabeçalho"
                            >
                              Topo
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangeParagraphType(targetSecIdx, p.id, 'text');
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                                !isHeaderFooter && !isHeading && !isQuote && !isFootnote && !isOmitted
                                  ? 'bg-blue-500 text-white font-bold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title="Marcar como Texto Normal"
                            >
                              Texto
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangeParagraphType(targetSecIdx, p.id, 'heading');
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                                isHeading ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title="Marcar como Título de Seção"
                            >
                              Título
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleOmit(targetSecIdx, p.id);
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                                isOmitted ? 'bg-slate-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title="Alternar Leitura / Omitir"
                            >
                              {isOmitted ? 'Omitido' : 'Omitir'}
                            </button>
                          </div>
                        </div>

                        {/* Action buttons: 1st sentence transfer, Edit Text, Split, Send to Fine Cutter, Delete */}
                        <div className="flex items-center gap-1">
                          {/* Transfer 1st sentence to previous paragraph */}
                          {(pIdx > 0 || targetSecIdx > 0) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransferSentenceToPrevious(targetSecIdx, pIdx);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
                              title="Puxar 1ª frase (até o ponto final) e anexar ao parágrafo anterior"
                            >
                              <Scissors className="w-3 h-3 rotate-180 text-amber-400" />
                              <span className="hidden sm:inline">1ª Frase</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEditing) {
                                setEditingParagraphId(null);
                              } else {
                                setEditingParagraphId(p.id);
                                setEditingText(p.text);
                                setSplittingParagraphId(null);
                              }
                            }}
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isEditing
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title="Editar texto deste parágrafo diretamente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSplitting) {
                                setSplittingParagraphId(null);
                              } else {
                                handleOpenSplit(p);
                                setEditingParagraphId(null);
                              }
                            }}
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isSplitting
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title="Dividir parágrafo / Descolar cabeçalho colado"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Dividir</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstWord = p.text.trim().split(/\s+/)[0] || '';
                              setCustomTerm(firstWord);
                              showToast(`📋 Termo "${firstWord}" copiado para o Pente Fino`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition"
                            title="Copiar início para o Pente Fino"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteParagraph(targetSecIdx, p.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                            title="Excluir este bloco"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* INLINE EDITING TEXTAREA */}
                      {isEditing ? (
                        <div className="space-y-2 mt-2 pt-2 border-t border-slate-700/80 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={4}
                            className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-amber-500/80 text-white font-serif focus:outline-hidden leading-relaxed shadow-inner"
                            placeholder="Edite o texto do parágrafo aqui..."
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingParagraphId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveTextEdit(targetSecIdx, p.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar Texto</span>
                            </button>
                          </div>
                        </div>
                      ) : isSplitting ? (
                        /* INLINE SPLITTING TOOL */
                        <div className="space-y-3 mt-2 pt-2 border-t border-amber-500/40 bg-amber-950/20 p-3 rounded-xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Dividir este parágrafo em duas partes:</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">1ª Parte (Início / Cabeçalho):</label>
                              <textarea
                                value={splitPrefixText}
                                onChange={(e) => setSplitPrefixText(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white font-serif focus:border-amber-400 focus:outline-hidden"
                              />
                              <select
                                value={splitPrefixType}
                                onChange={(e) => setSplitPrefixType(e.target.value as ParagraphType)}
                                className="w-full p-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                              >
                                <option value="header_footer">Cabeçalho / Topo (Omitido)</option>
                                <option value="heading">Título de Seção</option>
                                <option value="text">Texto Normal</option>
                                <option value="footnote">Nota de Rodapé</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">2ª Parte (Corpo do Texto):</label>
                              <textarea
                                value={splitRemainingText}
                                onChange={(e) => setSplitRemainingText(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white font-serif focus:border-amber-400 focus:outline-hidden"
                              />
                              <select
                                value={splitRemainingType}
                                onChange={(e) => setSplitRemainingType(e.target.value as ParagraphType)}
                                className="w-full p-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                              >
                                <option value="text">Texto Normal (Leitura)</option>
                                <option value="heading">Título de Seção</option>
                                <option value="quote">Citação em Bloco</option>
                                <option value="footnote">Nota de Rodapé</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSplittingParagraphId(null)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmSplit(targetSecIdx, p)}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aplicar Divisão</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Text Preview */
                        <p className="text-xs sm:text-sm font-serif leading-relaxed line-clamp-4">
                          {p.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Transitions & Broken Sentences */}
        {activeTab === 'transitions' && (
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-950">
            {/* Top Stats and Batch Apply Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-400 rotate-180" />
                    <span>Detector de Transições & Continuações entre Páginas</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                    {transitionCandidates.length} encontradas
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Localiza orações cortadas ao virar a página (terminadas sem ponto final) e notas de rodapé continuadas na página seguinte para junção limpa de áudio e leitura.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter buttons */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setTransitionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      transitionFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({transitionCandidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransitionFilter('broken_sentence')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      transitionFilter === 'broken_sentence' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sentenças
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransitionFilter('footnote_continuation')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      transitionFilter === 'footnote_continuation' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Notas
                  </button>
                </div>

                <button
                  type="button"
                  disabled={transitionCandidates.length === 0}
                  onClick={handleBatchFixTransitions}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unir Todas com Alta Confiança</span>
                </button>
              </div>
            </div>

            {/* List of Transition Candidates */}
            {filteredTransitions.length === 0 ? (
              <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-serif font-bold text-white text-base">
                  Nenhuma quebra de transição pendente
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Todas as páginas terminam com pontuação correta ou já tiveram suas sentenças unidas para a reprodução fluida do áudio.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransitions.map((cand, idx) => {
                  return (
                    <div
                      key={cand.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              cand.type === 'footnote_continuation'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {cand.type === 'footnote_continuation'
                              ? 'Continuação de Nota de Rodapé'
                              : 'Sentença Cortada na Virada de Página'}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {cand.confidence}% de confiança
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyTransitionCandidate(cand)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Scissors className="w-3.5 h-3.5 rotate-180" />
                          <span>Puxar 1ª Frase para Pág. {cand.fromPage}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 italic">
                        {cand.explanation}
                      </p>

                      {/* Visual Comparison Grid: From Block ➔ To Block (with highlighted 1st sentence) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Source Block (Page N) */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                            <span>Final da Página {cand.fromPage}</span>
                            <span className="text-rose-400">Sem ponto final</span>
                          </div>
                          <p className="text-xs font-serif text-slate-200 leading-relaxed">
                            «...{cand.fromText.slice(-140)}»
                          </p>
                        </div>

                        {/* Destination Block (Page N+1) */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                            <span>Início da Página {cand.toPage}</span>
                            <span>1ª Frase destacada</span>
                          </div>
                          <p className="text-xs font-serif text-slate-200 leading-relaxed">
                            <strong className="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded">
                              «{cand.candidateSentence}»
                            </strong>{' '}
                            <span className="opacity-60">
                              {cand.remainingCandidateText
                                ? `${cand.remainingCandidateText.slice(0, 80)}...`
                                : '(bloco inteiro)'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Calibration Rules & Presets */}
        {activeTab === 'rules' && (
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 bg-slate-950">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Regras de Detecção & Calibração Heurística</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ative ou desative as diretrizes automáticas de detecção estrutural de acordo com o padrão do documento.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 space-y-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Calibração Inteligente com Gemini IA</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  A Inteligência Artificial pode analisar a estrutura bruta do documento, ou <strong>aprender com as edições manuais</strong> que você fez na aba "Pente Fino".
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAutoCalibrateWithAI}
                    disabled={isCalibratingWithAI || isLearningFromEdits}
                    className="bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 border border-slate-700"
                  >
                    {isCalibratingWithAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isCalibratingWithAI ? 'Analisando...' : 'Auto-Calibrar Documento'}
                  </button>
                  <button
                    onClick={handleLearnFromEdits}
                    disabled={isCalibratingWithAI || isLearningFromEdits}
                    className="bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 shadow-md shadow-amber-900/20"
                  >
                    {isLearningFromEdits ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MousePointer className="w-3.5 h-3.5" />}
                    {isLearningFromEdits ? 'Aprendendo...' : 'Aprender das Minhas Edições'}
                  </button>
                </div>
              </div>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Footnote Rule */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Detecção de Notas de Rodapé</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={classifyFootnotes}
                    onChange={(e) => setClassifyFootnotes(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Regra:</strong> Notas sempre começam com número (ex: <code>1</code>, <code>[1]</code>, <code>¹</code>) seguido pelo texto na mesma linha. Na transição de página, se a nota não terminar com ponto final, o bloco inferior da página seguinte sem número é classificado como continuação.
                </p>
              </div>

              {/* Title Rule */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    <span>Detecção de Títulos & Capítulos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={stripTopLines}
                    onChange={(e) => setStripTopLines(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Regra:</strong> Títulos possuem tipografia destacada, caixa alta, caracteres delimitadores (ex: <code>* * *</code>, <code>===</code>, <code>#</code>) ou prefixos estruturais (ex: <code>Capítulo</code>, <code>Seção</code>, numerais romanos <code>IV</code>).
                </p>
              </div>

              {/* Citation Rule */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <Quote className="w-4 h-4 text-amber-400" />
                    <span>Detecção de Citações & Recuos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Regra:</strong> Citações apresentam orientação/recuo em relação ao texto normal, aspas proeminentes (<code>« »</code>, <code>“ ”</code>, <code>" "</code>) ou fórmulas de atribuição (<code>Segundo...</code>, <code>Conforme...</code>).
                </p>
              </div>

              {/* Header / Footer Rule */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                    <Bookmark className="w-4 h-4 text-rose-400" />
                    <span>Detecção de Cabeçalhos & Rodapés</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={stripRunningHeaders}
                    onChange={(e) => setStripRunningHeaders(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Regra:</strong> Elementos no topo e na base da página (números de página corridos, nome do livro no topo, ISBN, dados de copyright) são automaticamente isolados e omitidos da leitura.
                </p>
              </div>
            </div>

            {/* Run Full Engine Re-Calibrate Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleRunFullCalibration}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-Executar Calibração Completa no Livro</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
