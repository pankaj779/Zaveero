import { Button, Separator } from '@graphology/ui';
import { Globe, Mail, Share2, Video } from 'lucide-react';
import Link from 'next/link';
import { footerColumns, siteConfig } from '../../lib/site';

const socialLinks = [
  { href: '#', label: 'Social profile', icon: Share2 },
  { href: '#', label: 'Website', icon: Globe },
  { href: '#', label: 'Video channel', icon: Video },
  { href: '#', label: 'Email', icon: Mail },
] as const;

export function SiteFooter(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface" id="contact">
      <div className="mx-auto max-w-7xl px-4 py-12 tablet:px-6 desktop:px-8 laptop:py-16">
        <div className="grid gap-10 laptop:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-4">
            <p className="text-sm font-semibold tracking-tight">{siteConfig.name}</p>
            <p className="max-w-xs text-small text-muted-foreground">
              Structured graphology education with live mentorship and practical handwriting analysis.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Newsletter</p>
              <p className="text-caption">Newsletter signup coming soon.</p>
              <div className="flex max-w-sm gap-2">
                <div
                  className="flex h-10 flex-1 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground"
                  aria-hidden
                >
                  you@example.com
                </div>
                <Button type="button" variant="secondary" size="md" disabled>
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-small text-muted-foreground transition-colors duration-normal hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <p className="text-caption">
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <ul className="flex items-center gap-2" aria-label="Social links">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-normal hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
