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
  CalendarCheck,
  UsersRound,
  Handshake,
  BarChart3,
} from 'lucide-react';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
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
];

// Nawigacja dla asystenta - ograniczona
const assistantNavigationItems = [
  { title: 'Kontakty', url: '/contacts', icon: Users },
];

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

  // Buduj listę elementów administracyjnych
  const adminItems: Array<{ title: string; url: string; icon: typeof Settings }> = [];
  
  // Ustawienia dla wszystkich (oprócz asystentów)
  if (!isAssistant) {
    adminItems.push({ title: 'Ustawienia', url: '/settings', icon: Settings });
  } else {
    // Asystenci mają ustawienia w swojej nawigacji
    adminItems.push({ title: 'Ustawienia', url: '/settings', icon: Settings });
  }
  
  // Przedstawiciele handlowi, Zgłoszenia błędów i Zarządzanie tylko dla adminów
  if (isAdmin) {
    adminItems.push({ title: 'Przedstawiciele', url: '/representatives', icon: UserCog });
    adminItems.push({ title: 'Zgłoszenia', url: '/bug-reports', icon: Bug });
    adminItems.push({ title: 'Zarządzanie', url: '/owner', icon: Shield });
  }
  
  // Superadmin
  if (isSuperadmin) {
    adminItems.push({ title: 'Superadmin', url: '/superadmin', icon: Building2 });
  }

  // Dla asystenta - inna nawigacja
  if (isAssistant) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-3">
            <Network className="h-6 w-6 text-primary shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-primary whitespace-nowrap">
                Network Assistant
              </span>
            )}
          </div>
          
          {!isCollapsed && userName && (
            <div className="px-2 pb-3 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Witaj, {userName}
              </p>
              <p className="text-xs text-muted-foreground">
                {getUserRole()}
              </p>
            </div>
          )}
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {assistantNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-sidebar-border">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2 py-1">
              Administracja
            </SidebarGroupLabel>
          )}
          <SidebarMenu>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <NavLink
                    to={item.url}
                    className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {!isCollapsed && (
            <p className="text-xs text-muted-foreground text-center py-2">
              © 2025 Network Assistant
            </p>
          )}
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <Network className="h-6 w-6 text-primary shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-primary whitespace-nowrap">
              Network Assistant
            </span>
          )}
        </div>
        
        {!isCollapsed && userName && (
          <div className="px-2 pb-3 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Witaj, {userName}
            </p>
            <p className="text-xs text-muted-foreground">
              {getUserRole()}
            </p>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        {/* CRM */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
              CRM
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {crmNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI & Analiza */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
              AI & Analiza
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sieć & Sprzedaż */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
              Sieć
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {networkNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Sekcja administracyjna na dole */}
      <SidebarFooter className="border-t border-sidebar-border">
        {!isCollapsed && adminItems.length > 0 && (
          <p className="text-xs text-muted-foreground font-medium px-3 pt-2 pb-1">
            Administracja
          </p>
        )}
        <SidebarMenu>
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <NavLink
                  to={item.url}
                  className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                  activeClassName="bg-sidebar-accent text-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        {!isCollapsed && (
          <p className="text-xs text-muted-foreground text-center py-2">
            © 2025 Network Assistant
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
