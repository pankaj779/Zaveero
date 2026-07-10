import { Container, Section } from '@graphology/ui';
import { benefitsContent } from '../../lib/config';
import { getIcon } from '../../lib/constants';

export function BenefitsSection(): React.JSX.Element {
  const content = benefitsContent;

  return (
    <Section id={content.id} aria-labelledby="benefits-heading" className="bg-background">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="benefits-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <ol className="mx-auto flex max-w-2xl flex-col gap-0">
          {content.steps.map((step, index) => {
            const Icon = getIcon(step.icon);
            const isLast = index === content.steps.length - 1;
            return (
              <li key={step.title} className="relative flex gap-4 pb-10 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute left-5 top-12 h-[calc(100%-2.5rem)] w-px bg-border"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden />
                </span>
                <div className="space-y-1 pt-1.5">
                  <h3 className="text-h4 text-foreground">{step.title}</h3>
                  <p className="text-small text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}
