import { describe, expect, it } from 'vitest';
import { alertVariants } from './components/feedback/alert';
import { badgeVariants } from './components/ui/badge';
import { buttonVariants } from './components/ui/button';
import { cardVariants } from './components/ui/card';
import { typographyVariants } from './components/ui/typography';

describe('@graphology/ui design system', () => {
  it('exposes button variants for primary, secondary, outline, ghost, danger, and sizes', () => {
    expect(buttonVariants({ variant: 'primary', size: 'sm' })).toContain('bg-primary');
    expect(buttonVariants({ variant: 'secondary' })).toContain('bg-secondary');
    expect(buttonVariants({ variant: 'outline' })).toContain('border');
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-muted');
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-danger');
    expect(buttonVariants({ size: 'lg' })).toContain('h-11');
    expect(buttonVariants({ size: 'icon' })).toContain('w-10');
  });

  it('exposes badge and alert semantic variants', () => {
    expect(badgeVariants({ variant: 'success' })).toContain('bg-success');
    expect(badgeVariants({ variant: 'warning' })).toContain('bg-warning');
    expect(badgeVariants({ variant: 'danger' })).toContain('bg-danger');
    expect(badgeVariants({ variant: 'primary' })).toContain('bg-primary');
    expect(badgeVariants({ variant: 'neutral' })).toContain('bg-muted');

    expect(alertVariants({ variant: 'info' })).toContain('bg-info');
    expect(alertVariants({ variant: 'success' })).toContain('bg-success');
    expect(alertVariants({ variant: 'warning' })).toContain('bg-warning');
    expect(alertVariants({ variant: 'danger' })).toContain('bg-danger');
  });

  it('exposes card and typography scales', () => {
    expect(cardVariants({ variant: 'feature' })).toContain('shadow-md');
    expect(cardVariants({ variant: 'course' })).toContain('hover:shadow-md');
    expect(typographyVariants({ variant: 'display' })).toContain('text-display');
    expect(typographyVariants({ variant: 'caption' })).toContain('text-caption');
  });
});
