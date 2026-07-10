import type { MetadataRoute } from 'next';
import { brandConfig } from '../lib/brand';
import { themeConfig } from '../lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandConfig.company.name,
    short_name: brandConfig.product.shortName,
    description: brandConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: themeConfig.lightMode.background,
    theme_color: themeConfig.lightMode.foreground,
    icons: [
      {
        src: brandConfig.logo.src,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
