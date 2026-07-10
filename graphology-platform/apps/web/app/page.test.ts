import { describe, expect, it } from 'vitest';
import { brandConfig } from '../lib/brand';
import {
  companySettings,
  contactConfig,
  footerConfig,
  navigationConfig,
} from '../lib/config';
import { icons, ROUTES } from '../lib/constants';
import {
  buildCanonical,
  buildDescription,
  buildOrganizationJsonLd,
  buildTitle,
  formatCopyright,
} from '../lib/seo';
import { themeConfig } from '../lib/theme';

describe('brand foundation', () => {
  it('centralizes brand identity with placeholders', () => {
    expect(brandConfig.company.name).toBe('Zaavero');
    expect(brandConfig.product.workingTitle).toBe('Learning Platform');
    expect(brandConfig.tagline).toBe('Learn. Discover. Transform.');
    expect(brandConfig.email).toContain('example.com');
    expect(brandConfig.phone).toContain('000');
    expect(brandConfig.website).toBeTruthy();
    expect(brandConfig.futureProducts).toEqual([
      'AI',
      'Data Engineering',
      'Cloud',
      'Education',
      'SaaS',
    ]);
  });

  it('exposes navigation from configuration', () => {
    expect(navigationConfig.primary.map((item) => item.label)).toEqual([
      'Home',
      'Courses',
      'About',
      'Contact',
    ]);
    expect(navigationConfig.auth.login.href).toBe(ROUTES.login);
    expect(navigationConfig.auth.cta.label).toBe('Join Now');
  });

  it('exposes footer columns from configuration', () => {
    expect(footerConfig.columns.map((column) => column.title)).toEqual([
      'Company',
      'Courses',
      'Resources',
      'Legal',
    ]);
  });

  it('exposes contact and company settings', () => {
    expect(contactConfig.email).toBe(brandConfig.email);
    expect(contactConfig.social).toEqual(brandConfig.social);
    expect(companySettings.supportEmail).toBe(brandConfig.support.email);
    expect(companySettings.locale).toBe('en_US');
  });

  it('centralizes public routes and icons', () => {
    expect(ROUTES.home).toBe('/');
    expect(ROUTES.dashboard).toBe('#');
    expect(Object.keys(icons)).toEqual(
      expect.arrayContaining(['menu', 'close', 'check', 'globe', 'mail', 'share', 'video']),
    );
  });

  it('builds SEO helpers from brand config', () => {
    expect(buildTitle()).toBe(brandConfig.company.name);
    expect(buildTitle('About')).toBe(`About · ${brandConfig.company.name}`);
    expect(buildDescription()).toBe(brandConfig.description);
    expect(buildCanonical('/')).toContain(brandConfig.website.replace(/\/$/, ''));
    expect(formatCopyright(2026)).toContain(brandConfig.company.name);
    expect(buildOrganizationJsonLd()['@type']).toBe('Organization');
  });

  it('defines reusable theme tokens', () => {
    expect(themeConfig.animation.durationMs).toBe(250);
    expect(themeConfig.container.maxWidth).toBe('80rem');
    expect(themeConfig.lightMode.themeColor).toBeTruthy();
    expect(themeConfig.darkMode.themeColor).toBeTruthy();
  });
});
