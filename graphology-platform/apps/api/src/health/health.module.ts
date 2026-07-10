import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';
import { LegacyHealthController } from './legacy-health.controller';

@Module({
  controllers: [AppController, HealthController, LegacyHealthController],
})
export class HealthModule {}
