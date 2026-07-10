import type { Metadata } from 'next';
import { brandConfig } from '../brand/brand.config';
import { seoDefaults } from './seo.config';

export function buildTitle(pageTitle?: string): string {
  if (!pageTitle) {
    return seoDefaults.defaultTitle;
  }
  return seoDefaults.titleTemplate.replace('%s', pageTitle);
}

export function buildDescription(description?: string): string {
  return description?.trim() ?? seoDefaults.description;
}

export function buildCanonical(path = '/'): string {
  const base = brandConfig.website.replace(/\/$/, '');
  if (path === '/' || path === '') {
    return `${base}/`;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildOpenGraph(input?: {
  title?: string;
  description?: string;
  path?: string;
}): NonNullable<Metadata['openGraph']> {
  const title = buildTitle(input?.title);
  const description = buildDescription(input?.description);
  const url = buildCanonical(input?.path ?? '/');

  return {
    type: 'website',
    locale: seoDefaults.locale,
    url,
    siteName: seoDefaults.siteName,
    title,
    description,
  };
}

export function buildTwitter(input?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata['twitter']> {
  return {
    card: seoDefaults.twitterCard,
    title: buildTitle(input?.title),
    description: buildDescription(input?.description),
  };
}

export function buildPageMetadata(input?: {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const title = input?.title
    ? { absolute: buildTitle(input.title) }
    : {
        default: seoDefaults.defaultTitle,
        template: seoDefaults.titleTemplate,
      };

  return {
    metadataBase: new URL(brandConfig.website),
    title,
    description: buildDescription(input?.description),
    applicationName: brandConfig.company.name,
    authors: [{ name: brandConfig.company.name }],
    creator: brandConfig.company.name,
    keywords: input?.keywords ?? seoDefaults.keywords,
    alternates: {
      canonical: input?.path ?? '/',
    },
    openGraph: buildOpenGraph(input),
    twitter: buildTwitter(input),
    robots: seoDefaults.robots,
  };
}

/** Future-ready JSON-LD helper — returns Organization schema placeholder. */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brandConfig.company.name,
    url: brandConfig.website,
    email: brandConfig.email,
    telephone: brandConfig.phone,
    logo: `${brandConfig.website.replace(/\/$/, '')}${brandConfig.logo.src}`,
    sameAs: brandConfig.social.map((item) => item.href).filter((href) => href !== '#'),
  };
}

export function formatCopyright(year = new Date().getFullYear()): string {
  return brandConfig.legal.copyrightTemplate
    .replace('{year}', String(year))
    .replace('{company}', brandConfig.company.name)
    .replace('{copyright}', brandConfig.copyright);
}
