import { Card, EmptyState, PageHeader } from '@graphology/ui';

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <Card className="rounded-xl p-2 shadow-sm">
        <EmptyState
          title="Coming Soon"
          description={`${title} is part of the learning platform roadmap and will be available in a later release.`}
          className="border-0 bg-transparent"
        />
      </Card>
    </div>
  );
}
