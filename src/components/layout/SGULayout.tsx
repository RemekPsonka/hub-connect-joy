import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SGUSidebar } from './SGUSidebar';
import { SGUHeader } from './SGUHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLayoutMode } from '@/store/layoutMode';

export function SGULayout() {
  const { mode, setMode } = useLayoutMode();

  // Entering /sgu/* → ensure mode flag matches (so toggle reflects reality)
  useEffect(() => {
    if (mode !== 'sgu') setMode('sgu');
  }, [mode, setMode]);

  return (
    <div data-sgu-theme="true">
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <SGUSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            <SGUHeader />

            <main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
