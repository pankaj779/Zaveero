import type { SeoDefaults } from '../brand/types';
import { brandConfig } from '../brand/brand.config';
import { companySettings } from '../config/company.config';

export const seoDefaults: SeoDefaults = {
  siteName: brandConfig.company.name,
  defaultTitle: brandConfig.company.name,
  titleTemplate: `%s · ${brandConfig.company.name}`,
  description: brandConfig.description,
  keywords: [
    'learning platform',
    'online courses',
    'mentorship',
    'education',
    brandConfig.company.name.toLowerCase(),
  ],
  locale: companySettings.locale,
  twitterCard: 'summary_large_image',
  robots: {
    index: true,
    follow: true,
  },
};
