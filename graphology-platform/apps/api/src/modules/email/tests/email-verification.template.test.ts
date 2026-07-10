import { describe, expect, it } from 'vitest';
import {
  buildEmailVerificationHtml,
  buildEmailVerificationText,
} from '../templates/email-verification.template';

describe('email verification template', () => {
  it('includes frontend verification URL and branding without hardcoded hosts', () => {
    const html = buildEmailVerificationHtml({
      appName: 'Graphology Platform',
      recipientName: 'Ada',
      verificationUrl: 'http://localhost:3000/verify-email?token=abc',
      expiresInHours: 24,
    });
    const text = buildEmailVerificationText({
      appName: 'Graphology Platform',
      recipientName: 'Ada',
      verificationUrl: 'http://localhost:3000/verify-email?token=abc',
      expiresInHours: 24,
    });

    expect(html).toContain('Graphology Platform');
    expect(html).toContain('http://localhost:3000/verify-email?token=abc');
    expect(html).toContain('24 hours');
    expect(text).toContain('http://localhost:3000/verify-email?token=abc');
  });
});
