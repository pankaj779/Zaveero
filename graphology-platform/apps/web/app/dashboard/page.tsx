import { PageHeader } from '@graphology/ui';
import {
  AssignmentsDueWidget,
  CertificatesEarnedWidget,
  ContinueLearningWidget,
  LearningProgressWidget,
  QuickActionsWidget,
  RecentActivityWidget,
  UpcomingLiveClassWidget,
} from '../../components/dashboard/widgets';

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="See what matters today and continue learning without friction."
      />

      <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
        <ContinueLearningWidget />
        <UpcomingLiveClassWidget />
        <AssignmentsDueWidget />
        <LearningProgressWidget />
        <CertificatesEarnedWidget />
        <RecentActivityWidget />
        <div className="tablet:col-span-2 laptop:col-span-3">
          <QuickActionsWidget />
        </div>
      </div>
    </div>
  );
}
