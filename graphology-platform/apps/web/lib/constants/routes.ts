export const ROUTES = {
  home: '/',
  about: '/#about',
  programs: '/#programs',
  courses: '/#programs',
  blog: '/#blog',
  contact: '/#contact',
  privacy: '/#privacy',
  terms: '/#terms',
  login: '#',
  register: '#',
  /** Post-login destination for authenticated users */
  dashboard: '/dashboard',
  mentor: '/#mentor',
  journey: '/#journey',
  benefits: '/#benefits',
  whyLearn: '/#why-learn',
  faq: '/#faq',
  testimonials: '/#testimonials',
} as const;

export const DASHBOARD_ROUTES = {
  root: '/dashboard',
  learning: '/dashboard/learning',
  liveClasses: '/dashboard/live-classes',
  assignments: '/dashboard/assignments',
  certificates: '/dashboard/certificates',
  calendar: '/dashboard/calendar',
  messages: '/dashboard/messages',
  payments: '/dashboard/payments',
  profile: '/dashboard/profile',
  settings: '/dashboard/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type DashboardRoute = (typeof DASHBOARD_ROUTES)[keyof typeof DASHBOARD_ROUTES];

/** Where auth should send users after successful login. */
export const POST_LOGIN_REDIRECT = DASHBOARD_ROUTES.root;
