import { Controller, Get } from '@nestjs/common';

interface RootResponse {
  service: string;
  status: string;
  version: string;
}

@Controller()
export class AppController {
  @Get()
  getRoot(): RootResponse {
    return {
      service: 'Graphology Platform API',
      status: 'running',
      version: '0.1.0',
    };
  }
}
