import { cn } from '@graphology/utils';
import * as React from 'react';
import { Button } from '../ui/button';
import { Container } from '../layout/layout';

export function Hero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}): React.JSX.Element {
  return (
    <section className={cn('relative overflow-hidden py-20 laptop:py-28', className)}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--accent)/0.08),_transparent_55%)]"
        aria-hidden
      />
      <Container className="relative space-y-6 text-center laptop:max-w-3xl">
        {eyebrow ? <p className="text-caption font-medium uppercase tracking-[0.16em] text-accent">{eyebrow}</p> : null}
        <h1 className="text-display text-foreground">{title}</h1>
        {description ? <p className="text-body-lg text-muted-foreground">{description}</p> : null}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {primaryAction ? (
              <Button
                variant="primary"
                size="lg"
                onClick={primaryAction.onClick}
                asChild={Boolean(primaryAction.href)}
              >
                {primaryAction.href ? (
                  <a href={primaryAction.href}>{primaryAction.label}</a>
                ) : (
                  primaryAction.label
                )}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button
                variant="outline"
                size="lg"
                onClick={secondaryAction.onClick}
                asChild={Boolean(secondaryAction.href)}
              >
                {secondaryAction.href ? (
                  <a href={secondaryAction.href}>{secondaryAction.label}</a>
                ) : (
                  secondaryAction.label
                )}
              </Button>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  );
}

export function FeatureGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3', className)}>
      {children}
    </div>
  );
}
