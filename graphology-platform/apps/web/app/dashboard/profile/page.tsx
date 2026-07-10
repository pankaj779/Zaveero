import { ComingSoonPage } from '../../../components/dashboard/coming-soon-page';
import { getDashboardPageMeta } from '../../../lib/dashboard';
import { DASHBOARD_ROUTES } from '../../../lib/constants';

const meta = getDashboardPageMeta(DASHBOARD_ROUTES.profile);

export default function Page(): React.JSX.Element {
  return <ComingSoonPage title={meta.title} description={meta.description} />;
}
