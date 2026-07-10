import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton } from '@graphology/ui';
import type { ReactNode } from 'react';
import type { WidgetViewState } from '../../../lib/dashboard';

export interface DashboardWidgetProps {
  title: string;
  description?: string;
  state: WidgetViewState;
  emptyTitle: string;
  emptyDescription: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function DashboardWidget({
  title,
  description,
  state,
  emptyTitle,
  emptyDescription,
  children,
  action,
}: DashboardWidgetProps): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {state === 'loading' ? (
          <div className="space-y-3" aria-busy="true" aria-label={`${title} loading`}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
        {state === 'empty' ? (
          <EmptyState
            className="border-0 bg-transparent px-0 py-6"
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : null}
        {state === 'populated' ? children : null}
      </CardContent>
    </Card>
  );
}
