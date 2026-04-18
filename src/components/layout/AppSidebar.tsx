import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutGrid,
  List,
  Users,
  MessageSquare,
  Settings,
  Network,
  Search,
  Target,
  Shield,
  Bug,
  UserCog,
  Briefcase,
  TrendingUp,
  CalendarCheck,
  UsersRound,
  Handshake,
  CalendarDays,
  BarChart3,
  Users2,
  FolderKanban,
  Sparkles,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Receipt,
  Moon,
  PieChart,
  DollarSign,
} from 'lucide-react';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

// OVERVIEW
const overviewItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Workspace', url: '/workspace', icon: Briefcase },
  { title: 'Kalendarz', url: '/calendar', icon: CalendarDays },
];

// CRM
const crmItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users, adminOnly: false },
  { title: 'Poszukiwani', url: '/wanted', icon: Target, adminOnly: false },
  { title: 'Sieć kontaktów', url: '/network', icon: Network, adminOnly: true },
];

// PROJEKTY
const projectItems = [
  { title: 'Projekty', url: '/projects', icon: FolderKanban },
  { title: 'Analityka zadań', url: '/tasks/analytics', icon: BarChart3 },
  { title: 'Raport zespołu', url: '/tasks/team-report', icon: Users2 },
  { title: 'Konsultacje', url: '/consultations', icon: CalendarCheck },
];

// SPRZEDAŻ
const salesItems = [
  { title: 'Spotkania', url: '/meetings', icon: UsersRound, adminOnly: false },
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase, adminOnly: true },
  { title: 'Dopasowania', url: '/matches', icon: Handshake, adminOnly: true },
];

const funnelSubItems = [
  { title: 'Dashboard', url: '/deals-team?view=dashboard', icon: PieChart },
  { title: 'Kanban', url: '/deals-team?view=kanban', icon: LayoutGrid },
  { title: 'Tabela', url: '/deals-team?view=table', icon: List },
  { title: 'Prospecting', url: '/deals-team?view=prospecting', icon: Search },
  { title: 'Klienci', url: '/deals-team?view=clients', icon: UserCheck },
  { title: 'Ofertowanie', url: '/deals-team?view=offering', icon: Briefcase },
  { title: 'Zadania', url: '/deals-team?view=tasks', icon: ClipboardList },
  { title: 'Prowizje', url: '/deals-team?view=commissions', icon: Receipt },
  { title: 'Odłożone', url: '/deals-team?view=snoozed', icon: Moon },
];

// AI
const aiItems = [
  { title: 'Sovra', url: '/sovra', icon: Sparkles },
  { title: 'AI Chat', url: '/ai', icon: MessageSquare },
  { title: 'Wyszukiwanie AI', url: '/search', icon: Search },
];

// SYSTEM
const systemItems = [
  { title: 'Analityka', url: '/analytics', icon: BarChart3 },
  { title: 'Ustawienia', url: '/settings', icon: Settings },
];

// Nawigacja dla asystenta - ograniczona
const assistantNavigationItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users },
];

function NavItem({ item }: { item: { title: string; url: string; icon: typeof Settings } }) {
  const location = useLocation();
  const hasQuery = item.url.includes('?');
  const basePath = hasQuery ? item.url.split('?')[0] : item.url;

  // Custom active detection for query-param links
  let isActiveItem = false;
  if (hasQuery) {
    if (location.pathname === basePath) {
      const itemParams = new URLSearchParams(item.url.split('?')[1]);
      const locParams = new URLSearchParams(location.search);
      isActiveItem = Array.from(itemParams.entries()).every(
        ([key, value]) => locParams.get(key) === value
      );
    }
  } else if (item.url === '/contacts') {
    // "Kontakty" should NOT be active when ?view=companies is set
    isActiveItem = location.pathname === '/contacts' && !location.search.includes('view=companies');
  } else if (item.url === '/') {
    isActiveItem = location.pathname === '/';
  } else {
    isActiveItem = location.pathname.startsWith(item.url);
  }

  const baseClass = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150";
  const activeClass = "bg-[hsl(263_70%_50%/0.2)] text-[hsl(263_70%_75%)] font-medium border-l-2 border-[hsl(263_70%_60%)] -ml-[2px]";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.url}
          end
          className={`${baseClass} ${isActiveItem ? activeClass : ''}`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleGroupLabel({ children, isCollapsed, isOpen, onToggle }: { children: string; isCollapsed: boolean; isOpen: boolean; onToggle: () => void }) {
  if (isCollapsed) return null;
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/35 px-3 mb-1 font-semibold hover:text-sidebar-foreground/60 transition-colors"
    >
      <span>{children}</span>
      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
    </button>
  );
}

function FunnelCollapsible({ isCollapsed }: { isCollapsed: boolean }) {
  const location = useLocation();
  const isFunnelActive = location.pathname === '/deals-team';
  const [open, setOpen] = useState(isFunnelActive);

  const baseClass = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150";
  const activeClass = "bg-[hsl(263_70%_50%/0.2)] text-[hsl(263_70%_75%)] font-medium border-l-2 border-[hsl(263_70%_60%)] -ml-[2px]";

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className={`${baseClass} w-full justify-between ${isFunnelActive ? 'text-sidebar-foreground font-medium' : ''}`}>
            <span className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Lejek sprzedaży</span>}
            </span>
            {!isCollapsed && (
              <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
            )}
          </button>
        </CollapsibleTrigger>
        {!isCollapsed && (
          <CollapsibleContent>
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
              {funnelSubItems.map((sub) => {
                const params = new URLSearchParams(sub.url.split('?')[1]);
                const isActive = location.pathname === '/deals-team' &&
                  Array.from(params.entries()).every(([k, v]) => new URLSearchParams(location.search).get(k) === v);

                return (
                  <SidebarMenuButton key={sub.title} asChild tooltip={sub.title}>
                    <NavLink
                      to={sub.url}
                      end
                      className={`${baseClass} py-1.5 text-xs ${isActive ? activeClass : ''}`}
                    >
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{sub.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </SidebarMenuItem>
  );
}
export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isAdmin } = useOwnerPanel();
  const { isAssistant, director, assistant } = useAuth();
  const { isSuperadmin } = useSuperadmin();
  const location = useLocation();

  const getUserRole = () => {
    if (isSuperadmin) return 'Superadmin';
    if (isAssistant) return 'Asystent';
    if (isAdmin) return 'Administrator';
    return 'Dyrektor';
  };

  const userName = isAssistant 
    ? assistant?.full_name 
    : director?.full_name;

  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  // Admin items
  const adminItems: Array<{ title: string; url: string; icon: typeof Settings }> = [];
  if (isAdmin) {
    adminItems.push({ title: 'Przedstawiciele', url: '/representatives', icon: UserCog });
    adminItems.push({ title: 'Zgłoszenia', url: '/bug-reports', icon: Bug });
    adminItems.push({ title: 'Zarządzanie', url: '/owner', icon: Shield });
    adminItems.push({ title: 'Koszty AI', url: '/owner/ai-costs', icon: DollarSign });
  }

  const navGroups = isAssistant
    ? [{ label: 'Menu', items: assistantNavigationItems }]
    : [
        { label: 'Overview', items: overviewItems },
        { label: 'CRM', items: crmItems },
        { label: 'Projekty', items: projectItems },
        { label: 'Sprzedaż', items: salesItems },
        { label: 'AI', items: aiItems },
        { label: 'System', items: systemItems },
      ];

  // Determine which groups should be open based on active route
  const initialOpenGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => {
        const basePath = item.url.split('?')[0];
        if (item.url === '/') return location.pathname === '/';
        return location.pathname.startsWith(basePath);
      });
      open[group.label] = hasActiveItem;
    });
    // If no group is active, open all
    if (!Object.values(open).some(v => v)) {
      navGroups.forEach(g => { open[g.label] = true; });
    }
    return open;
  }, []); // Only compute on mount

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo area */}
      <SidebarHeader className="border-b border-sidebar-border px-3 h-14 flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Network className="h-4.5 w-4.5 text-sidebar-primary" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground text-sm whitespace-nowrap tracking-tight">
              Network Assistant
            </span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <CollapsibleGroupLabel isCollapsed={isCollapsed} isOpen={openGroups[group.label] ?? true} onToggle={() => toggleGroup(group.label)}>
              {group.label}
            </CollapsibleGroupLabel>
            {(isCollapsed || openGroups[group.label] !== false) && (
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {/* Funnel collapsible in Sprzedaż group */}
                  {group.label === 'Sprzedaż' && !isAssistant && (
                    <FunnelCollapsible isCollapsed={isCollapsed} />
                  )}
                  {group.items
                    .filter((item) => !('adminOnly' in item && item.adminOnly) || isAdmin)
                    .map((item) => (
                    <NavItem key={item.title + item.url} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      {/* Footer — admin + user info */}
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        {adminItems.length > 0 && (
          <>
            {!isCollapsed && (
              <p className="text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/35 px-3 mb-1 font-semibold">
                Admin
              </p>
            )}
            <SidebarMenu className="space-y-0.5 mb-2">
              {adminItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </>
        )}
        
        {/* User info */}
        {userName && (
          <div className={`flex items-center gap-2.5 px-3 pt-3 mt-1 border-t border-sidebar-border ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/20 text-sidebar-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-sidebar-foreground/40">
                  {getUserRole()}
                </p>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
