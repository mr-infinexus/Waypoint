import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Footprints, Ticket, LayoutDashboard, MapPin, Users, LogOut, Compass } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const { role, logout } = useAuth();
  const location = useLocation();

  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
          { title: 'Stations', url: '/admin/stations', icon: MapPin },
          { title: 'Operators', url: '/admin/operators', icon: Users },
        ];
      case 'operator':
        return [
          { title: 'Dashboard', url: '/operator', icon: LayoutDashboard },
        ];
      case 'traveler':
      default:
        return [
          { title: 'Search & Plan', url: '/search', icon: Compass },
          { title: 'My Bookings', url: '/bookings', icon: Ticket },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'operator':
        return 'Transit Operator';
      case 'traveler':
      default:
        return 'Traveler';
    }
  };

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/80 backdrop-blur-xl">
      <SidebarHeader className="p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary via-amber-300 to-accent-foreground bg-clip-text text-transparent">
              Waypoint
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider py-0 px-2 border-primary/30 text-primary bg-primary/5">
                {getRoleLabel()}
              </Badge>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/70 px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url || (item.url === '/search' && location.pathname === '/results');
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={isActive ? "bg-primary/15 text-primary font-semibold shadow-sm border border-primary/20" : "hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all duration-150"}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3 py-3 rounded-lg">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/40 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-3 px-3 py-3 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
