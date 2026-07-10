import { Global, Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './constants/injection-tokens';
import { ResendEmailService } from './services/resend-email.service';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: ResendEmailService,
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
