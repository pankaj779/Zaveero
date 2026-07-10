export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Provider-agnostic email delivery contract.
 * Implementations may use Resend, SES, SendGrid, Mailgun, etc.
 */
export interface EmailService {
  sendEmail(input: SendEmailInput): Promise<void>;
}
