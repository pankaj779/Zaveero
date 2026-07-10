import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import type { EnvConfig } from './config/env.schema';
import { SWAGGER_API_DESCRIPTION, SWAGGER_TAGS } from './config/swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<EnvConfig, true>);
  const port = configService.get('PORT', { infer: true });
  const host = configService.get('HOST', { infer: true });
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const appName = configService.get('APP_NAME', { infer: true });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerBuilder = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(SWAGGER_API_DESCRIPTION)
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT access token from POST /api/v1/auth/login or /api/v1/auth/refresh. Do not send refresh tokens here.',
      },
      'access-token',
    )
    .addServer(`http://localhost:${String(port)}`, 'Local development')
    .addServer('/api', 'Relative (same host)');

  for (const tag of SWAGGER_TAGS) {
    swaggerBuilder.addTag(tag.name, tag.description);
  }

  const document = SwaggerModule.createDocument(app, swaggerBuilder.build());
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const httpAdapter = app.getHttpAdapter().getInstance() as {
    get: (
      path: string,
      handler: (req: Request, res: Response, next: NextFunction) => void,
    ) => void;
  };

  httpAdapter.get('/', (_req: Request, res: Response) => {
    res.redirect(307, '/api/v1');
  });
  httpAdapter.get('/health', (_req: Request, res: Response) => {
    res.redirect(307, '/api/v1/health');
  });
  httpAdapter.get('/status', (_req: Request, res: Response) => {
    res.redirect(307, '/api/v1/status');
  });

  await app.listen(port, host);
  logger.log(`API server listening on http://${host}:${String(port)}`);
  logger.log(`Swagger docs available at http://${host}:${String(port)}/api/docs`);
  logger.log(`Environment: ${nodeEnv}`);
}

void bootstrap();
