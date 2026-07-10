import { Card } from '@graphology/ui';
import { cn } from '@graphology/utils';

export function HeroIllustrationPlaceholder({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <Card
      variant="feature"
      className={cn(
        'relative flex aspect-[4/5] w-full max-w-md items-center justify-center overflow-hidden border-dashed bg-surface p-8 shadow-md',
        className,
      )}
      aria-label="Hero illustration placeholder"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.12),transparent_45%),radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.08),transparent_40%)]"
        aria-hidden
      />
      <div className="relative space-y-2 text-center">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Hero Illustration Coming Soon
        </p>
        <p className="text-caption">
          Reserved for custom artwork. No stock photos or generated art.
        </p>
      </div>
    </Card>
  );
}
