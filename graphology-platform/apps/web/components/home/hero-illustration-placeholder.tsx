import { Card } from '@graphology/ui';
import { cn } from '@graphology/utils';

export function HeroIllustrationPlaceholder({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <Card
      className={cn(
        'relative mx-auto flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-surface p-8 shadow-md',
        className,
      )}
      aria-label="Premium hero illustration placeholder"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.1),transparent_45%),radial-gradient(circle_at_75%_75%,hsl(var(--primary)/0.06),transparent_42%)]"
        aria-hidden
      />
      <div className="relative space-y-2 text-center">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Premium Hero Illustration
        </p>
        <p className="text-caption text-muted-foreground">
          Custom artwork will be added in a future release.
        </p>
      </div>
    </Card>
  );
}
