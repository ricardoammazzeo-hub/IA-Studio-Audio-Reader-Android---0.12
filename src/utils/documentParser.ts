import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SectionItem, ParagraphItem, ParagraphType, BookmarkItem, ChapterSummary, CalibrationOptions } from '../types';
import {
  splitFirstSentence,
  transferFirstSentenceToPrevious,
  detectDocumentTransitions,
  applyAllHighConfidenceTransitions,
} from './transitionParser';

export {
  splitFirstSentence,
  transferFirstSentenceToPrevious,
  detectDocumentTransitions,
  applyAllHighConfidenceTransitions,
};

// Set up pdf.js worker URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ParsedBook {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  fileType: 'pdf' | 'docx' | 'epub' | 'txt' | 'custom';
  fileName: string;
  totalChapters: number;
  sections: SectionItem[];
  chaptersIndex?: ChapterSummary[];
  bookmarks?: BookmarkItem[];
}

/**
 * Helper to detect and split glued running headers / page numbers from body text
 * Supports Latin, CJK (Chinese/Japanese/Korean), Numbers and Fused Running Headings
 */
export function splitFusedRunningHeaders(rawText: string, customPattern?: string): {
  isSplit: boolean;
  parts: { text: string; isHeader?: boolean; isPreTextual?: boolean }[];
  splitIndex?: number;
  patternType?: 'header_page' | 'page_header' | 'cjk_header' | 'uppercase_transition' | 'prefix_label' | 'custom' | 'trailing_header';
} {
  const text = rawText.trim();
  if (!text || text.length < 4) return { isSplit: false, parts: [{ text }] };

  // 0. Custom user pattern if provided
  if (customPattern) {
    try {
      const regex = new RegExp(`^(${customPattern})\\s*(.+)$`, 'i');
      const match = text.match(regex);
      if (match) {
        return {
          isSplit: true,
          splitIndex: match[1].length,
          patternType: 'custom',
          parts: [
            { text: match[1].trim(), isHeader: true, isPreTextual: true },
            { text: match[2].trim(), isHeader: false },
          ],
        };
      }
    } catch (e) {}
  }

  // 1. CJK or Mixed Running Header with Page Number / Title (e.g. "三国演义 26 云紫云之祥..." or "三国演义26 云紫云之祥...")
  const cjkHeaderMatch = text.match(
    /^([\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\w\s—–:,\.\-]{2,35}\s*\d{1,4})\s+([\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\w].+)$/
  );
  if (cjkHeaderMatch) {
    const candidateHeader = cjkHeaderMatch[1].trim();
    const candidateBody = cjkHeaderMatch[2].trim();
    if (candidateHeader.length >= 3 && candidateBody.length >= 2) {
      return {
        isSplit: true,
        splitIndex: candidateHeader.length,
        patternType: 'cjk_header',
        parts: [
          { text: candidateHeader, isHeader: true, isPreTextual: true },
          { text: candidateBody, isHeader: false },
        ],
      };
    }
  }

  // 2. Pattern: [ALL CAPS / TITLE + PAGE NUMBER] followed immediately by [sentence start / lowercase]
  // E.g.: "ROMEU E JULIETA E A ORIGEM DO EsTADO 137 as linhas da autoridade..."
  const headerPageMatch = text.match(
    /^([A-ZÀ-Ú0-9\s—–:,\.\-]{3,90}\s+\d{1,4})\s+([a-zà-úA-Z].+)$/
  );
  if (headerPageMatch) {
    const candidateHeader = headerPageMatch[1].trim();
    const candidateBody = headerPageMatch[2].trim();

    const upperCount = (candidateHeader.match(/[A-ZÀ-Ú]/g) || []).length;
    const letterCount = (candidateHeader.match(/[a-zA-ZÀ-Úà-ú]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.4 && candidateBody.length > 3) {
      return {
        isSplit: true,
        splitIndex: candidateHeader.length,
        patternType: 'header_page',
        parts: [
          { text: candidateHeader, isHeader: true, isPreTextual: true },
          { text: candidateBody, isHeader: false },
        ],
      };
    }
  }

  // 3. Pattern: [PAGE NUMBER + ALL CAPS / TITLE] followed by text
  // E.g.: "137 ROMEU E JULIETA E A ORIGEM DO ESTADO as linhas da autoridade..."
  const pageHeaderMatch = text.match(
    /^(\d{1,4}\s+[A-ZÀ-Ú0-9\s—–:,\.\-]{3,90})\s+([a-zà-úA-Z].+)$/
  );
  if (pageHeaderMatch) {
    const candidateHeader = pageHeaderMatch[1].trim();
    const candidateBody = pageHeaderMatch[2].trim();
    const upperCount = (candidateHeader.match(/[A-ZÀ-Ú]/g) || []).length;
    const letterCount = (candidateHeader.match(/[a-zA-ZÀ-Úà-ú]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.4 && candidateBody.length > 3) {
      return {
        isSplit: true,
        splitIndex: candidateHeader.length,
        patternType: 'page_header',
        parts: [
          { text: candidateHeader, isHeader: true, isPreTextual: true },
          { text: candidateBody, isHeader: false },
        ],
      };
    }
  }

  // 4. Typographical Inflexion Point: Transition from contiguous UPPERCASE header words to lowercase / mixed sentence
  // E.g.: "A ORIGEM DO ESTADO MODERNO No início do século XVI a Itália..."
  const words = text.split(/\s+/);
  if (words.length >= 3) {
    let upperWordCount = 0;

    for (let i = 0; i < Math.min(words.length - 1, 14); i++) {
      const w = words[i].replace(/[^\wÀ-ú]/g, '');
      const isWordUpper = w.length > 0 && w === w.toUpperCase() && !/^\d+$/.test(w);
      const isWordNum = /^\d+$/.test(w);

      if (isWordUpper || isWordNum) {
        upperWordCount++;
      } else {
        // Point where uppercase sequence ends
        if (upperWordCount >= 2 && i >= 2) {
          const headerSegment = words.slice(0, i).join(' ').trim();
          const bodySegment = words.slice(i).join(' ').trim();
          if (headerSegment.length >= 6 && bodySegment.length >= 8) {
            return {
              isSplit: true,
              splitIndex: headerSegment.length,
              patternType: 'uppercase_transition',
              parts: [
                { text: headerSegment, isHeader: true, isPreTextual: true },
                { text: bodySegment, isHeader: false },
              ],
            };
          }
        }
        break;
      }
    }
  }

  // 5. Pattern: [Common pre-textual keywords / sections] followed by text
  const preTextualPrefixMatch = text.match(
    /^(ficha\s+catalogr[áa]fica|dados\s+internacionais\s+de\s+cataloga[çc][ãa]o|sum[áa]rio|índice|ep[íi]grafe|dedicat[óo]ria|agradecimentos|pref[áa]cio\s+do\s+autor|nota\s+do\s+editor)[\s:—–]+(.+)$/i
  );
  if (preTextualPrefixMatch && text.length > 25) {
    const prefix = preTextualPrefixMatch[1].trim();
    const body = preTextualPrefixMatch[2].trim();
    return {
      isSplit: true,
      splitIndex: prefix.length,
      patternType: 'prefix_label',
      parts: [
        { text: prefix, isHeader: true, isPreTextual: true },
        { text: body, isHeader: false, isPreTextual: true },
      ],
    };
  }

  // 6. Pattern: Glued trailing header at the end of paragraph
  const trailingHeaderMatch = text.match(
    /^(.+[.!?])\s+([A-ZÀ-Ú0-9\s—–:,\.\-]{3,85}\s+\d{1,4})$/
  );
  if (trailingHeaderMatch) {
    const candidateBody = trailingHeaderMatch[1].trim();
    const candidateHeader = trailingHeaderMatch[2].trim();
    const upperCount = (candidateHeader.match(/[A-ZÀ-Ú]/g) || []).length;
    const letterCount = (candidateHeader.match(/[a-zA-ZÀ-Úà-ú]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.4 && candidateBody.length > 8) {
      return {
        isSplit: true,
        splitIndex: candidateBody.length,
        patternType: 'trailing_header',
        parts: [
          { text: candidateBody, isHeader: false },
          { text: candidateHeader, isHeader: true, isPreTextual: true },
        ],
      };
    }
  }

  return { isSplit: false, parts: [{ text }] };
}

/**
 * Smart paragraph classification (Heading, Text, Quote, Footnote, Header/Footer, Pre/Post-Textual)
 */
export function classifyParagraph(text: string, forceHeading = false): {
  type: ParagraphType;
  isHeading: boolean;
  isFootnote: boolean;
  isQuote: boolean;
  isHeaderFooter: boolean;
  isPrePostTextual: boolean;
} {
  const trimmed = text.trim();

  // 1. Check if Header / Footer / Page number / ISBN / Running Head pattern
  const isHeaderFooterPattern =
    /^(p[áa]g\w*\.?\s*\d+|\d+\s*\/\s*\d+|p[áa]gina\s+\d+|page\s+\d+|\d+\s*[-–|•]\s*\d+)$/i.test(trimmed) ||
    (/^\d{1,4}$/.test(trimmed) && trimmed.length <= 4) ||
    /^(isbn\s*[\d\-Xx]+|issn\s*[\d\-Xx]+|doi:\s*10\.\d+)/i.test(trimmed) ||
    (/^(direitos\s+reservados|todos\s+os\s+direitos|copyright\s*©|all\s+rights\s+reserved|printed\s+in|impresso\s+no)/i.test(trimmed) && trimmed.length < 120);

  if (isHeaderFooterPattern) {
    return {
      type: 'header_footer',
      isHeading: false,
      isFootnote: false,
      isQuote: false,
      isHeaderFooter: true,
      isPrePostTextual: false,
    };
  }

  // 2. Check if Pre or Post-textual element (Ficha catalográfica, Dedicatória, Epígrafe, Agradecimentos, Bibliografia, Índice, Sumário, Apêndice, Anexo, Glossário, Ficha Técnica)
  const isPrePostTextualPattern =
    /^(ficha\s+catalogr[áa]fica|dados\s+internacionais\s+de\s+cataloga[çc][ãa]o|dedicat[óo]ria|agradecimentos|ep[íi]grafe|sum[áa]rio|índice\s+geral|índice\s+remissivo|lista\s+de\s+(figuras|tabelas|siglas|abreviaturas)|refer[êe]ncias\s+bibliogr[áa]ficas|bibliografia|ap[êe]ndice|anexo[s]?|gloss[áa]rio|posf[áa]cio|sobre\s+o\s+autor|cr[ée]ditos|ficha\s+t[ée]cnica)\b/i.test(trimmed) ||
    (/^dado[s]?\s+de\s+cataloga[çc][ãa]o/i.test(trimmed)) ||
    (/^cdd\s*[:\s]|^cdu\s*[:\s]/i.test(trimmed));

  if (isPrePostTextualPattern) {
    return {
      type: 'pre_post_textual',
      isHeading: false,
      isFootnote: false,
      isQuote: false,
      isHeaderFooter: false,
      isPrePostTextual: true,
    };
  }

  // 3. Check if explicitly marked or matches Heading patterns (Larger font, uppercase, enclosed text, structural markers)
  const isHeadingPattern =
    forceHeading ||
    (trimmed.length <= 110 &&
      (/^#{1,4}\s+/i.test(trimmed) ||
        /^(cap[ií]tulo|chapter|parte|part|se[çc][ãa]o|section|livro|book|volume|ensaio|artigo|introdu[çc][ãa]o|conclus[ãa]o|pref[áa]cio)\b/i.test(
          trimmed
        ) ||
        /^[IVXLCDM]+\.?\s+[A-ZÀ-Ú]/i.test(trimmed) ||
        (/^(\*+|\—+|=+)\s*.+\s*(\*+|\—+|=+)$/.test(trimmed) && trimmed.length < 80) ||
        (/^[0-9]+(\.[0-9]+)*\s+[A-ZÀ-Ú]/.test(trimmed) && trimmed.length < 75) ||
        (/^[A-ZÀ-Ú0-9\s—–:,\-]{4,65}$/.test(trimmed) && !/[.!?]$/.test(trimmed))));

  if (isHeadingPattern) {
    return {
      type: 'heading',
      isHeading: true,
      isFootnote: false,
      isQuote: false,
      isHeaderFooter: false,
      isPrePostTextual: false,
    };
  }

  // 4. Check if Footnote / Note pattern (Starts with a number/symbol, followed by text on same line, or scholarly indicators)
  const isFootnotePattern =
    /^\[\d+\]/i.test(trimmed) ||
    /^\(\d+\)/i.test(trimmed) ||
    (/^[¹²³⁴⁵⁶⁷⁸⁹⁰]/.test(trimmed) && trimmed.length < 500) ||
    (/^\d{1,3}[\.\)]\s{1,4}[a-zA-ZÀ-ú]/.test(trimmed) && trimmed.length < 500) ||
    /^(\*|†|‡)\s+/i.test(trimmed) ||
    /^(nota\s+(do\s+autor|do\s+tradutor|da\s+edi[çc][ãa]o|de\s+rodap[ée])|n\.?\s*t\.?|n\.?\s*a\.?|n\.?\s*e\.?|n\.?\s*r\.?|footnote|note:?)\b/i.test(
      trimmed
    ) ||
    /^(cf\.|ibid\.|op\.\s*cit\.|apud\b|passim\b|v\.\s*supra|v\.\s*infra)/i.test(trimmed);

  if (isFootnotePattern) {
    return {
      type: 'footnote',
      isHeading: false,
      isFootnote: true,
      isQuote: false,
      isHeaderFooter: false,
      isPrePostTextual: false,
    };
  }

  // 5. Check if Quote / Blockquote / Citation pattern (Different orientation, quotation marks, attribution formulas)
  const isQuotePattern =
    trimmed.startsWith('>') ||
    (trimmed.startsWith('“') && (trimmed.endsWith('”') || trimmed.includes('”'))) ||
    (trimmed.startsWith('"') && (trimmed.endsWith('"') || trimmed.includes('"'))) ||
    (trimmed.startsWith('«') && (trimmed.endsWith('»') || trimmed.includes('»'))) ||
    (trimmed.startsWith('‘') && trimmed.endsWith('’')) ||
    (/^(citando|conforme|como\s+afirma|segundo|diz\s+o\s+autor|de\s+acordo\s+com)\s*:/i.test(trimmed) && trimmed.length > 40);

  if (isQuotePattern) {
    return {
      type: 'quote',
      isHeading: false,
      isFootnote: false,
      isQuote: true,
      isHeaderFooter: false,
      isPrePostTextual: false,
    };
  }

  // 6. Default: Standard text paragraph
  return {
    type: 'text',
    isHeading: false,
    isFootnote: false,
    isQuote: false,
    isHeaderFooter: false,
    isPrePostTextual: false,
  };
}

/**
 * Split long list of paragraphs into manageable sections/chapters
 */
function organizeParagraphsIntoSections(
  rawParagraphs: {
    text: string;
    page?: number;
    isHeading?: boolean;
    type?: ParagraphType;
    isFootnote?: boolean;
    isQuote?: boolean;
    isHeaderFooter?: boolean;
    isPrePostTextual?: boolean;
  }[],
  bookTitle: string
): SectionItem[] {
  const sections: SectionItem[] = [];
  let currentParagraphs: ParagraphItem[] = [];
  let currentTitle = 'Parte 1';
  let currentSubtitle = '';
  let chapterIndex = 1;
  let startPage: number | undefined = undefined;
  let endPage: number | undefined = undefined;

  const pushSection = () => {
    if (currentParagraphs.length === 0) return;
    const pageRange = startPage
      ? endPage && endPage !== startPage
        ? `pp. ${startPage}–${endPage}`
        : `p. ${startPage}`
      : `Seção ${chapterIndex}`;
    const wordCount = currentParagraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);
    const estMinutes = Math.max(1, Math.round(wordCount / 140));

    sections.push({
      id: `sec-${chapterIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      chapterId: `chap-${chapterIndex}`,
      chapterNumber: chapterIndex,
      chapterTitle: `Capítulo ${chapterIndex}`,
      partTitle: currentTitle,
      subtitle: currentSubtitle || undefined,
      pageRange,
      durationEstimateMinutes: estMinutes,
      paragraphs: [...currentParagraphs],
    });

    chapterIndex++;
    currentParagraphs = [];
    startPage = undefined;
    endPage = undefined;
  };

  for (let i = 0; i < rawParagraphs.length; i++) {
    const item = rawParagraphs[i];
    const rawText = item.text.trim();
    if (!rawText) continue;

    // Check if running header is fused with body text (e.g. "ROMEU E JULIETA E A ORIGEM DO EsTADO 137 as linhas...")
    const splitResult = splitFusedRunningHeaders(rawText);
    const subItems: {
      text: string;
      page?: number;
      isHeading?: boolean;
      type?: ParagraphType;
      isFootnote?: boolean;
      isQuote?: boolean;
      isHeaderFooter?: boolean;
      isPrePostTextual?: boolean;
    }[] = splitResult.isSplit
      ? splitResult.parts.map((p) => ({
          text: p.text,
          page: item.page,
          isHeading: item.isHeading || p.isHeader,
          type: (p.isHeader || p.isPreTextual ? 'header_footer' : item.type) as ParagraphType | undefined,
          isHeaderFooter: p.isHeader,
          isPrePostTextual: p.isPreTextual,
          isFootnote: false,
          isQuote: false,
        }))
      : [item];

    for (const subItem of subItems) {
      const text = subItem.text.trim();
      if (!text) continue;

      if (subItem.page) {
        if (!startPage) startPage = subItem.page;
        endPage = subItem.page;
      }

      const { type, isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } =
        classifyParagraph(text, subItem.isHeading);

      // If it's a major heading and we have enough paragraphs, start a new section
      if (isHeading && currentParagraphs.length >= 4) {
        pushSection();
        currentTitle = text.replace(/^#+\s*/, '').slice(0, 80);
      } else if (currentParagraphs.length >= 35) {
        // Chunk overly long continuous blocks
        pushSection();
        currentTitle = `Parte ${chapterIndex}`;
      }

      currentParagraphs.push({
        id: `p-${chapterIndex}-${currentParagraphs.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        text: text.replace(/^#+\s*/, ''),
        page: subItem.page,
        type: subItem.type || type,
        isHeading: subItem.isHeading || isHeading,
        isFootnote: subItem.isFootnote || isFootnote,
        isQuote: subItem.isQuote || isQuote,
        isHeaderFooter: subItem.isHeaderFooter || isHeaderFooter,
        isPrePostTextual: subItem.isPrePostTextual || isPrePostTextual,
      });
    }
  }

  pushSection();

  if (sections.length === 0) {
    sections.push({
      id: `sec-1-${Date.now()}`,
      chapterId: 'chap-1',
      chapterNumber: 1,
      chapterTitle: bookTitle,
      partTitle: 'Texto Completo',
      pageRange: 'p. 1',
      durationEstimateMinutes: 5,
      paragraphs: [
        {
          id: 'p-1',
          text: 'Nenhum texto pôde ser extraído deste documento.',
          type: 'text',
        },
      ],
    });
  }

  return sections;
}

/**
 * Extract Outline Bookmarks from PDF
 */
export async function extractPdfBookmarks(pdf: any): Promise<BookmarkItem[]> {
  try {
    const outline = await pdf.getOutline();
    if (!outline || !Array.isArray(outline) || outline.length === 0) {
      return [];
    }

    const resolveItem = async (item: any, level = 1): Promise<BookmarkItem | null> => {
      try {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await pdf.getDestination(dest);
        }

        let pageNum = 1;
        if (Array.isArray(dest) && dest[0]) {
          try {
            const pageIndex = await pdf.getPageIndex(dest[0]);
            pageNum = pageIndex + 1;
          } catch (e) {
            pageNum = 1;
          }
        }

        const childBookmarks: BookmarkItem[] = [];
        if (item.items && Array.isArray(item.items)) {
          for (const sub of item.items) {
            const subRes = await resolveItem(sub, level + 1);
            if (subRes) childBookmarks.push(subRes);
          }
        }

        return {
          id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: item.title?.trim() || `Capítulo ${pageNum}`,
          pageNumber: pageNum,
          level,
          children: childBookmarks.length > 0 ? childBookmarks : undefined,
        };
      } catch (err) {
        console.warn('Failed to resolve bookmark item:', item?.title, err);
        return null;
      }
    };

    const bookmarks: BookmarkItem[] = [];
    for (const rootItem of outline) {
      const resolved = await resolveItem(rootItem, 1);
      if (resolved) bookmarks.push(resolved);
    }

    return bookmarks;
  } catch (err) {
    console.warn('PDF does not contain readable outline bookmarks:', err);
    return [];
  }
}

/**
 * Organize paragraphs using native document bookmarks/indices
 */
export function organizeParagraphsByBookmarks(
  rawParagraphs: {
    text: string;
    page?: number;
    isHeading?: boolean;
    type?: ParagraphType;
    isFootnote?: boolean;
    isQuote?: boolean;
    isHeaderFooter?: boolean;
    isPrePostTextual?: boolean;
  }[],
  bookmarks: BookmarkItem[],
  bookTitle: string
): { sections: SectionItem[]; chaptersIndex: ChapterSummary[] } {
  // Flatten bookmarks into a sequential list of checkpoints
  const flatBookmarks: { title: string; pageNumber: number; level: number }[] = [];
  const flatten = (items: BookmarkItem[]) => {
    for (const b of items) {
      flatBookmarks.push({ title: b.title, pageNumber: b.pageNumber, level: b.level });
      if (b.children && b.children.length > 0) {
        flatten(b.children);
      }
    }
  };
  flatten(bookmarks);

  // Sort bookmarks by page number
  flatBookmarks.sort((a, b) => a.pageNumber - b.pageNumber);

  if (flatBookmarks.length === 0) {
    const sections = organizeParagraphsIntoSections(rawParagraphs, bookTitle);
    return { sections, chaptersIndex: [] };
  }

  const sections: SectionItem[] = [];
  const chaptersIndex: ChapterSummary[] = [];

  for (let i = 0; i < flatBookmarks.length; i++) {
    const currentBm = flatBookmarks[i];
    const nextBm = flatBookmarks[i + 1];

    const startPage = currentBm.pageNumber;
    const endPage = nextBm ? nextBm.pageNumber - 1 : 999999;

    // Filter paragraphs belonging to this bookmark range
    const sectionParas = rawParagraphs.filter((p) => {
      const page = p.page || 1;
      return page >= startPage && (nextBm ? page <= endPage : true);
    });

    if (sectionParas.length === 0) continue;

    const formattedParas: ParagraphItem[] = sectionParas.map((p, pIdx) => {
      const { type, isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } =
        classifyParagraph(p.text, p.isHeading);
      return {
        id: `p-bm-${i + 1}-${pIdx + 1}-${Math.random().toString(36).slice(2, 6)}`,
        text: p.text,
        page: p.page,
        type: p.type || type,
        isHeading: p.isHeading || isHeading,
        isFootnote: p.isFootnote || isFootnote,
        isQuote: p.isQuote || isQuote,
        isHeaderFooter: p.isHeaderFooter || isHeaderFooter,
        isPrePostTextual: p.isPrePostTextual || isPrePostTextual,
      };
    });

    const wordCount = formattedParas.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);
    const estMinutes = Math.max(1, Math.round(wordCount / 140));

    const pageRangeStr =
      startPage === (nextBm ? endPage : startPage)
        ? `p. ${startPage}`
        : `pp. ${startPage}–${nextBm ? endPage : 'fim'}`;

    const sectionId = `sec-bm-${i + 1}-${Date.now()}`;
    const section: SectionItem = {
      id: sectionId,
      chapterId: `chap-bm-${i + 1}`,
      chapterNumber: i + 1,
      chapterTitle: `Capítulo ${i + 1}`,
      partTitle: currentBm.title,
      pageRange: pageRangeStr,
      durationEstimateMinutes: estMinutes,
      paragraphs: formattedParas,
    };

    sections.push(section);

    chaptersIndex.push({
      id: `chap-bm-${i + 1}`,
      number: i + 1,
      title: currentBm.title,
      sectionsCount: 1,
      parts: [
        {
          id: sectionId,
          title: currentBm.title,
          pageRange: pageRangeStr,
        },
      ],
    });
  }

  if (sections.length === 0) {
    const fallbackSections = organizeParagraphsIntoSections(rawParagraphs, bookTitle);
    return { sections: fallbackSections, chaptersIndex: [] };
  }

  return { sections, chaptersIndex };
}

/**
 * Recalibrate paragraphs based on custom options
 */
export function recalibrateDocumentParagraphs(
  sections: SectionItem[],
  options: CalibrationOptions
): SectionItem[] {
  return sections.map((sec, secIdx) => {
    const updatedParas: ParagraphItem[] = [];

    for (const p of sec.paragraphs) {
      let text = p.text;

      // 1. Strip custom pattern if requested
      if (options.customHeaderPattern && options.customHeaderPattern.trim()) {
        try {
          const regex = new RegExp(`^${options.customHeaderPattern.trim()}\\s*`, 'gi');
          text = text.replace(regex, '').trim();
        } catch (e) {}
      }

      if (!text) continue;

      // 2. Running headers / fused numbers splitting
      if (options.splitFusedPageNumbers || options.stripRunningHeaders) {
        const splitRes = splitFusedRunningHeaders(text, options.customHeaderPattern);
        if (splitRes.isSplit && splitRes.parts.length > 1) {
          splitRes.parts.forEach((part, partIdx) => {
            const isOmitted = part.isHeader && options.stripRunningHeaders;
            const { type, isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } =
              classifyParagraph(part.text, false);

            updatedParas.push({
              id: `${p.id}-split-${partIdx}`,
              page: p.page,
              text: part.text,
              type: part.isHeader ? 'header_footer' : type,
              isHeading: !part.isHeader && isHeading,
              isFootnote: !part.isHeader && (options.classifyFootnotes ? isFootnote : false),
              isQuote: !part.isHeader && isQuote,
              isHeaderFooter: part.isHeader || isHeaderFooter,
              isPrePostTextual: part.isPreTextual || isPrePostTextual,
              isNonFree: isOmitted,
            });
          });
          continue;
        }
      }

      // Standard re-classification
      const { type, isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } =
        classifyParagraph(text, p.isHeading);

      const isNonFree =
        (isHeaderFooter && options.stripRunningHeaders) ||
        (isPrePostTextual && options.stripTopLines);

      updatedParas.push({
        ...p,
        text,
        type: p.type || type,
        isHeading: p.isHeading || isHeading,
        isFootnote: options.classifyFootnotes ? (p.isFootnote || isFootnote) : false,
        isQuote: p.isQuote || isQuote,
        isHeaderFooter: p.isHeaderFooter || isHeaderFooter,
        isPrePostTextual: p.isPrePostTextual || isPrePostTextual,
        isNonFree: isNonFree || p.isNonFree,
      });
    }

    const wordCount = updatedParas.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);

    return {
      ...sec,
      durationEstimateMinutes: Math.max(1, Math.round(wordCount / 140)),
      paragraphs: updatedParas.length > 0 ? updatedParas : sec.paragraphs,
    };
  });
}

/**
 * Parse PDF files using pdfjs-dist with native bookmark outline and smart header separation
 */
export async function parsePdfFile(file: File): Promise<ParsedBook> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: true,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const rawParagraphs: {
    text: string;
    page?: number;
    isHeading?: boolean;
    type?: ParagraphType;
    isFootnote?: boolean;
    isQuote?: boolean;
    isHeaderFooter?: boolean;
    isPrePostTextual?: boolean;
  }[] = [];

  // 1. Extract native PDF bookmarks / outlines
  const bookmarks = await extractPdfBookmarks(pdf);

  // 2. Parse text content page by page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      const str = item.str || '';
      const transform = item.transform;
      const y = transform ? transform[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = str;
      } else {
        currentLine += (currentLine.endsWith(' ') || str.startsWith(' ') ? '' : ' ') + str;
      }
      lastY = y;
    }
    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    // Top-of-page running header isolation (e.g. "三国演义 26" or "Romance de 3000" at the top of pages)
    if (pageLines.length > 1) {
      const firstLine = pageLines[0].trim();
      const firstLineSplit = splitFusedRunningHeaders(firstLine);

      if (firstLineSplit.isSplit && firstLineSplit.parts.length > 1) {
        // Separate first line running header into isolated block
        firstLineSplit.parts.forEach((p) => {
          rawParagraphs.push({
            text: p.text,
            page: pageNum,
            type: p.isHeader ? 'header_footer' : 'text',
            isHeaderFooter: p.isHeader,
            isPrePostTextual: p.isPreTextual,
          });
        });
        pageLines.shift(); // Remove processed first line
      } else if (
        firstLine.length <= 60 &&
        (/^\d{1,4}$/.test(firstLine) ||
          /^([A-ZÀ-Ú0-9\s—–:,\.\-]{3,50}\s+\d{1,4})$/.test(firstLine) ||
          /^([\u4e00-\u9fa5\w\s]{2,30}\s*\d{1,4})$/.test(firstLine))
      ) {
        rawParagraphs.push({
          text: firstLine,
          page: pageNum,
          type: 'header_footer',
          isHeaderFooter: true,
          isPrePostTextual: true,
        });
        pageLines.shift(); // Remove top running header
      }
    }

    // Merge lines into coherent paragraphs
    let paragraphAccumulator = '';
    for (const line of pageLines) {
      const { isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } = classifyParagraph(line);

      if (isHeading && paragraphAccumulator) {
        rawParagraphs.push({ text: paragraphAccumulator, page: pageNum });
        paragraphAccumulator = '';
        rawParagraphs.push({ text: line, page: pageNum, isHeading: true, type: 'heading' });
      } else if (isHeading && !paragraphAccumulator) {
        rawParagraphs.push({ text: line, page: pageNum, isHeading: true, type: 'heading' });
      } else {
        if (paragraphAccumulator) {
          if (paragraphAccumulator.endsWith('-')) {
            paragraphAccumulator = paragraphAccumulator.slice(0, -1) + line;
          } else {
            paragraphAccumulator += ' ' + line;
          }
        } else {
          paragraphAccumulator = line;
        }

        if (paragraphAccumulator.length > 280 && /[.!?:]$/.test(line)) {
          rawParagraphs.push({ text: paragraphAccumulator, page: pageNum });
          paragraphAccumulator = '';
        }
      }
    }

    if (paragraphAccumulator.trim()) {
      rawParagraphs.push({ text: paragraphAccumulator.trim(), page: pageNum });
    }
  }

  const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  // 3. Prefer Bookmark-based organization if outline is available
  let sections: SectionItem[];
  let chaptersIndex: ChapterSummary[] | undefined = undefined;

  if (bookmarks.length >= 2) {
    const bmRes = organizeParagraphsByBookmarks(rawParagraphs, bookmarks, title);
    sections = bmRes.sections;
    chaptersIndex = bmRes.chaptersIndex;
  } else {
    sections = organizeParagraphsIntoSections(rawParagraphs, title);
  }

  return {
    id: `book-pdf-${Date.now()}`,
    title,
    author: 'Documento PDF',
    fileType: 'pdf',
    fileName: file.name,
    totalChapters: sections.length,
    sections,
    chaptersIndex,
    bookmarks: bookmarks.length > 0 ? bookmarks : undefined,
  };
}

/**
 * Parse DOCX files using mammoth
 */
export async function parseDocxFile(file: File): Promise<ParsedBook> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const rawParagraphs: { text: string; page?: number; isHeading?: boolean; type?: ParagraphType }[] = [];
  const elements = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote');

  elements.forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    const isHeading = /^h[1-6]$/i.test(el.tagName);
    const isQuote = el.tagName.toLowerCase() === 'blockquote';
    rawParagraphs.push({
      text,
      isHeading,
      type: isHeading ? 'heading' : isQuote ? 'quote' : undefined,
    });
  });

  const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const sections = organizeParagraphsIntoSections(rawParagraphs, title);

  return {
    id: `book-docx-${Date.now()}`,
    title,
    author: 'Documento Word',
    fileType: 'docx',
    fileName: file.name,
    totalChapters: sections.length,
    sections,
  };
}

/**
 * Parse EPUB files using JSZip and DOMParser
 */
export async function parseEpubFile(file: File): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(file);
  const rawParagraphs: { text: string; page?: number; isHeading?: boolean; type?: ParagraphType }[] = [];
  let bookTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  let author = 'Autor do ePub';

  // 1. Locate container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  let opfPath = 'content.opf';

  if (containerXml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, 'application/xml');
    const rootfile = doc.querySelector('rootfile');
    if (rootfile && rootfile.getAttribute('full-path')) {
      opfPath = rootfile.getAttribute('full-path')!;
    }
  }

  // 2. Read OPF metadata and spine
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfContent = await zip.file(opfPath)?.async('text');

  const htmlFilesToRead: string[] = [];

  if (opfContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfContent, 'application/xml');

    const metaTitle = doc.querySelector('title, dc\\:title')?.textContent;
    if (metaTitle) bookTitle = metaTitle.trim();

    const metaCreator = doc.querySelector('creator, dc\\:creator')?.textContent;
    if (metaCreator) author = metaCreator.trim();

    const manifestItems: Record<string, string> = {};
    doc.querySelectorAll('manifest item').forEach((item) => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) manifestItems[id] = href;
    });

    doc.querySelectorAll('spine itemref').forEach((itemref) => {
      const idref = itemref.getAttribute('idref');
      if (idref && manifestItems[idref]) {
        const href = manifestItems[idref];
        const fullPath = opfDir + href;
        htmlFilesToRead.push(fullPath);
      }
    });
  }

  if (htmlFilesToRead.length === 0) {
    zip.forEach((relativePath) => {
      if (
        /\.(x?html|xml)$/i.test(relativePath) &&
        !relativePath.includes('META-INF') &&
        !relativePath.includes('.opf')
      ) {
        htmlFilesToRead.push(relativePath);
      }
    });
  }

  // 3. Extract text from each chapter file
  for (const chapterPath of htmlFilesToRead) {
    const chapterXml = await zip.file(chapterPath)?.async('text');
    if (!chapterXml) continue;

    const parser = new DOMParser();
    const doc = parser.parseFromString(chapterXml, 'text/html');

    const nodes = doc.body?.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, aside') || [];
    nodes.forEach((node) => {
      const text = node.textContent?.trim();
      if (!text || text.length < 2) return;
      const isHeading = /^h[1-6]$/i.test(node.tagName);
      const isQuote = node.tagName.toLowerCase() === 'blockquote';
      const isFootnote =
        node.tagName.toLowerCase() === 'aside' ||
        node.getAttribute('epub:type') === 'footnote' ||
        node.classList.contains('footnote');

      rawParagraphs.push({
        text,
        isHeading,
        type: isHeading ? 'heading' : isFootnote ? 'footnote' : isQuote ? 'quote' : undefined,
      });
    });
  }

  const sections = organizeParagraphsIntoSections(rawParagraphs, bookTitle);

  return {
    id: `book-epub-${Date.now()}`,
    title: bookTitle,
    author,
    fileType: 'epub',
    fileName: file.name,
    totalChapters: sections.length,
    sections,
  };
}

/**
 * Parse plain text or Markdown files
 */
export async function parseTextFile(file: File): Promise<ParsedBook> {
  const text = await file.text();
  return parseRawTextContent(text, file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '), file.name);
}

export function parseRawTextContent(text: string, title = 'Meu Texto', fileName = 'texto.txt'): ParsedBook {
  const lines = text.split(/\r?\n\r?\n|\r\n/);
  const rawParagraphs: {
    text: string;
    page?: number;
    isHeading?: boolean;
    type?: ParagraphType;
    isFootnote?: boolean;
    isQuote?: boolean;
    isHeaderFooter?: boolean;
    isPrePostTextual?: boolean;
  }[] = [];

  lines.forEach((chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;

    const { type, isHeading, isFootnote, isQuote, isHeaderFooter, isPrePostTextual } =
      classifyParagraph(trimmed);
    const cleanText = trimmed.replace(/^#+\s*/, '');
    rawParagraphs.push({
      text: cleanText,
      isHeading,
      type,
      isFootnote,
      isQuote,
      isHeaderFooter,
      isPrePostTextual,
    });
  });

  const sections = organizeParagraphsIntoSections(rawParagraphs, title);

  return {
    id: `book-txt-${Date.now()}`,
    title,
    author: 'Texto Pessoal',
    fileType: 'txt',
    fileName,
    totalChapters: sections.length,
    sections,
  };
}
