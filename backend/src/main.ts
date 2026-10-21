import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import cookieParser from 'cookie-parser';
import { logger, flushLogs } from './common/logger/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  const port = process.env.PORT || 3000;

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 3600,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.enableShutdownHooks();
  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['/', 'health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => Object.values(error.constraints || {}).join(', '));
        return new BadRequestException(messages[0]);
      },
    }),
  );

  await app.listen(port, '0.0.0.0');

  // Register after listen so Nest's own shutdown hooks run first
  process.on('SIGTERM', () => {
    void flushLogs();
  });
}

bootstrap().catch(async (err: unknown) => {
  console.error('Bootstrap failed:', err);
  logger.error('Bootstrap failed', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  await flushLogs();
  process.exit(1);
});
