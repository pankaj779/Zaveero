import { describe, expect, it } from 'vitest';
import {
  buildPasswordResetHtml,
  buildPasswordResetText,
} from '../templates/password-reset.template';

describe('password reset template', () => {
  it('includes frontend reset URL and expiry without hardcoded hosts', () => {
    const html = buildPasswordResetHtml({
      appName: 'Graphology Platform',
      recipientName: 'Ada',
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
      expiresInMinutes: 30,
    });
    const text = buildPasswordResetText({
      appName: 'Graphology Platform',
      recipientName: 'Ada',
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
      expiresInMinutes: 30,
    });

    expect(html).toContain('Graphology Platform');
    expect(html).toContain('http://localhost:3000/reset-password?token=abc');
    expect(html).toContain('30 minutes');
    expect(text).toContain('http://localhost:3000/reset-password?token=abc');
  });
});
