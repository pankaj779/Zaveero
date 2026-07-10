import { cn } from '@graphology/utils';
import * as React from 'react';

export function Navbar({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md',
        className,
      )}
      {...props}
    />
  );
}

export function NavbarInner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 tablet:px-6 desktop:px-8',
        className,
      )}
      {...props}
    />
  );
}

export interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export function NavLink({ className, active, ...props }: NavLinkProps): React.JSX.Element {
  return (
    <a
      className={cn(
        'text-sm font-medium text-muted-foreground transition-colors duration-normal hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function Sidebar({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarItem({
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}
