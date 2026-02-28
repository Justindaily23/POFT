import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;

  app.enableCors({
    origin: ['http://localhost:5173', 'https://stecam.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // 1. FIX: Separate the pipe configuration from the listen call
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

  // 2. Start the server as a standalone statement
  await app.listen(port, '0.0.0.0');
}

// 3. Proper catch block for the bootstrap process
bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`Bootstrap failed: ${message}`);
});
