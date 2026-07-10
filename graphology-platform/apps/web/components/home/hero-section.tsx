import { Container } from '@graphology/ui';
import { HeroContent } from './hero-content';

/**
 * Premium homepage hero — server shell with client motion for micro-animations only.
 */
export function HeroSection(): React.JSX.Element {
  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden py-16 tablet:py-20 laptop:py-0"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--accent)/0.08),_transparent_55%)]"
        aria-hidden
      />
      <Container className="relative w-full">
        <HeroContent />
      </Container>
    </section>
  );
}
