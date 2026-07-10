import type { NavigationConfig } from '../brand/types';
import { ROUTES } from '../constants/routes';

export const navigationConfig: NavigationConfig = {
  primary: [
    { label: 'Home', href: ROUTES.home },
    { label: 'Courses', href: ROUTES.courses },
    { label: 'About', href: ROUTES.about },
    { label: 'Contact', href: ROUTES.contact },
  ],
  auth: {
    login: { label: 'Login', href: ROUTES.login },
    register: { label: 'Register', href: ROUTES.register },
    cta: { label: 'Join Now', href: ROUTES.register },
  },
};
