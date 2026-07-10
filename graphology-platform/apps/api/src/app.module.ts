import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, EmailModule, HealthModule, AuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestLoggingMiddleware).forRoutes('{*path}');
  }
}
