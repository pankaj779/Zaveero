import { Card, Container, Section } from '@graphology/ui';
import Link from 'next/link';
import { contactConfig, contactSectionContent } from '../../lib/config';
import { icons } from '../../lib/constants';
import { ContactForm } from './contact-form';

const MailIcon = icons.mail;
const PhoneIcon = icons.phone;
const MessageIcon = icons.message;
const MapPinIcon = icons.mapPin;
const ClockIcon = icons.clock;

export function ContactSection(): React.JSX.Element {
  const content = contactSectionContent;

  const details = [
    {
      label: 'Email',
      value: contactConfig.email,
      href: `mailto:${contactConfig.email}`,
      icon: MailIcon,
    },
    {
      label: 'Phone',
      value: contactConfig.phone,
      href: `tel:${contactConfig.phone.replace(/\s+/g, '')}`,
      icon: PhoneIcon,
    },
    {
      label: 'WhatsApp',
      value: contactConfig.whatsapp,
      href: contactConfig.whatsapp,
      icon: MessageIcon,
    },
    {
      label: 'Address',
      value: contactConfig.address,
      href: contactConfig.mapUrl,
      icon: MapPinIcon,
    },
    {
      label: 'Working Hours',
      value: contactConfig.businessHours,
      href: null,
      icon: ClockIcon,
    },
  ] as const;

  return (
    <Section id={content.id} aria-labelledby="contact-heading" className="bg-background">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="contact-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <div className="grid gap-8 laptop:grid-cols-2 laptop:gap-12">
          <div className="space-y-6">
            <ul className="space-y-4">
              {details.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-small text-muted-foreground transition-colors duration-normal hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <p className="text-small text-muted-foreground">{item.value}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <Card
              className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-border bg-surface shadow-sm"
              aria-label={content.mapLabel}
            >
              <p className="text-sm text-muted-foreground">{content.mapLabel}</p>
            </Card>
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
