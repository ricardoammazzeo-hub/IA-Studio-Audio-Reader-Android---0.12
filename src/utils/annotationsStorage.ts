import { TextAnnotation, BookItem } from '../types';

const STORAGE_PREFIX = 'audiobook_annotations_';

export function getStoredAnnotations(bookId: string): TextAnnotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${bookId}`);
    if (!raw) return [];
    return JSON.parse(raw) as TextAnnotation[];
  } catch (err) {
    console.error('Failed to load annotations from localStorage:', err);
    return [];
  }
}

export function saveStoredAnnotations(bookId: string, annotations: TextAnnotation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${bookId}`, JSON.stringify(annotations));
  } catch (err) {
    console.error('Failed to save annotations to localStorage:', err);
  }
}

export function upsertAnnotation(annotation: TextAnnotation): TextAnnotation[] {
  if (!annotation.bookId) return [];
  const existing = getStoredAnnotations(annotation.bookId);
  const id = annotation.id && annotation.id.trim().length > 0
    ? annotation.id
    : `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const fullAnnotation: TextAnnotation = {
    ...annotation,
    id,
    color: annotation.color || 'yellow',
    selectedText: (annotation.selectedText || '').trim(),
    comment: (annotation.comment || '').trim(),
    createdAt: annotation.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const index = existing.findIndex((a) => a.id === id);
  let updated: TextAnnotation[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = fullAnnotation;
  } else {
    updated = [fullAnnotation, ...existing];
  }
  saveStoredAnnotations(annotation.bookId, updated);
  return updated;
}

export function removeAnnotation(bookId: string, annotationId: string): TextAnnotation[] {
  const existing = getStoredAnnotations(bookId);
  const updated = existing.filter((a) => a.id !== annotationId);
  saveStoredAnnotations(bookId, updated);
  return updated;
}

// Convenient alias exports
export const loadAnnotations = getStoredAnnotations;
export const saveAnnotation = (bookId: string, annotation: TextAnnotation): TextAnnotation[] => {
  return upsertAnnotation({ ...annotation, bookId });
};
export const deleteAnnotation = removeAnnotation;

export function exportAnnotationsAsMarkdown(book: BookItem, annotations: TextAnnotation[]): string {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  let md = `# Anotações e Destaques: ${book.title}\n`;
  if (book.author) md += `**Autor:** ${book.author}\n`;
  md += `**Data da Exportação:** ${dateStr}\n`;
  md += `**Total de Destaques/Notas:** ${annotations.length}\n\n---\n\n`;

  if (annotations.length === 0) {
    md += `*Nenhuma anotação registrada ainda.*\n`;
    return md;
  }

  // Sort by section index
  const sorted = [...annotations].sort((a, b) => a.sectionIndex - b.sectionIndex);

  sorted.forEach((ann, idx) => {
    const section = book.sections[ann.sectionIndex];
    const pageNumber = section?.chapterNumber || ann.sectionIndex + 1;
    const colorLabel =
      ann.color === 'yellow'
        ? '🟡 Amarelo'
        : ann.color === 'green'
        ? '🟢 Verde'
        : ann.color === 'blue'
        ? '🔵 Azul'
        : ann.color === 'pink'
        ? '🔴 Rosa'
        : ann.color === 'purple'
        ? '🟣 Roxo'
        : '🟠 Laranja';

    md += `### ${idx + 1}. Página / Seção ${pageNumber} (${colorLabel})\n\n`;
    md += `> "${ann.selectedText}"\n\n`;
    if (ann.comment && ann.comment.trim()) {
      md += `**📝 Comentário:**\n${ann.comment}\n\n`;
    }
    md += `*Registrado em: ${new Date(ann.createdAt).toLocaleString('pt-BR')}*\n\n---\n\n`;
  });

  return md;
}
