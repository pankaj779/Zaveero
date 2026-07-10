import { Card, Container, Section } from '@graphology/ui';
import { whatIsGraphologyContent } from '../../lib/config';
import { icons } from '../../lib/constants';

const CheckIcon = icons.check;

export function WhatIsGraphologySection(): React.JSX.Element {
  const content = whatIsGraphologyContent;

  return (
    <Section id={content.id} aria-labelledby="about-heading" className="bg-background">
      <Container>
        <div className="grid items-center gap-10 laptop:grid-cols-2 laptop:gap-16">
          <Card
            className="flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 shadow-sm laptop:max-w-none"
            aria-label={content.illustrationLabel}
          >
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold tracking-tight">{content.illustrationLabel}</p>
              <p className="text-caption text-muted-foreground">{content.illustrationHelper}</p>
            </div>
          </Card>

          <div className="space-y-8">
            <div className="space-y-4">
              <h2 id="about-heading" className="text-h2 text-foreground">
                {content.title}
              </h2>
              <p className="text-body text-muted-foreground">{content.description}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-h4 text-foreground">{content.whereUsedTitle}</h3>
              <ul className="grid gap-2 tablet:grid-cols-2">
                {content.whereUsed.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-small text-muted-foreground">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-h4 text-foreground">{content.whatItIsNotTitle}</h3>
              <ul className="space-y-2">
                {content.whatItIsNot.map((item) => (
                  <li key={item} className="text-small text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card variant="feature" className="rounded-xl border-border bg-surface shadow-sm">
              <p className="text-body text-foreground">{content.callout}</p>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
