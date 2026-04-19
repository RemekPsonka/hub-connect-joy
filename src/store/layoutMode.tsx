import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type LayoutMode = 'crm' | 'sgu';
const STORAGE_KEY = 'sgu.layoutMode';

interface LayoutModeContextValue {
  mode: LayoutMode;
  setMode: (mode: LayoutMode) => void;
  toggle: () => void;
}

const LayoutModeContext = createContext<LayoutModeContextValue | undefined>(undefined);

function readInitialMode(): LayoutMode {
  if (typeof window === 'undefined') return 'crm';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'sgu' ? 'sgu' : 'crm';
}

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>(readInitialMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const setMode = useCallback((next: LayoutMode) => setModeState(next), []);
  const toggle = useCallback(() => setModeState((prev) => (prev === 'crm' ? 'sgu' : 'crm')), []);

  return (
    <LayoutModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode(): LayoutModeContextValue {
  const ctx = useContext(LayoutModeContext);
  if (!ctx) throw new Error('useLayoutMode must be used within LayoutModeProvider');
  return ctx;
}
