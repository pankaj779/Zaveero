import { describe, expect, it } from 'vitest';
import { footerColumns, mainNav, siteConfig } from '../lib/site';

describe('@graphology/web homepage foundation', () => {
  it('defines site SEO defaults', () => {
    expect(siteConfig.name).toBe('Graphology Platform');
    expect(siteConfig.description).toBe('Professional Graphology Education Platform');
    expect(siteConfig.url).toBeTruthy();
  });

  it('exposes primary navigation labels', () => {
    expect(mainNav.map((item) => item.label)).toEqual(['Home', 'Courses', 'About', 'Contact']);
  });

  it('exposes footer column structure', () => {
    expect(footerColumns.map((column) => column.title)).toEqual([
      'Company',
      'Courses',
      'Resources',
      'Legal',
    ]);
  });
});
