import { ParagraphItem, ParagraphType, SectionItem, BookItem } from '../types';
import { splitFusedRunningHeaders } from './documentParser';

export interface ProbabilityScores {
  pText: number;
  pQuote: number;
  pFootnote: number;
  pHeading: number;
  pHeaderFooter: number;
  pPrePostTextual: number;
  dominantType: ParagraphType;
  dominantConfidence: number;
  reasons: string[];
}

export interface CalibrationWeights {
  pdfMetadataWeight: number;    // Weight for PDF running headers, page nums, publisher meta (0.2 to 2.0, default 1.0)
  textBodyWeight: number;       // Weight for main textual flow (0.2 to 2.0, default 1.0)
  listQuoteWeight: number;      // Weight for quotations, dialogues and lists (0.2 to 2.0, default 1.0)
  footnoteWeight: number;       // Weight for footnotes, citations and references (0.2 to 2.0, default 1.0)
  headingWeight: number;        // Weight for chapter and section headings (0.2 to 2.0, default 1.0)
}

export const DEFAULT_CALIBRATION_WEIGHTS: CalibrationWeights = {
  pdfMetadataWeight: 1.0,
  textBodyWeight: 1.0,
  listQuoteWeight: 1.0,
  footnoteWeight: 1.0,
  headingWeight: 1.0,
};

/**
 * Probabilistic scoring engine for document blocks and paragraphs
 * Considers PDF layout indicators, length, punctuation, uppercase ratios, and scholarly syntax
 */
export function calculateParagraphProbabilities(
  rawText: string,
  weights: CalibrationWeights = DEFAULT_CALIBRATION_WEIGHTS
): ProbabilityScores {
  const text = rawText.trim();
  const reasons: string[] = [];

  if (!text) {
    return {
      pText: 0,
      pQuote: 0,
      pFootnote: 0,
      pHeading: 0,
      pHeaderFooter: 1,
      pPrePostTextual: 0,
      dominantType: 'header_footer',
      dominantConfidence: 100,
      reasons: ['Texto vazio'],
    };
  }

  const length = text.length;
  const words = text.split(/\s+/);
  const wordCount = words.length;

  const upperCount = (text.match(/[A-ZÀ-Ú]/g) || []).length;
  const lowerCount = (text.match(/[a-zà-ú]/g) || []).length;
  const digitCount = (text.match(/[0-9]/g) || []).length;
  const totalLetters = upperCount + lowerCount;
  const upperRatio = totalLetters > 0 ? upperCount / totalLetters : 0;
  const digitRatio = length > 0 ? digitCount / length : 0;

  // Base priors
  let rawTextScore = 0.5;
  let rawQuoteScore = 0.05;
  let rawFootnoteScore = 0.05;
  let rawHeadingScore = 0.05;
  let rawHeaderFooterScore = 0.05;
  let rawPrePostScore = 0.05;

  // --- 1. HEADER / FOOTER & PDF METADATA PROBABILITIES ---
  if (
    /^(p[áa]g\w*\.?\s*\d+|\d+\s*\/\s*\d+|p[áa]gina\s+\d+|page\s+\d+|\d+\s*[-–|•]\s*\d+)$/i.test(text) ||
    (/^\d{1,4}$/.test(text) && length <= 4)
  ) {
    rawHeaderFooterScore += 0.85;
    reasons.push('Padrão numérico isolado de paginação/rodapé do PDF');
  }

  if (/^(isbn\s*[\d\-Xx]+|issn\s*[\d\-Xx]+|doi:\s*10\.\d+)/i.test(text)) {
    rawHeaderFooterScore += 0.9;
    reasons.push('Identificador formal (ISBN / ISSN / DOI)');
  }

  if (
    /^(direitos\s+reservados|todos\s+os\s+direitos|copyright\s*©|all\s+rights\s+reserved|printed\s+in|impresso\s+no|ed\w*\.\s*ltda)/i.test(
      text
    ) &&
    length < 160
  ) {
    rawHeaderFooterScore += 0.8;
    reasons.push('Metadados de publicação ou direitos autorais');
  }

  // Running header pattern (fused uppercase and short page number)
  if (/^[A-ZÀ-Ú0-9\s—–:,\.\-]{4,80}\s+\d{1,4}$/.test(text) && length < 95) {
    rawHeaderFooterScore += 0.75;
    reasons.push('Cabeçalho de topo de página do PDF (Running Header)');
  }

  // --- 2. PRE / POST TEXTUAL PROBABILITIES ---
  if (
    /^(ficha\s+catalogr[áa]fica|dados\s+internacionais\s+de\s+cataloga[çc][ãa]o|dedicat[óo]ria|agradecimentos|ep[íi]grafe|sum[áa]rio|índice\s+geral|índice\s+remissivo|refer[êe]ncias\s+bibliogr[áa]ficas|bibliografia|ap[êe]ndice|anexo[s]?|gloss[áa]rio|posf[áa]cio|sobre\s+o\s+autor|cr[ée]ditos|ficha\s+t[ée]cnica)\b/i.test(
      text
    )
  ) {
    rawPrePostScore += 0.8;
    reasons.push('Seção formal pré ou pós-textual');
  }

  // --- 3. HEADING / TITLE PROBABILITIES ---
  if (/^#{1,4}\s+/i.test(text)) {
    rawHeadingScore += 0.9;
    reasons.push('Marcação explícita de título Markdown');
  }

  if (
    /^(cap[ií]tulo|chapter|parte|part|se[çc][ãa]o|section|livro|book|volume|ensaio|artigo|introdu[çc][ãa]o|conclus[ãa]o|pref[áa]cio)\b/i.test(
      text
    ) &&
    length < 110
  ) {
    rawHeadingScore += 0.75;
    reasons.push('Palavra-chave estrutural de capítulo/título');
  }

  if (/^[IVXLCDM]+\.?\s+[A-ZÀ-Ú]/.test(text) && length < 80) {
    rawHeadingScore += 0.7;
    reasons.push('Numeração romana de divisão estrutural');
  }

  if (upperRatio > 0.75 && length >= 4 && length <= 85 && !/[.!?]$/.test(text)) {
    rawHeadingScore += 0.6;
    reasons.push('Texto em caixa alta sem pontuação terminal');
  }

  // --- 4. QUOTE / CITATION / DIALOGUE LIST PROBABILITIES ---
  if (
    text.startsWith('>') ||
    (text.startsWith('“') && text.includes('”')) ||
    (text.startsWith('"') && text.includes('"')) ||
    (text.startsWith('«') && text.includes('»')) ||
    (text.startsWith('‘') && text.endsWith('’'))
  ) {
    rawQuoteScore += 0.75;
    reasons.push('Delimitadores explícitos de citação (« », “ ”, " ")');
  }

  if (/^(citando|conforme|como\s+afirma|segundo|diz\s+o\s+autor)\s*:/i.test(text) && length > 50) {
    rawQuoteScore += 0.6;
    reasons.push('Fórmula de introdução de citação bibliográfica');
  }

  if (/^[—–-]\s+[A-ZÀ-Ú]/.test(text) && length < 300) {
    rawQuoteScore += 0.45;
    reasons.push('Travessão de diálogo ou listação');
  }

  // --- 5. FOOTNOTE / SCHOLARLY NOTE PROBABILITIES ---
  if (/^\[\d+\]/.test(text) || /^\(\d+\)/.test(text)) {
    rawFootnoteScore += 0.8;
    reasons.push('Marcador numérico entre colchetes/parênteses');
  }

  if (/^\d+\.\s{1,3}[A-ZÀ-Ú]/.test(text) && length < 350) {
    rawFootnoteScore += 0.65;
    reasons.push('Formato padrão de nota de rodapé numerada');
  }

  if (/^\d+\s+[A-ZÀ-Úa-z]/.test(text) && length < 500 && /^(?:Idem|Ibidem|Op\.?\scit|cf\.|ver\s|vide\s|in\s)/i.test(text.replace(/^\d+\s+/, ''))) {
    rawFootnoteScore += 0.85;
    reasons.push('Nota bibliográfica clássica iniciando com número');
  }

  if (/^(\d+)[-–—\s]+[A-ZÀ-Úa-z]/.test(text) && length < 350) {
    rawFootnoteScore += 0.5;
    reasons.push('Possível nota de rodapé com número e separador');
  }

  if (/^(\d+)[\s]+/.test(text) && length < 350 && upperRatio < 0.2) {
    rawFootnoteScore += 0.4;
    reasons.push('Possível nota começando apenas com um número');
  }

  if (/^(\*|†|‡)\s+/.test(text)) {
    rawFootnoteScore += 0.75;
    reasons.push('Símbolo canônico de nota de rodapé (*, †, ‡)');
  }

  if (
    /^(nota\s+(do\s+autor|do\s+tradutor|da\s+edi[çc][ãa]o|de\s+rodap[ée])|n\.?\s*t\.?|n\.?\s*a\.?|n\.?\s*e\.?|n\.?\s*r\.?|footnote|note:?)\b/i.test(
      text
    )
  ) {
    rawFootnoteScore += 0.85;
    reasons.push('Identificador textual explícito de nota (N. do T., N. do A.)');
  }

  if (/^(cf\.|ibid\.|op\.\s*cit\.|apud\b|passim\b|v\.\s*supra|v\.\s*infra)/i.test(text)) {
    rawFootnoteScore += 0.7;
    reasons.push('Expressão acadêmica em latim de citação/rodapé');
  }

  // --- 6. TEXT / BODY FLOW PROBABILITIES ---
  if (length > 120 && /[.!?]$/.test(text)) {
    rawTextScore += 0.4;
    reasons.push('Parágrafo longo com fechamento de sentença canônico');
  }

  if (wordCount >= 20 && upperRatio < 0.15 && digitRatio < 0.08) {
    rawTextScore += 0.45;
    reasons.push('Fluxo natural contínuo de prosa em minúsculas');
  }

  // Apply Calibration Weights
  const weightedHeader = rawHeaderFooterScore * weights.pdfMetadataWeight;
  const weightedPrePost = rawPrePostScore * weights.pdfMetadataWeight;
  const weightedHeading = rawHeadingScore * weights.headingWeight;
  const weightedQuote = rawQuoteScore * weights.listQuoteWeight;
  const weightedFootnote = rawFootnoteScore * weights.footnoteWeight;
  const weightedText = rawTextScore * weights.textBodyWeight;

  // Softmax normalization
  const total =
    weightedHeader +
    weightedPrePost +
    weightedHeading +
    weightedQuote +
    weightedFootnote +
    weightedText;

  const pHeaderFooter = Math.round((weightedHeader / total) * 100);
  const pPrePostTextual = Math.round((weightedPrePost / total) * 100);
  const pHeading = Math.round((weightedHeading / total) * 100);
  const pQuote = Math.round((weightedQuote / total) * 100);
  const pFootnote = Math.round((weightedFootnote / total) * 100);
  const pText = Math.max(0, 100 - (pHeaderFooter + pPrePostTextual + pHeading + pQuote + pFootnote));

  const scores = [
    { type: 'header_footer' as ParagraphType, p: pHeaderFooter },
    { type: 'pre_post_textual' as ParagraphType, p: pPrePostTextual },
    { type: 'heading' as ParagraphType, p: pHeading },
    { type: 'quote' as ParagraphType, p: pQuote },
    { type: 'footnote' as ParagraphType, p: pFootnote },
    { type: 'text' as ParagraphType, p: pText },
  ];

  scores.sort((a, b) => b.p - a.p);
  const dominant = scores[0];

  return {
    pText,
    pQuote,
    pFootnote,
    pHeading,
    pHeaderFooter,
    pPrePostTextual,
    dominantType: dominant.type,
    dominantConfidence: dominant.p,
    reasons,
  };
}

/**
 * Batch reinterprets all sections of a book using the Calibrated Probabilistic Engine
 */
export function reevaluateBookWithProbabilities(
  sections: SectionItem[],
  weights: CalibrationWeights = DEFAULT_CALIBRATION_WEIGHTS
): {
  reinterpretedSections: SectionItem[];
  stats: {
    totalEvaluated: number;
    reclassifiedCount: number;
    splitHeadersCount: number;
    detectedNotesCount: number;
    detectedQuotesCount: number;
    detectedHeadingsCount: number;
    detectedHeadersFootersCount: number;
  };
} {
  let totalEvaluated = 0;
  let reclassifiedCount = 0;
  let splitHeadersCount = 0;
  let detectedNotesCount = 0;
  let detectedQuotesCount = 0;
  let detectedHeadingsCount = 0;
  let detectedHeadersFootersCount = 0;

  const reinterpretedSections = sections.map((sec) => {
    const updatedParagraphs: ParagraphItem[] = [];

    for (const p of sec.paragraphs) {
      totalEvaluated++;
      const rawText = p.text.trim();
      if (!rawText) continue;

      // 1. Check for fused running headers / inflection points
      const splitRes = splitFusedRunningHeaders(rawText);
      if (splitRes.isSplit) {
        splitHeadersCount++;
        reclassifiedCount++;

        for (const part of splitRes.parts) {
          const probs = calculateParagraphProbabilities(part.text, weights);
          const assignedType = part.isHeader || part.isPreTextual ? 'header_footer' : probs.dominantType;

          if (assignedType === 'footnote') detectedNotesCount++;
          if (assignedType === 'quote') detectedQuotesCount++;
          if (assignedType === 'heading') detectedHeadingsCount++;
          if (assignedType === 'header_footer') detectedHeadersFootersCount++;

          updatedParagraphs.push({
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            page: p.page,
            text: part.text,
            type: assignedType,
            isHeading: assignedType === 'heading',
            isQuote: assignedType === 'quote',
            isFootnote: assignedType === 'footnote',
            isHeaderFooter: assignedType === 'header_footer',
            isPrePostTextual: assignedType === 'pre_post_textual',
          });
        }
        continue;
      }

      // 2. Probabilistic Reinterpretation of single block
      const probs = calculateParagraphProbabilities(rawText, weights);
      const newType = probs.dominantType;

      if (newType !== (p.type || 'text')) {
        reclassifiedCount++;
      }

      if (newType === 'footnote') detectedNotesCount++;
      if (newType === 'quote') detectedQuotesCount++;
      if (newType === 'heading') detectedHeadingsCount++;
      if (newType === 'header_footer') detectedHeadersFootersCount++;

      updatedParagraphs.push({
        ...p,
        type: newType,
        isHeading: newType === 'heading',
        isQuote: newType === 'quote',
        isFootnote: newType === 'footnote',
        isHeaderFooter: newType === 'header_footer',
        isPrePostTextual: newType === 'pre_post_textual',
      });
    }

    return {
      ...sec,
      paragraphs: updatedParagraphs.length > 0 ? updatedParagraphs : sec.paragraphs,
    };
  });

  return {
    reinterpretedSections,
    stats: {
      totalEvaluated,
      reclassifiedCount,
      splitHeadersCount,
      detectedNotesCount,
      detectedQuotesCount,
      detectedHeadingsCount,
      detectedHeadersFootersCount,
    },
  };
}
