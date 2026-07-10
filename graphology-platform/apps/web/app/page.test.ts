import { describe, expect, it } from 'vitest';
import { POST_LOGIN_REDIRECT } from '../lib/auth/redirect';
import { dashboardNavItems, dashboardPageMeta, widgetDemoStates } from '../lib/dashboard';
import { DASHBOARD_ROUTES, ROUTES } from '../lib/constants';
import {
  faqContent,
  footerConfig,
  navigationConfig,
  programsContent,
  studentSuccessContent,
} from '../lib/config';
import { brandConfig } from '../lib/brand';

describe('homepage blueprint', () => {
  it('exposes blueprint navigation labels and CTA', () => {
    expect(navigationConfig.primary.map((item) => item.label)).toEqual([
      'Home',
      'Programs',
      'About',
      'Testimonials',
      'FAQ',
      'Contact',
    ]);
    expect(navigationConfig.auth.cta.label).toBe('Start Learning');
  });

  it('defines four program cards including future programs', () => {
    expect(programsContent.cards).toHaveLength(4);
  });

  it('defines ten FAQ questions with placeholder answers', () => {
    expect(faqContent.items).toHaveLength(10);
  });

  it('keeps student success as honest placeholders', () => {
    expect(studentSuccessContent.cards).toHaveLength(3);
    expect(studentSuccessContent.cards[0].nameLabel).toBe('Student Name Placeholder');
  });

  it('exposes four footer columns with version and powered-by', () => {
    expect(footerConfig.columns.map((column) => column.title)).toEqual([
      'Company',
      'Programs',
      'Resources',
      'Legal',
    ]);
    expect(footerConfig.version).toMatch(/^v/);
    expect(brandConfig.company.parentName).toBe('Zaavero');
  });
});

describe('sprint 05.01 student dashboard', () => {
  it('uses /dashboard route base and post-login redirect', () => {
    expect(ROUTES.dashboard).toBe('/dashboard');
    expect(POST_LOGIN_REDIRECT).toBe('/dashboard');
    expect(DASHBOARD_ROUTES.learning).toBe('/dashboard/learning');
    expect(DASHBOARD_ROUTES.settings).toBe('/dashboard/settings');
  });

  it('defines sidebar navigation items in blueprint order', () => {
    expect(dashboardNavItems.map((item) => item.label)).toEqual([
      'Dashboard',
      'My Learning',
      'Live Classes',
      'Assignments',
      'Certificates',
      'Calendar',
      'Messages',
      'Payments',
      'Profile',
      'Settings',
    ]);
  });

  it('has page metadata for every dashboard route', () => {
    for (const item of dashboardNavItems) {
      expect(dashboardPageMeta[item.href]?.title).toBeTruthy();
    }
  });

  it('defines widget demo states for loading empty populated support', () => {
    expect(Object.keys(widgetDemoStates)).toEqual(
      expect.arrayContaining([
        'continueLearning',
        'upcomingLiveClass',
        'assignmentsDue',
        'learningProgress',
        'certificatesEarned',
        'recentActivity',
        'quickActions',
      ]),
    );
  });
});
