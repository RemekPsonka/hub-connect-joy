import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  Network,
  Search,
  Shield,
  Building2,
  Bug,
  UserCog,
  Briefcase,
  TrendingUp,
  CalendarCheck,
  UsersRound,
  Handshake,
  BarChart3,
  Users2,
  FolderKanban,
} from 'lucide-react';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

// CRM - główne funkcje operacyjne
const crmNavigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Projekty', url: '/projects', icon: FolderKanban },
  { title: 'Konsultacje', url: '/consultations', icon: CalendarCheck },
  { title: 'Spotkania', url: '/meetings', icon: UsersRound },
  { title: 'Zadania', url: '/tasks', icon: CheckSquare },
];

// AI & Analiza
const aiNavigationItems = [
  { title: 'AI Chat', url: '/ai', icon: MessageSquare },
  { title: 'Wyszukiwanie AI', url: '/search', icon: Search },
  { title: 'Dopasowania', url: '/matches', icon: Handshake },
  { title: 'Analityka', url: '/analytics', icon: BarChart3 },
];

// Sieć & Sprzedaż
const networkNavigationItems = [
  { title: 'Sieć kontaktów', url: '/network', icon: Network },
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase },
  { title: 'Deals', url: '/deals', icon: TrendingUp },
  { title: 'Zespół Deals', url: '/deals-team', icon: Users2 },
];

// Nawigacja dla asystenta - ograniczona
const assistantNavigationItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users },
];

function NavItem({ item }: { item: { title: string; url: string; icon: typeof Settings } }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === '/'}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          activeClassName="bg-primary/15 text-sidebar-primary font-medium border-l-2 border-sidebar-primary -ml-[2px]"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function GroupLabel({ children, isCollapsed }: { children: string; isCollapsed: boolean }) {
  if (isCollapsed) return null;
  return (
    <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1 font-medium">
      {children}
    </SidebarGroupLabel>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isAdmin } = useOwnerPanel();
  const { isAssistant, director, assistant } = useAuth();
  const { isSuperadmin } = useSuperadmin();

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

  // Buduj listę elementów administracyjnych
  const adminItems: Array<{ title: string; url: string; icon: typeof Settings }> = [];
  adminItems.push({ title: 'Ustawienia', url: '/settings', icon: Settings });
  
  if (isAdmin) {
    adminItems.push({ title: 'Przedstawiciele', url: '/representatives', icon: UserCog });
    adminItems.push({ title: 'Zgłoszenia', url: '/bug-reports', icon: Bug });
    adminItems.push({ title: 'Zarządzanie', url: '/owner', icon: Shield });
  }
  
  if (isSuperadmin) {
    adminItems.push({ title: 'Superadmin', url: '/superadmin', icon: Building2 });
  }

  const navGroups = isAssistant
    ? [{ label: 'Menu', items: assistantNavigationItems }]
    : [
        { label: 'CRM', items: crmNavigationItems },
        { label: 'AI & Analiza', items: aiNavigationItems },
        { label: 'Sieć', items: networkNavigationItems },
      ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo area */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Network className="h-4.5 w-4.5 text-sidebar-primary" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground text-sm whitespace-nowrap">
              Network Assistant
            </span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="mb-2">
            <GroupLabel isCollapsed={isCollapsed}>{group.label}</GroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      {/* Footer — admin + user info */}
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        {!isCollapsed && adminItems.length > 0 && (
          <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1 font-medium">
            Administracja
          </p>
        )}
        <SidebarMenu className="space-y-0.5">
          {adminItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
        </SidebarMenu>
        
        {/* User info */}
        {!isCollapsed && userName && (
          <div className="flex items-center gap-2.5 px-3 pt-3 mt-2 border-t border-sidebar-border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userName}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50">
                {getUserRole()}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
