import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Section,
} from '@graphology/ui';
import { mentorContent } from '../../lib/config';

export function MeetMentorSection(): React.JSX.Element {
  const content = mentorContent;

  return (
    <Section id={content.id} aria-labelledby="mentor-heading" className="bg-background">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="mentor-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <Card
          variant="profile"
          className="mx-auto grid max-w-4xl overflow-hidden rounded-xl shadow-sm laptop:grid-cols-[minmax(0,16rem)_1fr]"
        >
          <div
            className="flex min-h-64 items-center justify-center border-b border-border bg-surface laptop:min-h-full laptop:border-b-0 laptop:border-r"
            aria-label={content.photoLabel}
          >
            <p className="px-6 text-center text-sm text-muted-foreground">{content.photoLabel}</p>
          </div>
          <div className="space-y-6 p-6 laptop:p-8">
            <CardHeader className="space-y-2 p-0">
              <CardTitle className="text-h3">{content.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-0">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{content.experienceLabel}</p>
                <CardDescription>{content.experience}</CardDescription>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{content.certificationsLabel}</p>
                <CardDescription>{content.certifications}</CardDescription>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{content.biographyLabel}</p>
                <CardDescription className="leading-relaxed">{content.biography}</CardDescription>
              </div>
            </CardContent>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
