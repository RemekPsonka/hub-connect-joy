import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutGrid,
  UserCheck,
  ClipboardList,
  BarChart3,
  Settings,
  ArrowRightLeft,
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

function NavItem({ item }: { item: NavItemDef }) {
  const location = useLocation();
  const isActive =
    item.url === '/sgu'
      ? location.pathname === '/sgu'
      : location.pathname.startsWith(item.url);

  const baseClass =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150';
  const activeClass =
    'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary -ml-[2px]';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === '/sgu'}
          className={`${baseClass} ${isActive ? activeClass : ''}`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SGUSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isPartner } = useSGUAccess();
  const { isAdmin } = useOwnerPanel();
  const { isSuperadmin } = useSuperadmin();
  const { enableReports } = useSGUTeamId();

  const showAdmin = isPartner || isAdmin || isSuperadmin;
  const showReports = enableReports;

  const items: NavItemDef[] = (
    [
      { title: 'Dashboard', url: '/sgu', icon: LayoutDashboard, show: true },
      { title: 'Sprzedaż', url: '/sgu/sprzedaz', icon: LayoutGrid, show: true },
      { title: 'Klienci', url: '/sgu/klienci', icon: UserCheck, show: true },
      { title: 'Zadania', url: '/sgu/zadania', icon: ClipboardList, show: true },
      { title: 'Raporty', url: '/sgu/raporty', icon: BarChart3, show: showReports },
      { title: 'Admin', url: '/sgu/admin', icon: Settings, show: showAdmin },
    ] as Array<NavItemDef & { show: boolean }>
  )
    .filter((i) => i.show)
    .map(({ title, url, icon }) => ({ title, url, icon }));

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
