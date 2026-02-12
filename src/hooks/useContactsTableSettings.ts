import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'contacts-table-settings';

export interface ContactsTableColumns {
  company: boolean;
  funnels: boolean;
  phone: boolean;
  email: boolean;
  group: boolean;
  aiProfile: boolean;
  relationshipStrength: boolean;
}

export interface ContactsTableFilters {
  groupId: string;
  companyId: string;
  dealTeamId: string;
  dealCategory: string;
  aiProfileStatus: string;
}

export interface ContactsTableSettings {
  columns: ContactsTableColumns;
  filters: ContactsTableFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageSize: number;
}

const DEFAULT_SETTINGS: ContactsTableSettings = {
  columns: {
    company: true,
    funnels: true,
    phone: true,
    email: true,
    group: true,
    aiProfile: true,
    relationshipStrength: true,
  },
  filters: {
    groupId: '',
    companyId: '',
    dealTeamId: '',
    dealCategory: '',
    aiProfileStatus: '',
  },
  sortBy: 'full_name',
  sortOrder: 'asc',
  pageSize: 20,
};

function loadSettings(): ContactsTableSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, columns: { ...DEFAULT_SETTINGS.columns, ...parsed.columns }, filters: { ...DEFAULT_SETTINGS.filters, ...parsed.filters } };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function useContactsTableSettings() {
  const [settings, setSettings] = useState<ContactsTableSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateColumns = useCallback((columns: Partial<ContactsTableColumns>) => {
    setSettings(prev => ({ ...prev, columns: { ...prev.columns, ...columns } }));
  }, []);

  const updateFilters = useCallback((filters: Partial<ContactsTableFilters>) => {
    setSettings(prev => ({ ...prev, filters: { ...prev.filters, ...filters } }));
  }, []);

  const updateSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setSettings(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const updatePageSize = useCallback((pageSize: number) => {
    setSettings(prev => ({ ...prev, pageSize }));
  }, []);

  return {
    settings,
    updateColumns,
    updateFilters,
    updateSort,
    updatePageSize,
  };
}
