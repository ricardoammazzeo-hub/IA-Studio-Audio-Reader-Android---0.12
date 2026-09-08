import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  BookOpen,
  PlayCircle,
  Clock,
  Layers,
  FileText,
  Plus,
  Trash2,
  Folder,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import { BookmarkItem, SectionItem, ReadingTheme } from '../types';
import {
  generateSmartBookmarksFromSections,
  filterBookmarkTree,
  countBookmarkNodes,
  resolveBookmarkLocation,
  addBookmarkToTree,
  deleteBookmarkFromTree,
} from '../utils/bookmarkTree';
import { soundEffects } from '../utils/soundEffects';

interface CascadingBookmarksIndexProps {
  sections: SectionItem[];
  bookmarks?: BookmarkItem[];
  activeSectionIndex: number;
  currentParagraphIndex?: number;
  onSelectBookmark: (sectionIndex: number, paragraphIndex?: number, paragraphId?: string) => void;
  onUpdateBookmarks?: (bookmarks: BookmarkItem[]) => void;
  theme: ReadingTheme;
  mode?: 'sidebar' | 'modal';
  onClose?: () => void;
}

export const CascadingBookmarksIndex: React.FC<CascadingBookmarksIndexProps> = ({
  sections,
  bookmarks: initialBookmarks,
  activeSectionIndex,
  currentParagraphIndex = 0,
  onSelectBookmark,
  onUpdateBookmarks,
  theme,
  mode = 'sidebar',
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});
  const [isAddingBookmark, setIsAddingBookmark] = useState<boolean>(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState<string>('');

  // Compute or load smart bookmarks
  const baseBookmarks = useMemo(() => {
    return generateSmartBookmarksFromSections(sections, initialBookmarks);
  }, [sections, initialBookmarks]);

  // Filtered by search
  const displayedBookmarks = useMemo(() => {
    return filterBookmarkTree(baseBookmarks, searchQuery);
  }, [baseBookmarks, searchQuery]);

  const totalCount = useMemo(() => countBookmarkNodes(baseBookmarks), [baseBookmarks]);

  // Toggle node expansion
  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds((prev) => ({
      ...prev,
      [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId],
    }));
  };

  // Expand all / Collapse all
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    const traverse = (list: BookmarkItem[]) => {
      list.forEach((item) => {
        next[item.id] = true;
        if (item.children) traverse(item.children);
      });
    };
    traverse(baseBookmarks);
    setExpandedNodeIds(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    const traverse = (list: BookmarkItem[]) => {
      list.forEach((item) => {
        next[item.id] = false;
        if (item.children) traverse(item.children);
      });
    };
    traverse(baseBookmarks);
    setExpandedNodeIds(next);
  };

  // Handle adding custom bookmark at current reading position
  const handleSaveCurrentPositionBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBookmarkTitle.trim();
    if (!title) return;

    const updated = addBookmarkToTree(baseBookmarks, {
      title,
      sectionIndex: activeSectionIndex,
      paragraphIndex: currentParagraphIndex,
      pageNumber: activeSectionIndex + 1,
      level: 1,
    });

    if (onUpdateBookmarks) {
      onUpdateBookmarks(updated);
    }
    soundEffects.success();
    setNewBookmarkTitle('');
    setIsAddingBookmark(false);
  };

  // Handle deleting bookmark
  const handleDeleteBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteBookmarkFromTree(baseBookmarks, id);
    if (onUpdateBookmarks) {
      onUpdateBookmarks(updated);
    }
    soundEffects.click();
  };

  // Recursive tree node renderer
  const renderBookmarkNode = (node: BookmarkItem, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodeIds[node.id] !== undefined ? expandedNodeIds[node.id] : true;
    const isTargetSection = node.sectionIndex === activeSectionIndex;
    const indentPadding = depth * 12 + 6;

    return (
      <div key={node.id} className="select-none group/node">
        <div
          onClick={() => {
            const loc = resolveBookmarkLocation(node, sections);
            onSelectBookmark(loc.sectionIndex, loc.paragraphIndex, loc.paragraphId);
            if (mode === 'modal' && onClose) {
              onClose();
            }
          }}
          style={{ paddingLeft: `${indentPadding}px` }}
          className={`pr-2 py-1.5 rounded-xl flex items-center justify-between gap-1.5 cursor-pointer text-xs transition-all ${
            isTargetSection
              ? 'bg-amber-600/15 text-amber-900 dark:text-amber-300 font-bold border-l-3 border-amber-600'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-90 hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expansion Arrow */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 inline-block shrink-0" />
            )}

            {/* Folder / Bookmark icon */}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" />
              )
            ) : (
              <Bookmark className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            )}

            {/* Title */}
            <span className="truncate text-left font-serif leading-tight">
              {node.title}
            </span>
          </div>

          {/* Page Badge & Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {node.pageNumber && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-70">
                Pág. {node.pageNumber}
              </span>
            )}

            {/* Delete custom bookmark */}
            {onUpdateBookmarks && (
              <button
                type="button"
                title="Excluir este marcador"
                onClick={(e) => handleDeleteBookmark(e, node.id)}
                className="p-1 rounded opacity-0 group-hover/node:opacity-100 hover:bg-rose-500/20 text-rose-500 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Child nodes */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5 border-l border-black/5 dark:border-white/5 ml-3">
            {node.children!.map((child) => renderBookmarkNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Action Bar */}
      <div className="p-3 border-b border-black/10 dark:border-white/10 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no índice..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100"
            >
              Expandir Tudo
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100"
            >
              Recolher
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingBookmark(!isAddingBookmark)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs transition"
          >
            <Plus className="w-3 h-3" />
            <span>+ Marcador</span>
          </button>
        </div>

        {/* Add custom bookmark form */}
        {isAddingBookmark && (
          <form onSubmit={handleSaveCurrentPositionBookmark} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fadeIn">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
              Marcar posição atual (Página {activeSectionIndex + 1}):
            </p>
            <input
              type="text"
              value={newBookmarkTitle}
              onChange={(e) => setNewBookmarkTitle(e.target.value)}
              placeholder="Nome do marcador (ex: Capítulo 3, Conceito X)..."
              autoFocus
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-500/40 outline-none text-slate-800 dark:text-slate-100"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingBookmark(false)}
                className="px-2.5 py-1 text-[11px] rounded hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Salvar Marcador
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bookmark Tree Content */}
      <div className="p-2 overflow-y-auto flex-1 space-y-0.5">
        {displayedBookmarks.length === 0 ? (
          <div className="text-center py-8 px-4 opacity-80 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-amber-600/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
              <Bookmark className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-serif font-bold">
              {searchQuery ? 'Nenhum marcador encontrado para esta busca' : 'Sem marcadores no documento original'}
            </p>
            <p className="text-[11px] mt-1.5 opacity-75 max-w-xs leading-relaxed">
              {searchQuery
                ? 'Tente outro termo de busca.'
                : 'O arquivo não possui índice embutido. Você pode criar seus próprios marcadores para acessar rapidamente qualquer parte.'}
            </p>
            {!searchQuery && !isAddingBookmark && (
              <button
                type="button"
                onClick={() => setIsAddingBookmark(true)}
                className="mt-4 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Marcador na Pág. {activeSectionIndex + 1}</span>
              </button>
            )}
          </div>
        ) : (
          displayedBookmarks.map((node) => renderBookmarkNode(node, 0))
        )}
      </div>
    </div>
  );
};
