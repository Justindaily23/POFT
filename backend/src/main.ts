import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { logger } from './common/logger/logger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = process.env.PORT || 3000;

  // Enable CORS
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Parse cookies
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');
  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logger
  app.useLogger(logger);

  // Note: Only use this guard on protected routes
  // app.useGlobalGuards(new MustChangePasswordGuard());

  await app.listen(port, '0.0.0.0');
  console.log(`Application running on${await app.getUrl()}`);
}
bootstrap();
