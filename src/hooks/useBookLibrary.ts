import { useState, useEffect, useCallback } from 'react';
import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions, BookmarkItem, TextAnnotation } from '../types';
import {
  parsePdfFile,
  parseDocxFile,
  parseEpubFile,
  parseTextFile,
  parseRawTextContent,
  recalibrateDocumentParagraphs,
} from '../utils/documentParser';
import {
  transferFirstSentenceToPrevious,
  applyAllHighConfidenceTransitions,
} from '../utils/transitionParser';
import {
  addBookmarkToTree,
  deleteBookmarkFromTree,
} from '../utils/bookmarkTree';
import { importAudiobookProject } from '../utils/projectSaveManager';

const STORAGE_KEY = 'audiobook_user_library_v2';
const ACTIVE_BOOK_ID_KEY = 'audiobook_active_book_id_v2';

const DEFAULT_WELCOME_BOOK: BookItem = {
  id: 'welcome-guide',
  title: 'Guia do Leitor & Audiobook Universal',
  subtitle: 'Como aproveitar ao máximo seu leitor de documentos e extensão',
  author: 'Audiobook Studio',
  fileType: 'custom',
  isPreloaded: false,
  totalChapters: 1,
  sections: [
    {
      id: 'sec-welcome-1',
      chapterId: 'chap-1',
      chapterNumber: 1,
      chapterTitle: 'Bem-vindo',
      partTitle: 'Primeiros Passos com o Leitor Universal',
      pageRange: 'Guia Inicial',
      durationEstimateMinutes: 2,
      paragraphs: [
        {
          id: 'p-1',
          text: 'Bem-vindo ao seu Leitor de Documentos e Audiobook Universal! Este aplicativo foi projetado para ler, narrar e sincronizar o texto de qualquer documento PDF, Word (.docx), ePub ou arquivos de texto.',
          type: 'text',
        },
        {
          id: 'p-2',
          text: 'Como importar seus próprios livros e documentos:',
          type: 'heading',
          isHeading: true,
        },
        {
          id: 'p-3',
          text: 'Clique no botão "Ler Novo" no cabeçalho ou simplesmente arraste seu arquivo PDF, DOCX, ePub, TXT ou Projeto (.audiobook) para a janela. O leitor irá analisar a estrutura e sincronizar com precisão.',
          type: 'text',
        },
        {
          id: 'p-4',
          text: '“A leitura abre horizontes para o pensamento e a imaginação de forma ilimitada.”',
          type: 'quote',
          isQuote: true,
        },
        {
          id: 'p-5',
          text: 'Você pode criar marcadores no índice a qualquer momento selecionando qualquer texto ou clicando no botão do parágrafo, além de salvar todo o seu trabalho com o formato de projeto .audiobook.',
          type: 'text',
        },
        {
          id: 'p-6',
          text: 'Nota: Você pode editar, juntar ou puxar frases entre páginas a qualquer momento.',
          type: 'footnote',
          isFootnote: true,
        },
      ],
    },
  ],
};

export function useBookLibrary() {
  const [books, setBooks] = useState<BookItem[]>([DEFAULT_WELCOME_BOOK]);
  const [activeBookId, setActiveBookId] = useState<string>(DEFAULT_WELCOME_BOOK.id);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Load books from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const rawParsedBooks: BookItem[] = JSON.parse(saved);
        if (Array.isArray(rawParsedBooks) && rawParsedBooks.length > 0) {
          // Repair potential corrupted paragraphs where text or type became objects
          const parsedBooks = rawParsedBooks.map(book => {
            const repSections = book.sections.map(sec => {
               const repParas = sec.paragraphs.map(p => {
                 let newText = p.text;
                 let newType = p.type;
                 
                 if (typeof p.text === 'object' && p.text !== null) {
                   newText = (p.text as any).text || '';
                 }
                 if (typeof p.type === 'object' && p.type !== null) {
                   newType = (p.type as any).type || 'text';
                 }
                 
                 return { ...p, text: newText, type: newType };
               });
               return { ...sec, paragraphs: repParas };
            });
            return { ...book, sections: repSections };
          });

          setBooks(parsedBooks);
          const savedActiveId = localStorage.getItem(ACTIVE_BOOK_ID_KEY);
          if (savedActiveId && parsedBooks.some((b) => b.id === savedActiveId)) {
            setActiveBookId(savedActiveId);
          } else {
            setActiveBookId(parsedBooks[0].id);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved audiobook library from localStorage:', e);
    }
  }, []);

  const persistBooks = (updatedBooks: BookItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
    } catch (e) {
      console.warn('Failed to save books to localStorage:', e);
    }
  };

  const selectBook = useCallback((bookId: string) => {
    setActiveBookId(bookId);
    try {
      localStorage.setItem(ACTIVE_BOOK_ID_KEY, bookId);
    } catch (e) {}
  }, []);

  const addDocumentFile = useCallback(async (file: File): Promise<BookItem> => {
    setIsProcessingFile(true);
    setProcessingStatus(`Lendo ${file.name}...`);

    try {
      let parsedBook: BookItem;
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith('.audiobook') || (fileNameLower.endsWith('.json') && !fileNameLower.includes('package'))) {
        setProcessingStatus('Restaurando projeto salvo (.audiobook)...');
        const project = await importAudiobookProject(file);
        parsedBook = project.book;
      } else if (fileNameLower.endsWith('.pdf')) {
        setProcessingStatus('Extraindo páginas e estrutura do PDF...');
        parsedBook = await parsePdfFile(file);
      } else if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
        setProcessingStatus('Processando documento Word...');
        parsedBook = await parseDocxFile(file);
      } else if (fileNameLower.endsWith('.epub')) {
        setProcessingStatus('Descompactando capítulos do ePub...');
        parsedBook = await parseEpubFile(file);
      } else {
        setProcessingStatus('Processando arquivo de texto...');
        parsedBook = await parseTextFile(file);
      }

      setBooks((prev) => {
        // Remove welcome guide once user uploads their first book
        const filtered = prev.filter((b) => b.id !== 'welcome-guide');
        const next = [parsedBook, ...filtered.filter((b) => b.id !== parsedBook.id)];
        persistBooks(next);
        return next;
      });

      setActiveBookId(parsedBook.id);
      try {
        localStorage.setItem(ACTIVE_BOOK_ID_KEY, parsedBook.id);
      } catch (e) {}

      return parsedBook;
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
    }
  }, []);

  const addPastedText = useCallback(
    (title: string, text: string, author?: string): BookItem => {
      const parsedBook = parseRawTextContent(title, text, author);

      setBooks((prev) => {
        const filtered = prev.filter((b) => b.id !== 'welcome-guide');
        const next = [parsedBook, ...filtered.filter((b) => b.id !== parsedBook.id)];
        persistBooks(next);
        return next;
      });

      setActiveBookId(parsedBook.id);
      try {
        localStorage.setItem(ACTIVE_BOOK_ID_KEY, parsedBook.id);
      } catch (e) {}

      return parsedBook;
    },
    []
  );

  const deleteBook = useCallback(
    (bookId: string) => {
      setBooks((prev) => {
        const next = prev.filter((b) => b.id !== bookId);
        const resolvedList = next.length > 0 ? next : [DEFAULT_WELCOME_BOOK];
        persistBooks(resolvedList);

        if (activeBookId === bookId) {
          const nextActive = resolvedList[0].id;
          setActiveBookId(nextActive);
          try {
            localStorage.setItem(ACTIVE_BOOK_ID_KEY, nextActive);
          } catch (e) {}
        }
        return resolvedList;
      });
    },
    [activeBookId]
  );

  const updateBookInfo = useCallback(
    (bookId: string, updates: Partial<Pick<BookItem, 'title' | 'author' | 'subtitle'>>) => {
      setBooks((prev) => {
        const next = prev.map((b) => (b.id === bookId ? { ...b, ...updates } : b));
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const updateBookSections = useCallback((bookId: string, updatedSections: SectionItem[]) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              totalChapters: updatedSections.length,
              sections: updatedSections,
            }
          : b
      );
      persistBooks(next);
      return next;
    });
  }, []);

  const updateBookBookmarks = useCallback((bookId: string, updatedBookmarks: BookmarkItem[]) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              bookmarks: updatedBookmarks,
            }
          : b
      );
      persistBooks(next);
      return next;
    });
  }, []);

  // Add a custom bookmark to active book
  const addCustomBookmark = useCallback(
    (
      bookId: string,
      bookmarkData: {
        title: string;
        sectionIndex: number;
        paragraphIndex?: number;
        paragraphId?: string;
        pageNumber?: number;
      }
    ) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== bookId) return b;
          const currentBM = b.bookmarks || [];
          const updatedBM = addBookmarkToTree(currentBM, bookmarkData);
          return {
            ...b,
            bookmarks: updatedBM,
          };
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  // Delete a custom bookmark
  const deleteCustomBookmark = useCallback((bookId: string, bookmarkId: string) => {
    setBooks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== bookId) return b;
        const currentBM = b.bookmarks || [];
        const updatedBM = deleteBookmarkFromTree(currentBM, bookmarkId);
        return {
          ...b,
          bookmarks: updatedBM,
        };
      });
      persistBooks(next);
      return next;
    });
  }, []);

  const updateSectionTitle = useCallback(
    (bookId: string, sectionIndex: number, newTitle: string, isPartTitle?: boolean) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            if (isPartTitle) {
              updatedSections[sectionIndex] = {
                ...updatedSections[sectionIndex],
                partTitle: newTitle,
              };
            } else {
              updatedSections[sectionIndex] = {
                ...updatedSections[sectionIndex],
                chapterTitle: newTitle,
              };
            }
            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const moveSection = useCallback(
    (bookId: string, fromIndex: number, toIndex: number) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId) {
            if (fromIndex < 0 || fromIndex >= b.sections.length || toIndex < 0 || toIndex >= b.sections.length) {
              return b;
            }
            const newSections = [...b.sections];
            const [moved] = newSections.splice(fromIndex, 1);
            newSections.splice(toIndex, 0, moved);

            const reindexed = newSections.map((sec, idx) => ({
              ...sec,
              chapterNumber: idx + 1,
            }));

            return {
              ...b,
              sections: reindexed,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const mergeSectionWithNext = useCallback((bookId: string, sectionIndex: number) => {
    setBooks((prev) => {
      const next = prev.map((b) => {
        if (b.id === bookId && sectionIndex >= 0 && sectionIndex < b.sections.length - 1) {
          const s1 = b.sections[sectionIndex];
          const s2 = b.sections[sectionIndex + 1];

          const mergedSection: SectionItem = {
            ...s1,
            paragraphs: [...s1.paragraphs, ...s2.paragraphs],
            durationEstimateMinutes: s1.durationEstimateMinutes + s2.durationEstimateMinutes,
            partTitle: s1.partTitle || s2.partTitle,
            pageRange: s1.pageRange && s2.pageRange ? `${s1.pageRange}, ${s2.pageRange}` : s1.pageRange || s2.pageRange,
          };

          const newSections = [...b.sections];
          newSections.splice(sectionIndex, 2, mergedSection);

          const reindexed = newSections.map((sec, idx) => ({
            ...sec,
            chapterNumber: idx + 1,
          }));

          return {
            ...b,
            totalChapters: reindexed.length,
            sections: reindexed,
          };
        }
        return b;
      });
      persistBooks(next);
      return next;
    });
  }, []);

  const splitSectionAtParagraph = useCallback(
    (bookId: string, sectionIndex: number, paragraphIndex: number) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const sec = b.sections[sectionIndex];
            if (paragraphIndex <= 0 || paragraphIndex >= sec.paragraphs.length) {
              return b;
            }

            const p1 = sec.paragraphs.slice(0, paragraphIndex);
            const p2 = sec.paragraphs.slice(paragraphIndex);

            const sec1: SectionItem = {
              ...sec,
              id: `sec-${Date.now()}-1`,
              paragraphs: p1,
              durationEstimateMinutes: Math.max(1, Math.round(p1.length * 0.4)),
            };

            const sec2: SectionItem = {
              ...sec,
              id: `sec-${Date.now()}-2`,
              chapterTitle: `${sec.chapterTitle} (Continuação)`,
              paragraphs: p2,
              durationEstimateMinutes: Math.max(1, Math.round(p2.length * 0.4)),
            };

            const newSections = [...b.sections];
            newSections.splice(sectionIndex, 1, sec1, sec2);

            const reindexed = newSections.map((s, idx) => ({
              ...s,
              chapterNumber: idx + 1,
            }));

            return {
              ...b,
              totalChapters: reindexed.length,
              sections: reindexed,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const addParagraph = useCallback(
    (bookId: string, sectionIndex: number, afterIndex: number, text: string, type: ParagraphType = 'text') => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            const sec = updatedSections[sectionIndex];
            const newParagraph: ParagraphItem = {
              id: `p-user-${Date.now()}`,
              text: text.trim(),
              type,
              isHeading: type === 'heading',
              isFootnote: type === 'footnote',
              isQuote: type === 'quote',
            };

            const newParas = [...sec.paragraphs];
            newParas.splice(afterIndex + 1, 0, newParagraph);

            updatedSections[sectionIndex] = {
              ...sec,
              paragraphs: newParas,
            };

            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const updateParagraph = useCallback(
    (
      bookId: string,
      sectionIndex: number,
      paragraphId: string,
      newText?: string,
      newType?: ParagraphType,
      isNonFree?: boolean
    ) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            const sec = updatedSections[sectionIndex];
            const updatedParas = sec.paragraphs.map((p) => {
              if (p.id === paragraphId) {
                return {
                  ...p,
                  text: newText !== undefined ? newText : p.text,
                  type: newType !== undefined ? newType : p.type,
                  isNonFree: isNonFree !== undefined ? isNonFree : p.isNonFree,
                  isHeading: newType === 'heading',
                  isFootnote: newType === 'footnote',
                  isQuote: newType === 'quote',
                };
              }
              return p;
            });

            updatedSections[sectionIndex] = {
              ...sec,
              paragraphs: updatedParas,
            };

            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const deleteParagraph = useCallback((bookId: string, sectionIndex: number, paragraphId: string) => {
    setBooks((prev) => {
      const next = prev.map((b) => {
        if (b.id === bookId && b.sections[sectionIndex]) {
          const updatedSections = [...b.sections];
          const sec = updatedSections[sectionIndex];
          const updatedParas = sec.paragraphs.filter((p) => p.id !== paragraphId);

          updatedSections[sectionIndex] = {
            ...sec,
            paragraphs: updatedParas.length > 0 ? updatedParas : [{ id: `p-${Date.now()}`, text: '', type: 'text' }],
          };

          return {
            ...b,
            sections: updatedSections,
          };
        }
        return b;
      });
      persistBooks(next);
      return next;
    });
  }, []);

  const joinParagraphs = useCallback(
    (bookId: string, sectionIndex: number, firstIndex: number, secondIndex?: number) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            const sec = updatedSections[sectionIndex];
            const target2 = secondIndex !== undefined ? secondIndex : firstIndex + 1;
            if (
              firstIndex < 0 ||
              target2 >= sec.paragraphs.length ||
              firstIndex >= sec.paragraphs.length ||
              firstIndex === target2
            ) {
              return b;
            }

            const p1 = sec.paragraphs[firstIndex];
            const p2 = sec.paragraphs[target2];
            if (!p1 || !p2) return b;

            const combinedText = `${p1.text.trim()} ${p2.text.trim()}`.trim();
            const mergedPara: ParagraphItem = {
              ...p1,
              text: combinedText,
              type: p1.type || p2.type || 'text',
              isHeading: p1.isHeading && p2.isHeading,
              isFootnote: p1.isFootnote || p2.isFootnote,
              isQuote: p1.isQuote || p2.isQuote,
              isNonFree: p1.isNonFree && p2.isNonFree,
            };

            const newParas = [...sec.paragraphs];
            newParas[firstIndex] = mergedPara;
            newParas.splice(target2, 1);

            updatedSections[sectionIndex] = {
              ...sec,
              paragraphs: newParas,
            };

            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const joinFirstSentenceToPrevious = useCallback(
    (bookId: string, currentSecIdx: number, currentParaIdx: number) => {
      let resultSummary: {
        transferredSentence: string;
        mergedWholeBlock: boolean;
        prevSecIdx: number;
        prevParaIdx: number;
        remainingText: string;
      } | null = null;

      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== bookId) return b;
          const res = transferFirstSentenceToPrevious(b.sections, currentSecIdx, currentParaIdx);
          if (!res) return b;
          resultSummary = {
            transferredSentence: res.transferredSentence,
            mergedWholeBlock: res.mergedWholeBlock,
            prevSecIdx: res.prevSecIdx,
            prevParaIdx: res.prevParaIdx,
            remainingText: res.remainingText,
          };
          return {
            ...b,
            totalChapters: res.updatedSections.length,
            sections: res.updatedSections,
          };
        });
        persistBooks(next);
        return next;
      });

      return resultSummary;
    },
    []
  );

  const autoFixPageTransitions = useCallback((bookId: string) => {
    let joinedCount = 0;
    setBooks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== bookId) return b;
        const res = applyAllHighConfidenceTransitions(b.sections, 70);
        joinedCount = res.joinedCount;
        return {
          ...b,
          totalChapters: res.updatedSections.length,
          sections: res.updatedSections,
        };
      });
      persistBooks(next);
      return next;
    });
    return joinedCount;
  }, []);

  const moveParagraph = useCallback(
    (bookId: string, sectionIndex: number, fromIndex: number, direction: 'up' | 'down') => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            const sec = updatedSections[sectionIndex];
            const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
            if (toIndex < 0 || toIndex >= sec.paragraphs.length) return b;
            const newParas = [...sec.paragraphs];
            const [moved] = newParas.splice(fromIndex, 1);
            newParas.splice(toIndex, 0, moved);

            updatedSections[sectionIndex] = {
              ...sec,
              paragraphs: newParas,
            };

            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const applyGlobalTextAction = useCallback(
    (
      bookId: string,
      term: string,
      action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'
    ) => {
      const cleanTerm = term.trim();
      if (!cleanTerm) return 0;

      let affectedCount = 0;

      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== bookId) return b;

          const updatedSections = b.sections.map((sec) => {
            const newParas: ParagraphItem[] = [];

            for (const p of sec.paragraphs) {
              const text = p.text;
              const hasMatch = text.toLowerCase().includes(cleanTerm.toLowerCase());

              if (!hasMatch) {
                newParas.push(p);
                continue;
              }

              affectedCount++;

              if (action === 'remove_term') {
                const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'gi');
                const newText = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
                if (newText.length > 0) {
                  newParas.push({ ...p, text: newText });
                }
              } else if (action === 'split_term') {
                const lowerText = text.toLowerCase();
                const lowerTerm = cleanTerm.toLowerCase();
                const idx = lowerText.indexOf(lowerTerm);

                if (idx !== -1) {
                  const before = text.substring(0, idx).trim();
                  const matched = text.substring(idx, idx + cleanTerm.length).trim();
                  const after = text.substring(idx + cleanTerm.length).trim();

                  if (before) {
                    newParas.push({
                      id: `p-pre-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      text: before,
                      page: p.page,
                      type: p.type,
                    });
                  }

                  newParas.push({
                    id: `p-term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    text: matched,
                    page: p.page,
                    type: 'header_footer',
                    isHeaderFooter: true,
                    isNonFree: true,
                  });

                  if (after) {
                    newParas.push({
                      id: `p-post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      text: after,
                      page: p.page,
                      type: p.type,
                    });
                  }
                } else {
                  newParas.push(p);
                }
              } else if (action === 'mark_pretextual') {
                newParas.push({
                  ...p,
                  type: 'pre_post_textual',
                  isPrePostTextual: true,
                  isNonFree: true,
                });
              } else if (action === 'omit_block') {
                newParas.push({
                  ...p,
                  isNonFree: true,
                });
              } else if (action === 'mark_footnote') {
                newParas.push({
                  ...p,
                  type: 'footnote',
                  isFootnote: true,
                  isQuote: false,
                  isHeading: false,
                });
              } else if (action === 'mark_quote') {
                newParas.push({
                  ...p,
                  type: 'quote',
                  isQuote: true,
                  isFootnote: false,
                  isHeading: false,
                });
              } else if (action === 'mark_heading') {
                newParas.push({
                  ...p,
                  type: 'heading',
                  isHeading: true,
                  isQuote: false,
                  isFootnote: false,
                });
              }
            }

            return {
              ...sec,
              paragraphs: newParas.length > 0 ? newParas : sec.paragraphs,
            };
          });

          return {
            ...b,
            sections: updatedSections,
          };
        });

        persistBooks(next);
        return next;
      });

      return affectedCount;
    },
    []
  );

  const recalibrateActiveBook = useCallback(
    (bookId: string, options: CalibrationOptions) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== bookId) return b;
          const updatedSections = recalibrateDocumentParagraphs(b.sections, options);
          return {
            ...b,
            sections: updatedSections,
          };
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const resetAllAppData = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVE_BOOK_ID_KEY);
        localStorage.removeItem('audiobook_theme');
        localStorage.removeItem('audiobook_reader_width');
        localStorage.removeItem('audiobook_font_size');
        localStorage.removeItem('audiobook_auto_scroll');
        localStorage.removeItem('audiobook_speed');
      }
    } catch (e) {
      console.warn('Reset error:', e);
    }
    setBooks([DEFAULT_WELCOME_BOOK]);
    setActiveBookId(DEFAULT_WELCOME_BOOK.id);
  }, []);

  const saveSectionTranslations = useCallback(
    (bookId: string, sectionIndex: number, translations: Record<string, string>, targetLang: string) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id === bookId && b.sections[sectionIndex]) {
            const updatedSections = [...b.sections];
            const sec = updatedSections[sectionIndex];
            
            const updatedParas = sec.paragraphs.map((p) => {
              if (translations[p.id]) {
                return {
                  ...p,
                  translations: {
                    ...(p.translations || {}),
                    [targetLang]: translations[p.id]
                  }
                };
              }
              return p;
            });

            updatedSections[sectionIndex] = {
              ...sec,
              paragraphs: updatedParas,
            };

            return {
              ...b,
              sections: updatedSections,
            };
          }
          return b;
        });
        persistBooks(next);
        return next;
      });
    },
    []
  );

  const activeBook = books.find((b) => b.id === activeBookId) || books[0] || DEFAULT_WELCOME_BOOK;

  return {
    books,
    activeBook,
    activeBookId,
    selectBook,
    addDocumentFile,
    addPastedText,
    deleteBook,
    updateBookInfo,
    updateBookSections,
    updateBookBookmarks,
    addCustomBookmark,
    deleteCustomBookmark,
    updateSectionTitle,
    moveSection,
    mergeSectionWithNext,
    splitSectionAtParagraph,
    addParagraph,
    updateParagraph,
    moveParagraph,
    joinParagraphs,
    joinFirstSentenceToPrevious,
    autoFixPageTransitions,
    deleteParagraph,
    applyGlobalTextAction,
    recalibrateActiveBook,
    resetAllAppData,
    saveSectionTranslations,
    isProcessingFile,
    processingStatus,
  };
}
