import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RemekWidgetContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const RemekWidgetContext = createContext<RemekWidgetContextType | undefined>(undefined);

const STORAGE_KEY = 'remek_widget_open';

export function RemekWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });

  // Sync with sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const toggle = () => setIsOpen(prev => !prev);

  return (
    <RemekWidgetContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </RemekWidgetContext.Provider>
  );
}

export function useRemekWidget() {
  const context = useContext(RemekWidgetContext);
  if (!context) {
    throw new Error('useRemekWidget must be used within RemekWidgetProvider');
  }
  return context;
}
