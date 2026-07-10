import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Container,
  Section,
} from '@graphology/ui';
import Link from 'next/link';
import { programsContent } from '../../lib/config';

export function ProgramsSection(): React.JSX.Element {
  const content = programsContent;

  return (
    <Section id={content.id} aria-labelledby="programs-heading" className="bg-surface">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="programs-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <ul className="grid gap-4 tablet:grid-cols-2">
          {content.cards.map((card) => (
            <li key={card.id}>
              <Card variant="course" className="flex h-full flex-col rounded-xl">
                <CardHeader className="space-y-3">
                  <CardTitle>{card.title}</CardTitle>
                  {'description' in card ? (
                    <CardDescription className="leading-relaxed">{card.description}</CardDescription>
                  ) : null}
                  {'duration' in card ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="secondary">{card.duration}</Badge>
                      <Badge variant="secondary">{card.level}</Badge>
                      <Badge variant="neutral">{card.format}</Badge>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter>
                  {card.comingSoon ? (
                    <Button type="button" variant="secondary" size="md" disabled>
                      {card.ctaLabel}
                    </Button>
                  ) : (
                    <Button variant="primary" size="md" asChild>
                      <Link href={card.ctaHref}>{card.ctaLabel}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
