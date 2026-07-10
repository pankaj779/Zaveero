import { SiteShell } from '../../components/layout/site-shell';

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <SiteShell>{children}</SiteShell>;
}
