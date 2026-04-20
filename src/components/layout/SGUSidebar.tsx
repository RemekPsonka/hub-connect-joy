import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCog,
  LayoutGrid,
  List,
  Search,
  UserCheck,
  Briefcase,
  ClipboardList,
  Receipt,
  Moon,
  BarChart3,
  Settings,
  Calculator,
  ChevronDown,
  ArrowRightLeft,
  Package,
  DollarSign,
} from 'lucide-react';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
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

const salesItems: NavItemDef[] = [
  { title: 'Kanban', url: '/sgu/pipeline?view=kanban', icon: LayoutGrid },
  { title: 'Klienci', url: '/sgu/pipeline?view=clients', icon: UserCheck },
  { title: 'Prospecting', url: '/sgu/pipeline?view=prospecting', icon: Search },
  { title: 'Ofertowanie', url: '/sgu/pipeline?view=offering', icon: Briefcase },
  { title: 'Zadania', url: '/sgu/pipeline?view=tasks', icon: ClipboardList },
  { title: 'Prowizje', url: '/sgu/pipeline?view=commissions', icon: Receipt },
  { title: 'Odłożone', url: '/sgu/pipeline?view=snoozed', icon: Moon },
];

const analyticsItems: NavItemDef[] = [
  { title: 'Dashboard', url: '/sgu/dashboard', icon: LayoutDashboard },
  { title: 'Tabela', url: '/sgu/pipeline?view=table', icon: List },
  { title: 'Raporty', url: '/sgu/reports', icon: BarChart3 },
];

const adminItems: NavItemDef[] = [
  { title: 'Zespół', url: '/sgu/admin/team', icon: Users },
  { title: 'Przedstawiciele', url: '/sgu/admin/representatives', icon: UserCog },
  { title: 'Przypisania', url: '/sgu/admin/assignments', icon: UserPlus },
  { title: 'Produkty', url: '/sgu/admin/products', icon: Package },
  { title: 'Konfiguracja prowizji', url: '/sgu/admin/commissions', icon: DollarSign },
  { title: 'Case D', url: '/sgu/admin/case-d', icon: Calculator },
];

const systemItems: NavItemDef[] = [
  { title: 'Ustawienia', url: '/sgu/settings', icon: Settings },
];

const STORAGE_PREFIX = 'sgu-sidebar-group-';

function readGroupOpen(label: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(`${STORAGE_PREFIX}${label}`);
  if (v === '1') return true;
  if (v === '0') return false;
  return fallback;
}

function writeGroupOpen(label: string, open: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}${label}`, open ? '1' : '0');
}

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

export function SGUSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isPartner } = useSGUAccess();
  const { isAdmin } = useOwnerPanel();
  const { isSuperadmin } = useSuperadmin();

  const showAdmin = isPartner || isAdmin || isSuperadmin;

  const groups: Array<{ label: string; items: NavItemDef[]; defaultOpen: boolean }> = [
    { label: 'Sprzedaż', items: salesItems, defaultOpen: true },
    { label: 'Analityka', items: analyticsItems, defaultOpen: true },
    ...(showAdmin ? [{ label: 'Admin', items: adminItems, defaultOpen: false }] : []),
    { label: 'System', items: systemItems, defaultOpen: true },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g) => {
      init[g.label] = readGroupOpen(g.label, g.defaultOpen);
    });
    return init;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      writeGroupOpen(label, next[label]);
      return next;
    });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-3 h-14 flex items-center">
        <div className="flex items-center gap-2.5">
          <SGULogo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground text-sm whitespace-nowrap tracking-tight">
              CRM SGU Brokers
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <GroupLabel
              isCollapsed={isCollapsed}
              isOpen={openGroups[group.label] ?? group.defaultOpen}
              onToggle={() => toggleGroup(group.label)}
            >
              {group.label}
            </GroupLabel>
            {(isCollapsed || openGroups[group.label] !== false) && (
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.title + item.url} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Wróć do CRM" size="lg">
              <NavLink
                to="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-sidebar-foreground transition-colors duration-150 border border-primary/20"
              >
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-sidebar-primary" />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-tight">Wróć do CRM</span>
                    <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Network Assistant</span>
                  </div>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
