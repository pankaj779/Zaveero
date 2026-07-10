'use client';

import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@graphology/ui';
import Link from 'next/link';
import { useId, useState, type SyntheticEvent } from 'react';
import { contactSectionContent } from '../../lib/config';
import { ROUTES } from '../../lib/constants';

export function ContactForm(): React.JSX.Element {
  const content = contactSectionContent.form;
  const formId = useId();
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!agreed) {
      return;
    }
    setSubmitted(true);
  };

  return (
    <Card className="rounded-xl p-6 shadow-sm laptop:p-8">
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-name`}>{content.fullName}</Label>
          <Input id={`${formId}-name`} name="fullName" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-email`}>{content.email}</Label>
          <Input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-phone`}>{content.phone}</Label>
          <Input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-subject`}>{content.subject}</Label>
          <Input id={`${formId}-subject`} name="subject" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-message`}>{content.message}</Label>
          <Textarea id={`${formId}-message`} name="message" rows={5} required />
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${formId}-privacy`}
            checked={agreed}
            onCheckedChange={(value) => {
              setAgreed(value === true);
            }}
            required
          />
          <Label htmlFor={`${formId}-privacy`} className="font-normal leading-snug">
            I agree to the{' '}
            <Link
              href={ROUTES.privacy}
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacy Policy
            </Link>
            .
          </Label>
        </div>
        <Button type="submit" variant="primary" size="md" disabled={!agreed}>
          {content.submitLabel}
        </Button>
        {submitted ? (
          <p className="text-caption text-muted-foreground" role="status">
            Form submission will be connected before launch. Your message was not sent.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
