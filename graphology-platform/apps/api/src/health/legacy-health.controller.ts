import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Compatibility routes kept outside URI versioning for older clients.
 * Canonical endpoints live under /api/v1.
 */
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class LegacyHealthController {
  @Get()
  getRoot(): { service: string; status: string; version: string } {
    return {
      service: 'Graphology Platform API',
      status: 'running',
      version: '0.1.0',
    };
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  getStatus(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
