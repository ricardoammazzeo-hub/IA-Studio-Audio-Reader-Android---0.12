export type ParagraphType =
  | 'heading'
  | 'text'
  | 'quote'
  | 'footnote'
  | 'header_footer'
  | 'pre_post_textual';

export interface ParagraphItem {
  id: string;
  page?: number;
  text: string;
  type?: ParagraphType;
  isHeading?: boolean;
  isFootnote?: boolean;
  isQuote?: boolean;
  isHeaderFooter?: boolean;
  isPrePostTextual?: boolean;
  isNonFree?: boolean; // Block marked as non-free / ignored (e.g. index, TOC, copyright, references)
  includeInReading?: boolean; // explicit override if needed
  translations?: Record<string, string>; // Add dictionary mapping target language string to translated text
}

export interface SectionItem {
  id: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  partTitle: string;
  subtitle?: string;
  pageRange: string;
  durationEstimateMinutes: number;
  isNonFree?: boolean; // Section-level non-free/ignored flag
  pageBlocks?: {
    pageNumber: number;
    title?: string;
    isNonFree?: boolean;
  }[];
  paragraphs: ParagraphItem[];
}

export interface BookmarkItem {
  id: string;
  title: string;
  pageNumber?: number;
  sectionIndex?: number;
  paragraphIndex?: number;
  paragraphId?: string;
  level: number;
  isExpanded?: boolean;
  children?: BookmarkItem[];
}

export interface ChapterSummary {
  id: string;
  number: number;
  title: string;
  sectionsCount: number;
  parts: {
    id: string;
    title: string;
    pageRange: string;
  }[];
}

export interface CalibrationOptions {
  stripRunningHeaders: boolean;
  customHeaderPattern?: string;
  splitFusedPageNumbers: boolean;
  classifyFootnotes: boolean;
  usePdfBookmarks: boolean;
  stripTopLines: boolean;
  maxParagraphLength?: number;
}

export type PlaybackEngine = 'browser';

export type ReadingTheme = 'light' | 'dark';

export type DocumentFormat = 'pdf' | 'docx' | 'epub' | 'txt' | 'custom';

export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export interface TextAnnotation {
  id: string;
  bookId: string;
  sectionIndex: number;
  paragraphId: string;
  selectedText: string;
  comment?: string;
  color: AnnotationColor;
  createdAt: string;
  updatedAt?: string;
}

export interface BookItem {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  translator?: string;
  publisher?: string;
  fileType: DocumentFormat;
  fileName?: string;
  isPreloaded?: boolean;
  totalChapters: number;
  sections: SectionItem[];
  chaptersIndex?: ChapterSummary[];
  bookmarks?: BookmarkItem[];
  annotations?: TextAnnotation[];
}

