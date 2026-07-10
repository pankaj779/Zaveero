import type { MetadataRoute } from 'next';
import { brandConfig } from '../lib/brand';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: brandConfig.website,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
