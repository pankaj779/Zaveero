import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface StatusResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

@ApiTags('Health')
@Controller({
  path: '',
  version: '1',
})
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness health check' })
  getHealth(): HealthResponse {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Runtime status check' })
  getStatus(): StatusResponse {
    return {
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
