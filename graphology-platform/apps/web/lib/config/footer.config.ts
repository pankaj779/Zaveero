import type { FooterConfig } from '../brand/types';
import { brandConfig } from '../brand/brand.config';
import { ROUTES } from '../constants/routes';

export const footerConfig: FooterConfig = {
  blurb:
    'Structured learning with live mentorship and practical skill development.',
  newsletter: {
    title: 'Newsletter',
    helper: 'Newsletter signup coming soon.',
    placeholder: brandConfig.email,
    ctaLabel: 'Subscribe',
  },
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
      title: 'Courses',
      links: [
        { label: 'All Courses', href: ROUTES.courses },
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
