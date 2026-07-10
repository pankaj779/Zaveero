import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <DashboardShell>{children}</DashboardShell>;
}
