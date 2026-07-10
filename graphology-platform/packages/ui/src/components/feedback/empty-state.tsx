import { cn } from '@graphology/utils';
import * as React from 'react';
import { Button } from '../ui/button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        {illustration ?? (
          <span className="text-2xl font-semibold text-muted-foreground/60">∅</span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-h4">{title}</h3>
        {description ? <p className="max-w-sm text-small text-muted-foreground">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
