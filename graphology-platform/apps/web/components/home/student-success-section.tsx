import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Section,
} from '@graphology/ui';
import { studentSuccessContent } from '../../lib/config';

export function StudentSuccessSection(): React.JSX.Element {
  const content = studentSuccessContent;

  return (
    <Section id={content.id} aria-labelledby="testimonials-heading" className="bg-background">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="testimonials-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <ul className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
          {content.cards.map((card) => (
            <li key={card.id}>
              <Card variant="testimonial" className="flex h-full flex-col rounded-xl">
                <div
                  className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border bg-muted/40"
                  aria-label={card.photoLabel}
                >
                  <p className="text-caption text-muted-foreground">{card.photoLabel}</p>
                </div>
                <CardHeader className="space-y-2 px-0 pb-2 pt-5">
                  <CardTitle className="text-base">{card.nameLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-0">
                  <CardDescription className="leading-relaxed">{card.experienceLabel}</CardDescription>
                  <CardDescription className="leading-relaxed">
                    {card.transformationLabel}
                  </CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
