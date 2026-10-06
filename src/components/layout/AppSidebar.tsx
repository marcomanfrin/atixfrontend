// B2: removed Wrench import (no longer needed after removing worksite references from sidebar)
import {
  LayoutDashboard,
  Ticket,
  Briefcase,
  Users,
  Building2,
  Factory,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  ClipboardSignature,
  CalendarDays,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import versions from '@/versions.json';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, canManageUsers, isOwner } = useAuth();
  const { t } = useTranslation('navigation');

  const mainNavItems = [
    { title: t('menu.dashboard'), url: '/', icon: LayoutDashboard },
    { title: t('menu.works'), url: '/works', icon: Briefcase },
    { title: t('menu.reports'), url: '/reports', icon: ClipboardSignature },
    { title: t('menu.calendar'), url: '/calendar', icon: CalendarDays },
    { title: t('menu.plants'), url: '/plants', icon: Factory },
    { title: t('menu.tickets'), url: '/tickets', icon: Ticket },
  ];

  // B2: removed worksite references entry from management items
  const managementItems = [
    { title: t('menu.clients'), url: '/clients', icon: Building2 },
    { title: t('menu.users'), url: '/users', icon: Users, adminOnly: true },
    { title: t('menu.accessLogs'), url: '/access-logs', icon: ShieldCheck, ownerOnly: true },
  ];

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    // Exact match or starts with url followed by /
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg">
            <img
              src="/favicon.svg"
              alt="ATIX"
              className="h-full w-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">{t('sidebar.appName')}</span>
            <span className="text-xs text-muted-foreground">{t('sidebar.appSubtitle')}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.url)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.management')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems
                .filter((item) => (!item.adminOnly || canManageUsers()) && (!(item as any).ownerOnly || isOwner()))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive(item.url)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">FE v{versions.frontend}</span>
          <span className="text-xs text-muted-foreground">BE v{versions.backend}</span>
        </div>
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">{t('sidebar.language')}</span>
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">{t('sidebar.theme')}</span>
          <ThemeToggle />
        </div>
        {user && (
          <NavLink
            to="/profile"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              isActive('/profile')
                ? 'bg-primary text-primary-foreground'
                : 'bg-sidebar-accent hover:bg-sidebar-accent/80'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="text-xs">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
            <User className="h-4 w-4 text-muted-foreground" />
          </NavLink>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>{t('sidebar.logout')}</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
