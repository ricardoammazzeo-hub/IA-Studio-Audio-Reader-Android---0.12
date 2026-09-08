import { ParagraphItem, SectionItem, ParagraphType } from '../types';

export interface SentenceSplitResult {
  firstSentence: string;
  remainingText: string;
  hasMultipleSentences: boolean;
  terminator?: string;
}

export interface TransitionCandidate {
  id: string;
  type: 'broken_sentence' | 'footnote_continuation' | 'glued_header';
  fromSecIndex: number;
  fromParaIndex: number;
  fromParagraphId: string;
  fromText: string;
  fromPage?: number;
  toSecIndex: number;
  toParaIndex: number;
  toParagraphId: string;
  toText: string;
  toPage?: number;
  candidateSentence: string;
  remainingCandidateText: string;
  confidence: number;
  explanation: string;
}

/**
 * Splits text into the first sentence (up to the period/terminal punctuation) and the remaining text.
 * Smartly avoids splitting on common abbreviations like Dr., Sr., pág., cf., etc., or decimals like 3.14
 */
export function splitFirstSentence(rawText: string): SentenceSplitResult {
  const text = rawText.trim();
  if (!text) {
    return { firstSentence: '', remainingText: '', hasMultipleSentences: false };
  }

  // Common abbreviations regex
  const abbrevRegex = /\b(Dr|Dra|Sr|Sra|Prof|Profa|Obs|pág|p|pag|art|inc|fl|ex|etc|cf|cap|sec|vol|ed|vols|coord|org|n|núm|no|nr|op|cit|ibid|apud|i\.e|e\.g)\.$/i;

  // Find punctuation matches: '.', '!', '?', '…', followed by optional quotes/parentheses and whitespace or string end
  const pattern = /([.!?…]+["'”’»\)]?)(?:\s+|$)/g;
  let match: RegExpExecArray | null;
  let splitIndex = -1;
  let foundTerminator = '.';

  while ((match = pattern.exec(text)) !== null) {
    const termEndPos = match.index + match[1].length;
    const prefixSegment = text.substring(0, termEndPos);

    // Check if this period is just an abbreviation
    const wordsBefore = prefixSegment.split(/\s+/);
    const lastWord = wordsBefore[wordsBefore.length - 1];

    if (abbrevRegex.test(lastWord)) {
      // It is an abbreviation, keep looking for real sentence ending
      continue;
    }

    // Check if it's a decimal number like "3.5" or "1.0"
    if (match.index > 0 && /\d$/.test(text.substring(0, match.index)) && /^\.\d/.test(text.substring(match.index))) {
      continue;
    }

    splitIndex = termEndPos;
    foundTerminator = match[1];
    break;
  }

  if (splitIndex > 0 && splitIndex < text.length) {
    const firstSentence = text.substring(0, splitIndex).trim();
    const remainingText = text.substring(splitIndex).trim();
    return {
      firstSentence,
      remainingText,
      hasMultipleSentences: remainingText.length > 0,
      terminator: foundTerminator,
    };
  }

  // Entire block is a single sentence or has no terminal punctuation
  return {
    firstSentence: text,
    remainingText: '',
    hasMultipleSentences: false,
    terminator: undefined,
  };
}

/**
 * Helper to normalize paragraph type
 */
export function getNormalizedParagraphType(p: ParagraphItem): ParagraphType {
  if (p.isFootnote || p.type === 'footnote') return 'footnote';
  if (p.isQuote || p.type === 'quote') return 'quote';
  if (p.isHeading || p.type === 'heading') return 'heading';
  if (p.isHeaderFooter || p.type === 'header_footer') return 'header_footer';
  if (p.type === 'pre_post_textual') return 'pre_post_textual';
  return 'text';
}

/**
 * Transfers the first sentence of a paragraph (up to the period) to the previous paragraph,
 * seamlessly working both within the same section and across page/section boundaries.
 */
export function transferFirstSentenceToPrevious(
  sections: SectionItem[],
  currentSecIdx: number,
  currentParaIdx: number
): {
  updatedSections: SectionItem[];
  transferredSentence: string;
  remainingText: string;
  mergedWholeBlock: boolean;
  prevSecIdx: number;
  prevParaIdx: number;
} | null {
  if (!sections || currentSecIdx < 0 || currentSecIdx >= sections.length) return null;

  const currentSec = sections[currentSecIdx];
  if (!currentSec || !currentSec.paragraphs || currentParaIdx < 0 || currentParaIdx >= currentSec.paragraphs.length) return null;

  const currentPara = currentSec.paragraphs[currentParaIdx];
  if (!currentPara || !currentPara.text.trim()) return null;

  const targetType = getNormalizedParagraphType(currentPara);
  const isCurrentOmitted = !!currentPara.isNonFree;

  // Search backwards for the closest previous active paragraph
  let prevSecIdx = -1;
  let prevParaIdx = -1;

  // Pass 1: Look for exact same type
  for (let s = currentSecIdx; s >= 0; s--) {
    const sec = sections[s];
    if (!sec || !sec.paragraphs) continue;
    const startP = s === currentSecIdx ? currentParaIdx - 1 : sec.paragraphs.length - 1;

    for (let p = startP; p >= 0; p--) {
      const cand = sec.paragraphs[p];
      if (!cand || !cand.text.trim()) continue;

      if (!isCurrentOmitted && (cand.isNonFree || cand.type === 'header_footer' || cand.isHeaderFooter)) {
        continue;
      }

      const candType = getNormalizedParagraphType(cand);
      if (candType === targetType) {
        prevSecIdx = s;
        prevParaIdx = p;
        break;
      }
    }
    if (prevSecIdx !== -1) break;
  }

  // Pass 2: If no identical type found (e.g. cross-page text -> quote or general text), allow any valid reading block
  if (prevSecIdx === -1) {
    for (let s = currentSecIdx; s >= 0; s--) {
      const sec = sections[s];
      if (!sec || !sec.paragraphs) continue;
      const startP = s === currentSecIdx ? currentParaIdx - 1 : sec.paragraphs.length - 1;

      for (let p = startP; p >= 0; p--) {
        const cand = sec.paragraphs[p];
        if (!cand || !cand.text.trim()) continue;

        if (cand.isNonFree || cand.type === 'header_footer' || cand.isHeaderFooter) {
          continue;
        }

        prevSecIdx = s;
        prevParaIdx = p;
        break;
      }
      if (prevSecIdx !== -1) break;
    }
  }

  if (prevSecIdx === -1 || prevParaIdx === -1) {
    return null;
  }

  const { firstSentence, remainingText } = splitFirstSentence(currentPara.text);
  if (!firstSentence) return null;

  const updatedSections = sections.map((sec, sIdx) => {
    let newParas = [...sec.paragraphs];

    if (sIdx === prevSecIdx) {
      const prevP = newParas[prevParaIdx];
      if (prevP) {
        const combinedText = `${prevP.text.trim()} ${firstSentence}`.trim();
        newParas[prevParaIdx] = {
          ...prevP,
          text: combinedText,
        };
      }
    }

    if (sIdx === currentSecIdx) {
      if (remainingText.length > 0) {
        newParas[currentParaIdx] = {
          ...newParas[currentParaIdx],
          text: remainingText,
        };
      } else {
        // Entire block was transferred
        if (newParas.length > 1) {
          newParas.splice(currentParaIdx, 1);
        } else {
          newParas[currentParaIdx] = {
            ...newParas[currentParaIdx],
            text: '',
          };
        }
      }
    }

    const wordCount = newParas.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);
    return {
      ...sec,
      durationEstimateMinutes: Math.max(1, Math.round(wordCount / 140)),
      paragraphs: newParas.filter((p) => p.text.trim().length > 0 || newParas.length === 1),
    };
  });

  return {
    updatedSections,
    transferredSentence: firstSentence,
    remainingText,
    mergedWholeBlock: remainingText.length === 0,
    prevSecIdx,
    prevParaIdx,
  };
}

/**
 * Detects all page transition anomalies:
 * 1. Broken sentences cut across page/section boundaries
 * 2. Multi-page footnote continuations
 * 3. Incomplete trailing text fragments
 */
export function detectDocumentTransitions(sections: SectionItem[]): TransitionCandidate[] {
  const candidates: TransitionCandidate[] = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const paras = sec.paragraphs;

    for (let pIdx = 0; pIdx < paras.length; pIdx++) {
      const p = paras[pIdx];
      const pText = p.text.trim();
      if (!pText) continue;

      let nextSecIdx = sIdx;
      let nextParaIdx = pIdx + 1;

      if (nextParaIdx >= paras.length) {
        nextSecIdx = sIdx + 1;
        nextParaIdx = 0;
      }

      if (nextSecIdx >= sections.length) continue;
      const nextSec = sections[nextSecIdx];
      const nextP = nextSec.paragraphs[nextParaIdx];
      if (!nextP) continue;

      const nextText = nextP.text.trim();
      if (!nextText) continue;

      const isCrossPage = sIdx !== nextSecIdx || (p.page && nextP.page && p.page !== nextP.page);

      const endsWithoutPunctuation = !/[.!?…]["'”’»\)]?$/.test(pText);
      const endsWithHyphen = /[-–—]$/.test(pText);
      const endsWithCommaOrSemicolon = /[,;:]$/.test(pText);
      const startsWithLowercase = /^[a-zà-ú]/i.test(nextText) && nextText[0] === nextText[0].toLowerCase();
      const startsWithContinuationWord = /^(que|de|da|do|em|para|por|com|sem|e|ou|mas|porém|contudo|pois|porque|se|como|quando|onde)\b/i.test(
        nextText
      );

      const { firstSentence, remainingText } = splitFirstSentence(nextText);

      // Footnote continuation detection
      if (
        (p.type === 'footnote' || p.isFootnote) &&
        isCrossPage &&
        (endsWithoutPunctuation || startsWithLowercase) &&
        // Check that nextP is not another distinct footnote starting with a number
        !(/^(?:\[\d+\]|\(\d+\)|\d+\.\s|\d+\s)/.test(nextText))
      ) {
        candidates.push({
          id: `trans-fn-${sIdx}-${pIdx}-${nextSecIdx}-${nextParaIdx}`,
          type: 'footnote_continuation',
          fromSecIndex: nextSecIdx,
          fromParaIndex: nextParaIdx,
          fromParagraphId: nextP.id,
          fromText: nextText,
          fromPage: nextP.page,
          toSecIndex: sIdx,
          toParaIndex: pIdx,
          toParagraphId: p.id,
          toText: pText,
          toPage: p.page,
          candidateSentence: firstSentence,
          remainingCandidateText: remainingText,
          confidence: 90,
          explanation: 'Nota de rodapé cortada entre o fim de uma página e o início da próxima.',
        });
        continue;
      }

      // Broken Sentence detection
      if (
        (p.type === 'text' || !p.type) &&
        (nextP.type === 'text' || !nextP.type) &&
        isCrossPage &&
        (endsWithoutPunctuation || endsWithHyphen || endsWithCommaOrSemicolon || startsWithLowercase || startsWithContinuationWord)
      ) {
        let confidence = 50;
        if (endsWithHyphen) confidence += 40;
        if (startsWithLowercase) confidence += 30;
        if (startsWithContinuationWord) confidence += 20;
        if (endsWithoutPunctuation) confidence += 15;

        confidence = Math.min(99, confidence);

        candidates.push({
          id: `trans-bs-${sIdx}-${pIdx}-${nextSecIdx}-${nextParaIdx}`,
          type: 'broken_sentence',
          fromSecIndex: nextSecIdx,
          fromParaIndex: nextParaIdx,
          fromParagraphId: nextP.id,
          fromText: nextText,
          fromPage: nextP.page,
          toSecIndex: sIdx,
          toParaIndex: pIdx,
          toParagraphId: p.id,
          toText: pText,
          toPage: p.page,
          candidateSentence: firstSentence,
          remainingCandidateText: remainingText,
          confidence,
          explanation: `Sentença dividida pela virada de página (Confiança: ${confidence}%).`,
        });
      }
    }
  }

  return candidates;
}

/**
 * Automatically applies all high confidence transitions (confidence >= minConfidence)
 */
export function applyAllHighConfidenceTransitions(
  sections: SectionItem[],
  minConfidence: number = 70
): { updatedSections: SectionItem[]; joinedCount: number } {
  const candidates = detectDocumentTransitions(sections).filter((c) => c.confidence >= minConfidence);
  if (candidates.length === 0) {
    return { updatedSections: sections, joinedCount: 0 };
  }

  let currentSections = sections;
  let count = 0;

  for (const c of candidates) {
    const res = transferFirstSentenceToPrevious(currentSections, c.fromSecIndex, c.fromParaIndex);
    if (res) {
      currentSections = res.updatedSections;
      count++;
    }
  }

  return { updatedSections: currentSections, joinedCount: count };
}
