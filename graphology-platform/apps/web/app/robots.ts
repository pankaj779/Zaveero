import type { MetadataRoute } from 'next';
import { brandConfig } from '../lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${brandConfig.website}/sitemap.xml`,
    host: brandConfig.website,
  };
}
