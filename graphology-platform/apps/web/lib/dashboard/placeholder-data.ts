/**
 * Honest placeholder data for dashboard widgets.
 * Replace with real API data later — do not invent achievements or metrics.
 */

export type WidgetViewState = 'loading' | 'empty' | 'populated';

export const widgetDemoStates = {
  continueLearning: 'populated' as WidgetViewState,
  upcomingLiveClass: 'empty' as WidgetViewState,
  assignmentsDue: 'empty' as WidgetViewState,
  learningProgress: 'populated' as WidgetViewState,
  certificatesEarned: 'empty' as WidgetViewState,
  recentActivity: 'populated' as WidgetViewState,
  quickActions: 'populated' as WidgetViewState,
};

export const continueLearningPlaceholder = {
  courseTitle: 'Course title placeholder',
  nextLesson: 'Next lesson placeholder',
  progressPercent: 0,
  statusLabel: 'In Progress',
};

export const learningProgressPlaceholder = {
  label: 'Overall learning progress',
  /** Honest zero until real enrollment data exists */
  percent: 0,
  helper: 'Progress updates after you enroll and complete lessons.',
};

export const recentActivityPlaceholder = [
  {
    id: 'activity-1',
    title: 'Activity placeholder',
    detail: 'Recent learning activity will appear here.',
  },
  {
    id: 'activity-2',
    title: 'Activity placeholder',
    detail: 'Course updates and submissions will be listed here.',
  },
];

export const quickActionsPlaceholder = [
  { id: 'continue', label: 'Continue Learning', href: '/dashboard/learning' },
  { id: 'classes', label: 'View Live Classes', href: '/dashboard/live-classes' },
  { id: 'assignments', label: 'Open Assignments', href: '/dashboard/assignments' },
  { id: 'certificates', label: 'View Certificates', href: '/dashboard/certificates' },
];

export const notificationPlaceholders = [
  {
    id: 'n1',
    title: 'Assignment due reminder',
    body: 'Notification details will appear here.',
    timeLabel: 'Placeholder',
  },
  {
    id: 'n2',
    title: 'Live class reminder',
    body: 'Notification details will appear here.',
    timeLabel: 'Placeholder',
  },
  {
    id: 'n3',
    title: 'Course update',
    body: 'Notification details will appear here.',
    timeLabel: 'Placeholder',
  },
];
