import { BookItem, TextAnnotation, BookmarkItem } from '../types';
import { loadAnnotations, saveAnnotation } from './annotationsStorage';
import { logger } from './appLogger';

export interface AudiobookProjectFile {
  formatVersion: '1.0';
  app: 'UniversalAudiobookReader';
  exportedAt: string;
  book: BookItem;
  annotations: TextAnnotation[];
}

/**
 * Exports the active book, complete structural edits, custom bookmarks,
 * paragraph type definitions, and text annotations to a standalone .audiobook JSON file.
 */
export function exportAudiobookProject(
  book: BookItem,
  annotations?: TextAnnotation[]
): void {
  const resolvedAnnotations = annotations || loadAnnotations(book.id);

  const projectData: AudiobookProjectFile = {
    formatVersion: '1.0',
    app: 'UniversalAudiobookReader',
    exportedAt: new Date().toISOString(),
    book: {
      ...book,
    },
    annotations: resolvedAnnotations,
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeTitle = (book.title || 'Livro').replace(/[^\w\s\u00C0-\u00FF-]/g, '').trim().replace(/\s+/g, '_');
  const filename = `${safeTitle || 'projeto'}_salvo.audiobook`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.action('ProjectSave', `Projeto exportado com sucesso: "${filename}"`);
}

/**
 * Imports and parses a .audiobook or .json project file.
 */
export async function importAudiobookProject(
  file: File
): Promise<{ book: BookItem; annotations: TextAnnotation[] }> {
  const text = await file.text();
  let parsed: any;

  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('O arquivo selecionado não é um arquivo JSON ou .audiobook válido.');
  }

  // Handle direct BookItem JSON or wrapped AudiobookProjectFile
  let importedBook: BookItem;
  let importedAnnotations: TextAnnotation[] = [];

  if (parsed.formatVersion === '1.0' && parsed.book) {
    importedBook = parsed.book;
    if (Array.isArray(parsed.annotations)) {
      importedAnnotations = parsed.annotations;
    }
  } else if (parsed.id && Array.isArray(parsed.sections)) {
    // Direct BookItem format
    importedBook = parsed as BookItem;
  } else {
    throw new Error('A estrutura do arquivo de projeto não foi reconhecida.');
  }

  // Ensure unique ID or preserve ID
  if (!importedBook.id) {
    importedBook.id = `book-imported-${Date.now()}`;
  }

  // Restore annotations to local storage for this book
  if (importedAnnotations.length > 0) {
    importedAnnotations.forEach((ann) => {
      saveAnnotation(importedBook.id, {
        ...ann,
        bookId: importedBook.id,
      });
    });
  }

  logger.action('ProjectImport', `Projeto "${importedBook.title}" importado com sucesso.`);

  return {
    book: importedBook,
    annotations: importedAnnotations,
  };
}
