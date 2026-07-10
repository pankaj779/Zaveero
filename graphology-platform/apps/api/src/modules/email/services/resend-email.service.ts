import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '../../../config/env.schema';
import type { EmailService, SendEmailInput } from '../interfaces/email-service.interface';

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.client = new Resend(this.configService.get('RESEND_API_KEY', { infer: true }));
    this.from = this.configService.get('EMAIL_FROM', { infer: true });
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    const result = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      this.logger.error(
        `Resend email delivery failed: ${result.error.message}`,
      );
      throw new Error(result.error.message);
    }
  }
}
