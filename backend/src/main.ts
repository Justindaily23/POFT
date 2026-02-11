import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = process.env.PORT || 3000;

  app.enableCors({
    // origin: (origin, callback) => {
    //   if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    //     callback(null, true);
    //   } else {
    //     callback(new Error('Not allowed by CORS'));
    //   }
    // },
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Parse cookies
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  // Global logger
  (app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Add this to simplify error messages for your toast
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => Object.values(error.constraints || {}).join(', '));
        return new BadRequestException(messages[0]); // Returns just the first error string
      },
    }),
  ),
    // Note: Only use this guard on protected routes
    // app.useGlobalGuards(new MustChangePasswordGuard());

    await app.listen(port, '0.0.0.0'));
  console.log(`Application running on${await app.getUrl()}`);
}
bootstrap().catch((err) => console.error(err)); // Add .catch;
