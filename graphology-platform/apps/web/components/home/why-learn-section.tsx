import { Card, CardContent, CardDescription, CardHeader, CardTitle, Container, Section } from '@graphology/ui';
import { whyLearnContent } from '../../lib/config';
import { getIcon } from '../../lib/constants';

export function WhyLearnSection(): React.JSX.Element {
  const content = whyLearnContent;

  return (
    <Section id={content.id} aria-labelledby="why-learn-heading" className="bg-surface">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="why-learn-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <ul className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
          {content.cards.map((card) => {
            const Icon = getIcon(card.icon);
            return (
              <li key={card.title}>
                <Card
                  variant="feature"
                  className="h-full rounded-xl transition-shadow duration-normal hover:shadow-md"
                >
                  <CardHeader className="space-y-4 p-0 pb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <CardDescription className="text-small leading-relaxed">
                      {card.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
