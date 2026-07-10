export const ROUTES = {
  home: '/',
  about: '/#about',
  courses: '/#courses',
  blog: '/#blog',
  contact: '/#contact',
  privacy: '/#privacy',
  terms: '/#terms',
  login: '#',
  register: '#',
  dashboard: '#',
  mentor: '/#mentor',
  journey: '/#journey',
  benefits: '/#benefits',
  faq: '/#faq',
  testimonials: '/#testimonials',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
