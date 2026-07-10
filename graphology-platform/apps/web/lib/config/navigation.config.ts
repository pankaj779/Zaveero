import type { NavigationConfig } from '../brand/types';
import { ROUTES } from '../constants/routes';

export const navigationConfig: NavigationConfig = {
  primary: [
    { label: 'Home', href: ROUTES.home },
    { label: 'Programs', href: ROUTES.programs },
    { label: 'About', href: ROUTES.about },
    { label: 'Testimonials', href: ROUTES.testimonials },
    { label: 'FAQ', href: ROUTES.faq },
    { label: 'Contact', href: ROUTES.contact },
  ],
  auth: {
    login: { label: 'Login', href: ROUTES.login },
    register: { label: 'Register', href: ROUTES.register },
    cta: { label: 'Start Learning', href: ROUTES.register },
  },
};
