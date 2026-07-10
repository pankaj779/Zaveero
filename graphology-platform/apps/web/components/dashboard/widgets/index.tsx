import { Badge, Button, ProgressBar } from '@graphology/ui';
import Link from 'next/link';
import {
  continueLearningPlaceholder,
  learningProgressPlaceholder,
  quickActionsPlaceholder,
  recentActivityPlaceholder,
  widgetDemoStates,
} from '../../../lib/dashboard';
import { DASHBOARD_ROUTES } from '../../../lib/constants';
import { DashboardWidget } from './dashboard-widget';

export function ContinueLearningWidget(): React.JSX.Element {
  const data = continueLearningPlaceholder;
  return (
    <DashboardWidget
      title="Continue Learning"
      description="Pick up where you left off."
      state={widgetDemoStates.continueLearning}
      emptyTitle="Nothing to continue yet"
      emptyDescription="Enroll in a program to start learning."
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{data.courseTitle}</p>
            <Badge variant="secondary">{data.statusLabel}</Badge>
          </div>
          <p className="text-small text-muted-foreground">{data.nextLesson}</p>
        </div>
        <ProgressBar value={data.progressPercent} label="Lesson progress" />
        <Button variant="primary" size="md" asChild>
          <Link href={DASHBOARD_ROUTES.learning}>Continue</Link>
        </Button>
      </div>
    </DashboardWidget>
  );
}

export function UpcomingLiveClassWidget(): React.JSX.Element {
  return (
    <DashboardWidget
      title="Upcoming Live Class"
      description="Your next scheduled session."
      state={widgetDemoStates.upcomingLiveClass}
      emptyTitle="No upcoming classes"
      emptyDescription="Live class schedules will appear here once published."
    />
  );
}

export function AssignmentsDueWidget(): React.JSX.Element {
  return (
    <DashboardWidget
      title="Assignments Due"
      description="Work that needs your attention."
      state={widgetDemoStates.assignmentsDue}
      emptyTitle="No assignments due"
      emptyDescription="Assignment deadlines will appear here when available."
    />
  );
}

export function LearningProgressWidget(): React.JSX.Element {
  const data = learningProgressPlaceholder;
  return (
    <DashboardWidget
      title="Learning Progress"
      description="A calm summary of your journey."
      state={widgetDemoStates.learningProgress}
      emptyTitle="No progress yet"
      emptyDescription="Progress tracking starts after enrollment."
    >
      <div className="space-y-3">
        <ProgressBar value={data.percent} label={data.label} />
        <p className="text-caption text-muted-foreground">{data.helper}</p>
      </div>
    </DashboardWidget>
  );
}

export function CertificatesEarnedWidget(): React.JSX.Element {
  return (
    <DashboardWidget
      title="Certificates Earned"
      description="Completed program certificates."
      state={widgetDemoStates.certificatesEarned}
      emptyTitle="No certificates yet"
      emptyDescription="Certificates appear after you complete a program."
    />
  );
}

export function RecentActivityWidget(): React.JSX.Element {
  return (
    <DashboardWidget
      title="Recent Activity"
      description="A short trail of recent learning events."
      state={widgetDemoStates.recentActivity}
      emptyTitle="No recent activity"
      emptyDescription="Activity will appear as you learn."
    >
      <ul className="space-y-3">
        {recentActivityPlaceholder.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-surface px-3 py-3">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="text-caption text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  );
}

export function QuickActionsWidget(): React.JSX.Element {
  return (
    <DashboardWidget
      title="Quick Actions"
      description="Jump to common tasks."
      state={widgetDemoStates.quickActions}
      emptyTitle="No actions available"
      emptyDescription="Quick actions will appear here."
    >
      <div className="grid gap-2 tablet:grid-cols-2">
        {quickActionsPlaceholder.map((action) => (
          <Button key={action.id} variant="outline" size="md" className="justify-start" asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </DashboardWidget>
  );
}
