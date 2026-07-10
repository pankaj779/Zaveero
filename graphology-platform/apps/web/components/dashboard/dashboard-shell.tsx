'use client';

import { Button, SearchInput } from '@graphology/ui';
import { cn } from '@graphology/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { brandConfig } from '../../lib/brand';
import { dashboardNavItems, getDashboardPageMeta, notificationPlaceholders } from '../../lib/dashboard';
import { DASHBOARD_ROUTES, icons, ROUTES } from '../../lib/constants';
import { ThemeToggle } from './theme-toggle';

const SIDEBAR_STORAGE_KEY = 'zaavero-dashboard-sidebar-collapsed';

function isNavActive(pathname: string, href: string): boolean {
  if (href === DASHBOARD_ROUTES.root) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobilePanelId = useId();
  const notificationsId = useId();
  const profileId = useId();

  const MenuIcon = icons.menu;
  const CloseIcon = icons.close;
  const BellIcon = icons.bell;
  const LogoutIcon = icons.logout;
  const PanelCloseIcon = icons.panelClose;
  const PanelOpenIcon = icons.panelOpen;
  const UserIcon = icons.user;

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === 'true') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  const toggleCollapsed = (): void => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const pageMeta = getDashboardPageMeta(pathname);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Dashboard">
      {dashboardNavItems.map((item) => {
        const Icon = icons[item.icon];
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground',
              collapsed && 'justify-center px-2',
            )}
            onClick={() => {
              setMobileOpen(false);
            }}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-normal laptop:flex',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
        aria-label="Sidebar"
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border px-3',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <Link
            href={DASHBOARD_ROUTES.root}
            className="truncate text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {collapsed ? brandConfig.logo.text.slice(0, 1) : brandConfig.logo.text}
          </Link>
          {!collapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse sidebar"
              onClick={toggleCollapsed}
            >
              <PanelCloseIcon className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
        {collapsed ? (
          <div className="flex justify-center border-b border-sidebar-border py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Expand sidebar"
              onClick={toggleCollapsed}
            >
              <PanelOpenIcon className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : null}
        {nav}
        <div className="border-t border-sidebar-border p-3">
          <Link
            href={ROUTES.home}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-normal hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'justify-center px-2',
            )}
          >
            <LogoutIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className={cn(collapsed && 'sr-only')}>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 laptop:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close navigation overlay"
            onClick={() => {
              setMobileOpen(false);
            }}
          />
          <aside
            id={mobilePanelId}
            className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col bg-sidebar text-sidebar-foreground shadow-lg"
            aria-label="Mobile sidebar"
          >
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-sm font-semibold">{brandConfig.logo.text}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close menu"
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                <CloseIcon className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {nav}
            <div className="border-t border-sidebar-border p-3">
              <Link
                href={ROUTES.home}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                <LogoutIcon className="h-4 w-4" aria-hidden />
                Logout
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 tablet:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="laptop:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls={mobilePanelId}
              onClick={() => {
                setMobileOpen(true);
              }}
            >
              <MenuIcon className="h-4 w-4" aria-hidden />
            </Button>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 tablet:block">
              <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href={DASHBOARD_ROUTES.root}
                    className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="truncate font-medium text-foreground" aria-current="page">
                  {pageMeta.breadcrumb}
                </li>
              </ol>
            </nav>

            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 tablet:max-w-sm laptop:max-w-md">
              <div className="hidden w-full tablet:block">
                <SearchInput placeholder="Search courses, lessons, and more" aria-label="Search" />
              </div>

              <div className="relative" ref={notificationsRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  aria-controls={notificationsId}
                  onClick={() => {
                    setNotificationsOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                >
                  <BellIcon className="h-4 w-4" aria-hidden />
                </Button>
                {notificationsOpen ? (
                  <div
                    id={notificationsId}
                    role="menu"
                    aria-label="Notifications"
                    className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-lg"
                  >
                    <p className="px-2 py-1.5 text-sm font-semibold text-foreground">Notifications</p>
                    <ul className="max-h-80 space-y-1 overflow-y-auto">
                      {notificationPlaceholders.map((item) => (
                        <li key={item.id}>
                          <div className="rounded-lg px-2 py-2 hover:bg-muted">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="text-caption text-muted-foreground">{item.body}</p>
                            <p className="mt-1 text-caption text-muted-foreground">{item.timeLabel}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="px-2 py-2 text-caption text-muted-foreground">
                      Notifications are placeholders until backend integration.
                    </p>
                  </div>
                ) : null}
              </div>

              <ThemeToggle />

              <div className="relative" ref={profileRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  aria-controls={profileId}
                  onClick={() => {
                    setProfileOpen((value) => !value);
                    setNotificationsOpen(false);
                  }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <UserIcon className="h-4 w-4" aria-hidden />
                  </span>
                </Button>
                {profileOpen ? (
                  <div
                    id={profileId}
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg"
                  >
                    <Link
                      href={DASHBOARD_ROUTES.profile}
                      role="menuitem"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setProfileOpen(false);
                      }}
                    >
                      Profile
                    </Link>
                    <Link
                      href={DASHBOARD_ROUTES.settings}
                      role="menuitem"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setProfileOpen(false);
                      }}
                    >
                      Settings
                    </Link>
                    <Link
                      href={ROUTES.home}
                      role="menuitem"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setProfileOpen(false);
                      }}
                    >
                      Logout
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main id="dashboard-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 tablet:px-6 laptop:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
