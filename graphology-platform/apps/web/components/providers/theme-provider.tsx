'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="zaavero-theme">
      {children}
    </NextThemesProvider>
  );
}
