'use client';

import { Button } from '@graphology/ui';
import { cn } from '@graphology/utils';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { brandConfig } from '../../lib/brand';
import { navigationConfig } from '../../lib/config';
import { icons, ROUTES } from '../../lib/constants';

export function SiteHeader(): React.JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  const MenuIcon = icons.menu;
  const CloseIcon = icons.close;
  const { primary, auth } = navigationConfig;
  const brandLabel = brandConfig.logo.text;

  useEffect(() => {
    const onScroll = (): void => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const closeMenu = (): void => {
    setOpen(false);
  };

  const toggleMenu = (): void => {
    setOpen((value) => !value);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-colors duration-slow',
        scrolled
          ? 'border-b border-border bg-background/85 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 tablet:px-6 desktop:px-8">
        <Link
          href={ROUTES.home}
          className="text-sm font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`${brandLabel} home`}
        >
          {brandLabel}
        </Link>

        <nav className="hidden items-center gap-6 laptop:flex desktop:gap-8" aria-label="Primary">
          {primary.map((item) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-normal hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 laptop:flex">
          <Button variant="primary" size="md" asChild>
            <Link href={auth.cta.href}>{auth.cta.label}</Link>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="laptop:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggleMenu}
        >
          {open ? <CloseIcon aria-hidden /> : <MenuIcon aria-hidden />}
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed inset-0 z-50 laptop:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-foreground/40"
              aria-label="Close menu overlay"
              onClick={closeMenu}
            />
            <motion.nav
              className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col gap-6 border-l border-border bg-background p-6 shadow-lg"
              initial={reduceMotion ? false : { x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { x: 24, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{brandLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close menu"
                  onClick={closeMenu}
                >
                  <CloseIcon aria-hidden />
                </Button>
              </div>
              <ul className="flex flex-col gap-1">
                {primary.map((item) => (
                  <li key={`${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Button variant="primary" size="md" className="w-full" asChild>
                  <Link href={auth.cta.href} onClick={closeMenu}>
                    {auth.cta.label}
                  </Link>
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
