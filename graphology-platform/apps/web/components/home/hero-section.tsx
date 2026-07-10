import { Button, Container } from '@graphology/ui';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { HeroIllustrationPlaceholder } from './hero-illustration-placeholder';

const trustItems = [
  'Live Online Classes',
  'Expert Mentorship',
  'Practical Learning',
] as const;

export function HeroSection(): React.JSX.Element {
  return (
    <section
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-12 laptop:py-0"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--accent)/0.08),_transparent_50%)]"
        aria-hidden
      />
      <Container className="relative grid items-center gap-12 laptop:grid-cols-2 laptop:gap-16">
        <div className="space-y-6 text-left">
          <h1 id="hero-heading" className="text-display max-w-xl text-foreground">
            Discover the Power Hidden in Your Handwriting
          </h1>
          <p className="max-w-xl text-body-lg text-muted-foreground">
            Learn Graphology through structured online programs, live mentorship, and practical
            handwriting analysis designed for students, parents, teachers, and professionals.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/#courses">Explore Courses</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/#contact">Book a Free Consultation</Link>
            </Button>
          </div>
          <ul className="flex flex-col gap-2 pt-2 tablet:flex-row tablet:flex-wrap tablet:gap-x-6">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-small text-muted-foreground">
                <Check className="h-4 w-4 text-success" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center laptop:justify-end">
          <HeroIllustrationPlaceholder />
        </div>
      </Container>
    </section>
  );
}
