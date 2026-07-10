import type { ThemeTokens } from '../brand/types';

/**
 * Reusable theme values for layout/SEO chrome.
 * Visual tokens remain in @graphology/ui CSS variables — this config is for app-level constants.
 */
export const themeConfig: ThemeTokens = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',
  },
  spacing: {
    4: '0.25rem',
    8: '0.5rem',
    12: '0.75rem',
    16: '1rem',
    20: '1.25rem',
    24: '1.5rem',
    32: '2rem',
    40: '2.5rem',
    48: '3rem',
    64: '4rem',
    80: '5rem',
    96: '6rem',
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
  container: {
    maxWidth: '80rem',
  },
  animation: {
    durationMs: 250,
    duration: '250ms',
  },
  zIndex: {
    header: 50,
    overlay: 50,
    modal: 50,
    skipLink: 60,
  },
  transitions: {
    colors: 'color 200ms ease, background-color 200ms ease, border-color 200ms ease',
    transform: 'transform 250ms ease',
    opacity: 'opacity 250ms ease',
  },
  lightMode: {
    background: '#f8fafc',
    foreground: '#0f172a',
    themeColor: '#f8fafc',
  },
  darkMode: {
    background: '#0b1220',
    foreground: '#f8fafc',
    themeColor: '#0b1220',
  },
};
