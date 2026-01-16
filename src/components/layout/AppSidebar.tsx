import {
  LayoutDashboard,
  Users,
  Calendar,
  UsersRound,
  CheckSquare,
  MessageSquare,
  Settings,
  Network,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Konsultacje', url: '/consultations', icon: Calendar },
  { title: 'Spotkania', url: '/meetings', icon: UsersRound },
  { title: 'Zadania', url: '/tasks', icon: CheckSquare },
  { title: 'AI Chat', url: '/ai', icon: MessageSquare },
  { title: 'Ustawienia', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
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
        <div className="px-2 py-3 text-xs text-muted-foreground">
          {!isCollapsed && <span>© 2024 Network Assistant</span>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
