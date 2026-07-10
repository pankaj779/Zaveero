import { Button, Container } from '@graphology/ui';
import Link from 'next/link';
import { navigationConfig } from '../../lib/config';
import { ROUTES } from '../../lib/constants';

export function HomeCta(): React.JSX.Element {
  const { auth } = navigationConfig;

  return (
    <section className="border-t border-border py-16 laptop:py-20" aria-labelledby="cta-heading">
      <Container>
        <div className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-md laptop:px-12 laptop:py-16">
          <h2 id="cta-heading" className="text-h2">
            Ready to begin your graphology journey?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body opacity-90">
            Join a calm, structured learning experience built for curious minds who want practical
            skill—not noise.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link href={auth.cta.href}>{auth.cta.label}</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href={ROUTES.courses}>Explore Courses</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
