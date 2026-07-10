import type { IconName } from '../constants/icons';

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  /** Key into the centralized icon map */
  icon: IconName;
}

export interface BrandLogo {
  text: string;
  alt: string;
  /** Path under /public — replace when artwork ships */
  src: string;
  width: number;
  height: number;
}

export interface BrandLegal {
  privacyLabel: string;
  termsLabel: string;
  refundLabel: string;
  copyrightTemplate: string;
}

export interface BrandSupport {
  email: string;
  phone: string;
  hoursLabel: string;
}

export interface BrandConfig {
  company: {
    name: string;
    legalName: string;
    parentName: string;
  };
  product: {
    name: string;
    workingTitle: string;
    shortName: string;
  };
  tagline: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  social: SocialLink[];
  logo: BrandLogo;
  copyright: string;
  legal: BrandLegal;
  support: BrandSupport;
  futureProducts: string[];
}

export interface NavItem {
  label: string;
  href: string;
}

export interface NavigationConfig {
  primary: NavItem[];
  auth: {
    login: NavItem;
    register: NavItem;
    cta: NavItem;
  };
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  columns: FooterColumn[];
  version: string;
  poweredByPrefix: string;
}

export interface ContactConfig {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapUrl: string;
  businessHours: string;
  social: SocialLink[];
}

export interface CompanySettings {
  languages: string[];
  timezone: string;
  currency: string;
  locale: string;
  country: string;
  supportEmail: string;
  legalEmail: string;
}

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  container: {
    maxWidth: string;
  };
  animation: {
    durationMs: number;
    duration: string;
  };
  zIndex: Record<string, number>;
  transitions: Record<string, string>;
  darkMode: {
    background: string;
    foreground: string;
    themeColor: string;
  };
  lightMode: {
    background: string;
    foreground: string;
    themeColor: string;
  };
}

export interface SeoDefaults {
  siteName: string;
  defaultTitle: string;
  titleTemplate: string;
  description: string;
  keywords: string[];
  locale: string;
  twitterCard: 'summary' | 'summary_large_image';
  robots: {
    index: boolean;
    follow: boolean;
  };
}
