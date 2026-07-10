import type { IconName } from '../constants/icons';
import { DASHBOARD_ROUTES } from '../constants/routes';

export interface DashboardNavItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: DASHBOARD_ROUTES.root, icon: 'dashboard' },
  { id: 'learning', label: 'My Learning', href: DASHBOARD_ROUTES.learning, icon: 'book' },
  { id: 'live-classes', label: 'Live Classes', href: DASHBOARD_ROUTES.liveClasses, icon: 'video' },
  { id: 'assignments', label: 'Assignments', href: DASHBOARD_ROUTES.assignments, icon: 'clipboard' },
  { id: 'certificates', label: 'Certificates', href: DASHBOARD_ROUTES.certificates, icon: 'award' },
  { id: 'calendar', label: 'Calendar', href: DASHBOARD_ROUTES.calendar, icon: 'calendar' },
  { id: 'messages', label: 'Messages', href: DASHBOARD_ROUTES.messages, icon: 'message' },
  { id: 'payments', label: 'Payments', href: DASHBOARD_ROUTES.payments, icon: 'creditCard' },
  { id: 'profile', label: 'Profile', href: DASHBOARD_ROUTES.profile, icon: 'user' },
  { id: 'settings', label: 'Settings', href: DASHBOARD_ROUTES.settings, icon: 'settings' },
];

export const dashboardPageMeta: Record<
  string,
  { title: string; description: string; breadcrumb: string }
> = {
  [DASHBOARD_ROUTES.root]: {
    title: 'Dashboard',
    description: 'See what matters today and continue learning without friction.',
    breadcrumb: 'Dashboard',
  },
  [DASHBOARD_ROUTES.learning]: {
    title: 'My Learning',
    description: 'Your enrolled programs and progress will appear here.',
    breadcrumb: 'My Learning',
  },
  [DASHBOARD_ROUTES.liveClasses]: {
    title: 'Live Classes',
    description: 'Upcoming and past live sessions will be listed here.',
    breadcrumb: 'Live Classes',
  },
  [DASHBOARD_ROUTES.assignments]: {
    title: 'Assignments',
    description: 'Assignments, submissions, and mentor feedback will appear here.',
    breadcrumb: 'Assignments',
  },
  [DASHBOARD_ROUTES.certificates]: {
    title: 'Certificates',
    description: 'Completed course certificates will be available here.',
    breadcrumb: 'Certificates',
  },
  [DASHBOARD_ROUTES.calendar]: {
    title: 'Calendar',
    description: 'Classes, deadlines, and events will appear on your calendar.',
    breadcrumb: 'Calendar',
  },
  [DASHBOARD_ROUTES.messages]: {
    title: 'Messages',
    description: 'Mentor conversations and announcements will appear here.',
    breadcrumb: 'Messages',
  },
  [DASHBOARD_ROUTES.payments]: {
    title: 'Payments',
    description: 'Purchases, invoices, and receipts will be listed here.',
    breadcrumb: 'Payments',
  },
  [DASHBOARD_ROUTES.profile]: {
    title: 'Profile',
    description: 'Manage your personal information and preferences.',
    breadcrumb: 'Profile',
  },
  [DASHBOARD_ROUTES.settings]: {
    title: 'Settings',
    description: 'Theme, notifications, privacy, and security preferences.',
    breadcrumb: 'Settings',
  },
};

export function getDashboardPageMeta(pathname: string): {
  title: string;
  description: string;
  breadcrumb: string;
} {
  return (
    dashboardPageMeta[pathname] ?? {
      title: 'Dashboard',
      description: 'See what matters today and continue learning without friction.',
      breadcrumb: 'Dashboard',
    }
  );
}
