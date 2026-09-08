import { SectionItem, BookmarkItem, ParagraphItem } from '../types';

/**
 * Intelligent heading detector & hierarchy classifier for cascading Acrobat-style bookmarks
 */
export function detectHeadingLevel(text: string, defaultLevel: number = 2): number {
  const trimmed = text.trim();
  if (!trimmed) return defaultLevel;

  // Level 1: Major structural divisions (Part, Book, Volume, Act, Main Chapter)
  if (
    /^(parte|livro|volume|tomo|act|ato|seção\s+[ivxlcdm]+|part\s+[ivxlcdm\d]+|book\s+[ivxlcdm\d]+)\b/i.test(
      trimmed
    ) ||
    /^#\s+/i.test(trimmed) ||
    /^(primeira|segunda|terceira|quarta|quinta)\s+parte/i.test(trimmed)
  ) {
    return 1;
  }

  // Level 2: Chapters, Standard sections, 1.0, 2.0
  if (
    /^(capítulo|capitulo|chapter|chapitre|kapitel|cenas?|canto)\s+([\divxlcdm]+|\w+)/i.test(
      trimmed
    ) ||
    /^##\s+/i.test(trimmed) ||
    /^\d+\.\s+[A-Z\u00C0-\u00DC]/i.test(trimmed)
  ) {
    return 2;
  }

  // Level 3: Sub-sections, 1.1, 1.2.3, Topics, Articles
  if (
    /^\d+\.\d+(\.\d+)?\s+/i.test(trimmed) ||
    /^###\s+/i.test(trimmed) ||
    /^(artigo|art\.|subseção|sub-seção|cláusula|tópico|item)\s+[\d\w]+/i.test(
      trimmed
    ) ||
    /^[a-z]\)\s+/i.test(trimmed)
  ) {
    return 3;
  }

  return defaultLevel;
}

/**
 * Clean title string for display in bookmark index
 */
export function cleanBookmarkTitle(text: string): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Accurately resolve where a bookmark points to inside document sections
 */
export function resolveBookmarkLocation(
  node: BookmarkItem,
  sections: SectionItem[]
): { sectionIndex: number; paragraphIndex: number; paragraphId?: string } {
  if (!sections || sections.length === 0) {
    return { sectionIndex: 0, paragraphIndex: 0 };
  }

  // 1. If explicit sectionIndex is provided and valid
  if (typeof node.sectionIndex === 'number' && node.sectionIndex >= 0 && node.sectionIndex < sections.length) {
    let pIdx = typeof node.paragraphIndex === 'number' ? node.paragraphIndex : 0;
    if (node.paragraphId) {
      const foundIdx = sections[node.sectionIndex].paragraphs.findIndex((p) => p.id === node.paragraphId);
      if (foundIdx !== -1) pIdx = foundIdx;
    }
    return { sectionIndex: node.sectionIndex, paragraphIndex: pIdx, paragraphId: node.paragraphId };
  }

  // 2. Search by paragraphId if present
  if (node.paragraphId) {
    for (let s = 0; s < sections.length; s++) {
      const pIdx = sections[s].paragraphs.findIndex((p) => p.id === node.paragraphId);
      if (pIdx !== -1) {
        return { sectionIndex: s, paragraphIndex: pIdx, paragraphId: node.paragraphId };
      }
    }
  }

  // 3. Search by pageNumber
  if (typeof node.pageNumber === 'number' && node.pageNumber > 0) {
    const targetPage = node.pageNumber;

    // Check section pageBlocks
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      if (sec.pageBlocks && sec.pageBlocks.some((pb) => pb.pageNumber === targetPage)) {
        const pIdx = sec.paragraphs.findIndex((p) => p.page === targetPage);
        return {
          sectionIndex: s,
          paragraphIndex: Math.max(0, pIdx),
          paragraphId: pIdx >= 0 ? sec.paragraphs[pIdx].id : undefined,
        };
      }
    }

    // Check paragraph pages
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const pIdx = sec.paragraphs.findIndex((p) => p.page === targetPage);
      if (pIdx !== -1) {
        return { sectionIndex: s, paragraphIndex: pIdx, paragraphId: sec.paragraphs[pIdx].id };
      }
    }

    // Direct page index fallback (page 1 -> section 0)
    if (targetPage - 1 >= 0 && targetPage - 1 < sections.length) {
      return { sectionIndex: targetPage - 1, paragraphIndex: 0 };
    }
  }

  // 4. Search by title
  if (node.title) {
    const cleanTitle = cleanBookmarkTitle(node.title).toLowerCase();
    if (cleanTitle.length >= 3) {
      for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        if (sec.partTitle && sec.partTitle.toLowerCase().includes(cleanTitle)) {
          return { sectionIndex: s, paragraphIndex: 0 };
        }
        if (sec.chapterTitle && sec.chapterTitle.toLowerCase().includes(cleanTitle)) {
          return { sectionIndex: s, paragraphIndex: 0 };
        }
        const pIdx = sec.paragraphs.findIndex((p) => p.text.toLowerCase().includes(cleanTitle));
        if (pIdx !== -1) {
          return { sectionIndex: s, paragraphIndex: pIdx, paragraphId: sec.paragraphs[pIdx].id };
        }
      }
    }
  }

  return { sectionIndex: 0, paragraphIndex: 0 };
}

/**
 * Enriches an existing bookmark tree with precise sectionIndex & paragraphIndex
 */
export function enrichBookmarkTreeWithSections(
  bookmarks: BookmarkItem[],
  sections: SectionItem[]
): BookmarkItem[] {
  return bookmarks.map((node) => {
    const loc = resolveBookmarkLocation(node, sections);
    const enriched: BookmarkItem = {
      ...node,
      sectionIndex: loc.sectionIndex,
      paragraphIndex: loc.paragraphIndex,
      paragraphId: loc.paragraphId || node.paragraphId,
    };

    if (node.children && node.children.length > 0) {
      enriched.children = enrichBookmarkTreeWithSections(node.children, sections);
    }

    return enriched;
  });
}

/**
 * Generate smart bookmark tree:
 * 1. If existing bookmarks (from PDF outline, EPUB TOC, or user-created marks) exist, use them.
 * 2. If no bookmarks exist in the file or state, return an empty array (do NOT invent artificial chapters or pages).
 */
export function generateSmartBookmarksFromSections(
  sections: SectionItem[],
  existingBookmarks?: BookmarkItem[]
): BookmarkItem[] {
  if (!sections || sections.length === 0) return [];

  // If explicit bookmarks are provided (from PDF outline, ePub TOC, or user marks)
  if (existingBookmarks && existingBookmarks.length > 0) {
    return enrichBookmarkTreeWithSections(existingBookmarks, sections);
  }

  // If the file/book has no bookmarks, leave it empty as requested by user
  return [];
}

/**
 * Add a custom bookmark / index entry directly from a text selection or paragraph
 */
export function addBookmarkToTree(
  currentTree: BookmarkItem[],
  newBookmark: {
    title: string;
    sectionIndex: number;
    paragraphIndex?: number;
    paragraphId?: string;
    pageNumber?: number;
    level?: number;
  }
): BookmarkItem[] {
  const item: BookmarkItem = {
    id: `bm-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanBookmarkTitle(newBookmark.title) || 'Novo Marcador',
    sectionIndex: newBookmark.sectionIndex,
    paragraphIndex: newBookmark.paragraphIndex || 0,
    paragraphId: newBookmark.paragraphId,
    pageNumber: newBookmark.pageNumber || newBookmark.sectionIndex + 1,
    level: newBookmark.level || 1,
    isExpanded: true,
    children: [],
  };

  return [...currentTree, item];
}

/**
 * Delete a bookmark by ID from tree recursively
 */
export function deleteBookmarkFromTree(
  nodes: BookmarkItem[],
  targetId: string
): BookmarkItem[] {
  return nodes
    .filter((n) => n.id !== targetId)
    .map((n) => ({
      ...n,
      children: n.children ? deleteBookmarkFromTree(n.children, targetId) : [],
    }));
}

/**
 * Recursively search within bookmark tree nodes
 */
export function filterBookmarkTree(nodes: BookmarkItem[], query: string): BookmarkItem[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase().trim();

  const filterNode = (node: BookmarkItem): BookmarkItem | null => {
    const matchesSelf = node.title.toLowerCase().includes(q);
    const filteredChildren: BookmarkItem[] = [];

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        const res = filterNode(child);
        if (res) filteredChildren.push(res);
      });
    }

    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...node,
        isExpanded: true,
        children: filteredChildren,
      };
    }

    return null;
  };

  return nodes.map(filterNode).filter((n): n is BookmarkItem => n !== null);
}

/**
 * Count total nodes in tree
 */
export function countBookmarkNodes(nodes: BookmarkItem[]): number {
  let count = 0;
  const traverse = (list: BookmarkItem[]) => {
    list.forEach((item) => {
      count++;
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };
  traverse(nodes);
  return count;
}
