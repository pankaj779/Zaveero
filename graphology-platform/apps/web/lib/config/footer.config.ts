import type { FooterConfig } from '../brand/types';
import { brandConfig } from '../brand/brand.config';
import { ROUTES } from '../constants/routes';
import packageJson from '../../package.json';

export const footerConfig: FooterConfig = {
  version: `v${packageJson.version}`,
  poweredByPrefix: 'Powered by',
  columns: [
    {
      title: 'Company',
      links: [
        { label: 'About', href: ROUTES.about },
        { label: 'Mentor', href: ROUTES.mentor },
        { label: 'Contact', href: ROUTES.contact },
      ],
    },
    {
      title: 'Programs',
      links: [
        { label: 'All Programs', href: ROUTES.programs },
        { label: 'Learning Journey', href: ROUTES.journey },
        { label: 'Benefits', href: ROUTES.benefits },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'FAQs', href: ROUTES.faq },
        { label: 'Testimonials', href: ROUTES.testimonials },
        { label: 'Blog', href: ROUTES.blog },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: brandConfig.legal.privacyLabel, href: ROUTES.privacy },
        { label: brandConfig.legal.termsLabel, href: ROUTES.terms },
        { label: brandConfig.legal.refundLabel, href: '#' },
      ],
    },
  ],
};
