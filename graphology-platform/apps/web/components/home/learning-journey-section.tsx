import { Card, CardDescription, CardHeader, CardTitle, Container, Section } from '@graphology/ui';
import { learningJourneyContent } from '../../lib/config';
import { getIcon } from '../../lib/constants';

export function LearningJourneySection(): React.JSX.Element {
  const content = learningJourneyContent;

  return (
    <Section id={content.id} aria-labelledby="journey-heading" className="bg-surface">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="journey-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <ol className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-5">
          {content.steps.map((step) => {
            const Icon = getIcon(step.icon);
            return (
              <li key={step.title}>
                <Card variant="feature" className="h-full rounded-xl shadow-sm">
                  <CardHeader className="space-y-3 p-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="text-caption text-muted-foreground">Step {step.step}</span>
                    </div>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription className="text-small leading-relaxed">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}
