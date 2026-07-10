import { Separator } from '@graphology/ui';
import Link from 'next/link';
import { brandConfig } from '../../lib/brand';
import { footerConfig } from '../../lib/config';
import { getIcon } from '../../lib/constants';
import { formatCopyright } from '../../lib/seo';

export function SiteFooter(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 tablet:px-6 desktop:px-8 laptop:py-16">
        <div className="grid gap-10 tablet:grid-cols-2 laptop:grid-cols-4">
          {footerConfig.columns.map((column) => (
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

        <div className="flex flex-col gap-4 laptop:flex-row laptop:items-center laptop:justify-between">
          <p className="text-caption">{formatCopyright(year)}</p>
          <ul className="flex items-center gap-2" aria-label="Social links">
            {brandConfig.social.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-normal hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
            <span>{footerConfig.version}</span>
            <span aria-hidden>·</span>
            <span>
              {footerConfig.poweredByPrefix} {brandConfig.company.parentName}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
