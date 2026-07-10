import { Container } from '@graphology/ui';
import { cn } from '@graphology/utils';

export interface SectionPlaceholderProps {
  id: string;
  name: string;
  description: string;
  className?: string;
}

export function SectionPlaceholder({
  id,
  name,
  description,
  className,
}: SectionPlaceholderProps): React.JSX.Element {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn('border-t border-border py-16 laptop:py-20', className)}
    >
      <Container>
        <div className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center laptop:px-10 laptop:py-16">
          <p className="text-caption font-medium uppercase tracking-[0.14em] text-accent">
            Reserved for future implementation
          </p>
          <h2 id={`${id}-heading`} className="mt-3 text-h2 text-foreground">
            {name}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-body text-muted-foreground">{description}</p>
        </div>
      </Container>
    </section>
  );
}
