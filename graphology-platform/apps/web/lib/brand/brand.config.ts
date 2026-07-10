import type { BrandConfig } from './types';
import { ROUTES } from '../constants/routes';

const PLACEHOLDER_EMAIL = 'hello@example.com';
const PLACEHOLDER_PHONE = '+00 00000 00000';

/**
 * Single source of truth for brand identity.
 * Replace placeholder values when real brand assets and contacts are ready.
 */
export const brandConfig: BrandConfig = {
  company: {
    name: 'Zaavero',
    legalName: 'Zaavero Placeholder Legal Name',
    parentName: 'Zaavero',
  },
  product: {
    name: 'Learning Platform',
    workingTitle: 'Learning Platform',
    shortName: 'Zaavero Learn',
  },
  tagline: 'Learn. Discover. Transform.',
  description: 'Professional learning platform for structured education and mentorship.',
  website: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  email: PLACEHOLDER_EMAIL,
  phone: PLACEHOLDER_PHONE,
  social: [
    { id: 'social', label: 'Social profile', href: '#', icon: 'share' },
    { id: 'website', label: 'Website', href: ROUTES.home, icon: 'globe' },
    { id: 'video', label: 'Video channel', href: '#', icon: 'video' },
    { id: 'email', label: 'Email', href: `mailto:${PLACEHOLDER_EMAIL}`, icon: 'mail' },
  ],
  logo: {
    text: 'Zaavero',
    alt: 'Zaavero logo',
    src: '/icon.svg',
    width: 32,
    height: 32,
  },
  copyright: 'All rights reserved.',
  legal: {
    privacyLabel: 'Privacy Policy',
    termsLabel: 'Terms of Service',
    refundLabel: 'Refund Policy',
    copyrightTemplate: '© {year} {company}. {copyright}',
  },
  support: {
    email: 'support@example.com',
    phone: PLACEHOLDER_PHONE,
    hoursLabel: 'Support hours coming soon',
  },
  futureProducts: ['AI', 'Data Engineering', 'Cloud', 'Education', 'SaaS'],
};
