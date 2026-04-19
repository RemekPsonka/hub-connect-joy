import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLayoutMode } from '@/store/layoutMode';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';

function LayoutModeToggle() {
  const { mode, setMode } = useLayoutMode();
  const navigate = useNavigate();
  const { isAdmin } = useOwnerPanel();
  const { isSuperadmin } = useSuperadmin();

  if (!isAdmin && !isSuperadmin) return null;

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        const next = value === 'sgu' ? 'sgu' : 'crm';
        setMode(next);
        navigate(next === 'sgu' ? '/sgu/dashboard' : '/');
      }}
    >
      <TabsList className="h-8">
        <TabsTrigger value="crm" className="text-xs px-3">CRM</TabsTrigger>
        <TabsTrigger value="sgu" className="text-xs px-3">SGU</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function SGUHeader() {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-semibold text-foreground">Moduł SGU</span>
      </div>
      <LayoutModeToggle />
    </header>
  );
}
