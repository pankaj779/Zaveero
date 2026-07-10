import { cn } from '@graphology/utils';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

export function Spinner({
  className,
  ...props
}: React.HTMLAttributes<SVGSVGElement>): React.JSX.Element {
  return (
    <Loader2
      className={cn('h-5 w-5 animate-spin text-muted-foreground', className)}
      aria-label="Loading"
      role="status"
      {...props}
    />
  );
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden
      {...props}
    />
  );
}

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  ...props
}: ProgressBarProps): React.JSX.Element {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : Math.round((clamped / max) * 100);

  return (
    <div className={cn('w-full space-y-1', className)} {...props}>
      {label ? (
        <div className="flex justify-between text-caption">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-slow"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}

export function PageLoader({
  label = 'Loading…',
}: {
  label?: string;
}): React.JSX.Element {
  return (
    <div
      className="flex min-h-48 w-full flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-8 w-8" />
      <p className="text-small">{label}</p>
    </div>
  );
}
