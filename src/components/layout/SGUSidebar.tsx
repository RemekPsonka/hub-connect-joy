import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  TrendingUp,
  PieChart,
  LayoutGrid,
  List,
  Search,
  UserCheck,
  Briefcase,
  ClipboardList,
  Receipt,
  Moon,
  BarChart3,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { NavLink } from '@/components/NavLink';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { SGULogo } from '@/lib/sgu/SGULogo';

type IconType = typeof Settings;

interface NavItemDef {
  title: string;
  url: string;
  icon: IconType;
}

const overviewItems: NavItemDef[] = [
  { title: 'Dashboard', url: '/sgu/dashboard', icon: LayoutDashboard },
  { title: 'Dziennik', url: '/sgu/tasks', icon: ListTodo },
  { title: 'Mój zespół', url: '/sgu/team', icon: Users },
];

const funnelSubItems: NavItemDef[] = [
  { title: 'Dashboard', url: '/sgu/pipeline?view=dashboard', icon: PieChart },
  { title: 'Kanban', url: '/sgu/pipeline?view=kanban', icon: LayoutGrid },
  { title: 'Tabela', url: '/sgu/pipeline?view=table', icon: List },
  { title: 'Prospecting', url: '/sgu/pipeline?view=prospecting', icon: Search },
  { title: 'Klienci', url: '/sgu/pipeline?view=clients', icon: UserCheck },
  { title: 'Ofertowanie', url: '/sgu/pipeline?view=offering', icon: Briefcase },
  { title: 'Zadania', url: '/sgu/pipeline?view=tasks', icon: ClipboardList },
  { title: 'Prowizje (cele)', url: '/sgu/pipeline?view=commissions', icon: Receipt },
  { title: 'Prowizje (wpisy)', url: '/sgu/pipeline?view=entries', icon: Receipt },
  { title: 'Odłożone', url: '/sgu/pipeline?view=snoozed', icon: Moon },
];

const reportItems: NavItemDef[] = [
  { title: 'Tygodniowy', url: '/sgu/reports/weekly', icon: BarChart3 },
  { title: 'Miesięczny', url: '/sgu/reports/monthly', icon: BarChart3 },
];

const adminItems: NavItemDef[] = [
  { title: 'Zespół', url: '/sgu/admin/team', icon: Users },
  { title: 'Produkty', url: '/sgu/admin/products', icon: Briefcase },
  { title: 'Prowizje', url: '/sgu/admin/commissions', icon: Receipt },
];

const systemItems: NavItemDef[] = [
  { title: 'Ustawienia', url: '/sgu/settings', icon: Settings },
];

function NavItem({ item }: { item: NavItemDef }) {
  const location = useLocation();
  const hasQuery = item.url.includes('?');
  const basePath = hasQuery ? item.url.split('?')[0] : item.url;

  let isActive = false;
  if (hasQuery) {
    if (location.pathname === basePath) {
      const itemParams = new URLSearchParams(item.url.split('?')[1]);
      const locParams = new URLSearchParams(location.search);
      isActive = Array.from(itemParams.entries()).every(
        ([k, v]) => locParams.get(k) === v,
      );
    }
  } else {
    isActive = location.pathname === item.url;
  }

  const baseClass =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150';
  const activeClass =
    'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary -ml-[2px]';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink to={item.url} end className={`${baseClass} ${isActive ? activeClass : ''}`}>
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function GroupLabel({
  children,
  isCollapsed,
  isOpen,
  onToggle,
}: {
  children: string;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
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
  const isFunnelActive = location.pathname === '/sgu/pipeline';
  const [open, setOpen] = useState(isFunnelActive);

  const baseClass =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150';
  const activeClass =
    'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary -ml-[2px]';

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={`${baseClass} w-full justify-between ${
              isFunnelActive ? 'text-sidebar-foreground font-medium' : ''
            }`}
          >
            <span className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Lejek SGU</span>}
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
                const isActive =
                  location.pathname === '/sgu/pipeline' &&
                  Array.from(params.entries()).every(
                    ([k, v]) => new URLSearchParams(location.search).get(k) === v,
                  );

                return (
                  <SidebarMenuButton key={sub.title} asChild tooltip={sub.title}>
                    <NavLink to={sub.url} end className={`${baseClass} py-1.5 text-xs ${isActive ? activeClass : ''}`}>
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

export function SGUSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isPartner } = useSGUAccess();
  const { isAdmin } = useOwnerPanel();
  const { isSuperadmin } = useSuperadmin();
  const location = useLocation();

  const showAdmin = isPartner || isAdmin || isSuperadmin;

  const navGroups = useMemo(() => {
    const groups: Array<{ label: string; items: NavItemDef[]; hasFunnel?: boolean }> = [
      { label: 'Overview', items: overviewItems },
      { label: 'Lejek', items: [], hasFunnel: true },
      { label: 'Raporty', items: reportItems },
    ];
    if (showAdmin) groups.push({ label: 'Admin', items: adminItems });
    groups.push({ label: 'System', items: systemItems });
    return groups;
  }, [showAdmin]);

  const initialOpenGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      open[g.label] =
        g.items.some((i) => location.pathname.startsWith(i.url.split('?')[0])) ||
        (g.hasFunnel ? location.pathname === '/sgu/pipeline' : false);
    });
    if (!Object.values(open).some(Boolean)) navGroups.forEach((g) => (open[g.label] = true));
    return open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-3 h-14 flex items-center">
        <div className="flex items-center gap-2.5">
          <SGULogo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground text-sm whitespace-nowrap tracking-tight">
              Sieć Generacji Ubezpieczeń
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <GroupLabel
              isCollapsed={isCollapsed}
              isOpen={openGroups[group.label] ?? true}
              onToggle={() => toggleGroup(group.label)}
            >
              {group.label}
            </GroupLabel>
            {(isCollapsed || openGroups[group.label] !== false) && (
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {group.hasFunnel && <FunnelCollapsible isCollapsed={isCollapsed} />}
                  {group.items.map((item) => (
                    <NavItem key={item.title + item.url} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
