import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface StatusResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): HealthResponse {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  getStatus(): StatusResponse {
    return {
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
