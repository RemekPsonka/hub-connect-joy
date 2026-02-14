import { useState, useCallback } from 'react';

export interface KanbanColumnVisibility {
  hot: boolean;
  offering: boolean;
  audit: boolean;
  top: boolean;
  lead: boolean;
  tenx: boolean;
  cold: boolean;
  lost: boolean;
  prospecting: boolean;
}

const STORAGE_KEY = 'kanban-column-visibility';

const DEFAULT_COLUMNS: KanbanColumnVisibility = {
  hot: true,
  offering: true,
  audit: true,
  top: true,
  lead: true,
  tenx: true,
  cold: true,
  lost: true,
  prospecting: true,
};

function loadColumns(): KanbanColumnVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_COLUMNS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_COLUMNS };
}

export function useKanbanColumnSettings() {
  const [columns, setColumns] = useState<KanbanColumnVisibility>(loadColumns);

  const toggleColumn = useCallback((updates: Partial<KanbanColumnVisibility>) => {
    setColumns((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const visibleCount = Object.values(columns).filter(Boolean).length;

  return { columns, toggleColumn, visibleCount };
}
