import { cn } from '@graphology/utils';
import * as React from 'react';

export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('mx-auto w-full max-w-7xl px-4 tablet:px-6 desktop:px-8', className)}
      {...props}
    />
  );
}

export function Stack({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function Inline({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('flex flex-wrap items-center gap-3', className)} {...props} />;
}

export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return <section className={cn('py-12 laptop:py-16 desktop:py-20', className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-h1">{title}</h1>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
