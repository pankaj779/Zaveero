import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface RootResponse {
  service: string;
  status: string;
  version: string;
}

@ApiTags('Health')
@Controller({
  path: '',
  version: '1',
})
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root metadata' })
  getRoot(): RootResponse {
    return {
      service: 'Graphology Platform API',
      status: 'running',
      version: '0.1.0',
    };
  }
}
