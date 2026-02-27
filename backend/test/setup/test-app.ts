import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { MailerService } from '@nestjs-modules/mailer';
import { jest } from '@jest/globals';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationsService } from '../../src/notifications/notifications.service';

export async function createTestApp(): Promise<INestApplication> {
  process.env.MAINTENANCE_MODE = 'false';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    // 1. COMPLETELY OVERRIDE BULL & CACHE MODULES TO PREVENT REDIS CONNECTIONS
    .overrideModule(BullModule)
    .useModule(BullModule.registerQueue({ name: 'notifications' }))
    .overrideProvider(getQueueToken('notifications'))
    .useValue({
      add: (jest.fn() as any).mockResolvedValue({ id: 1 }),
      on: jest.fn(),
      process: jest.fn(),
    })

    // --- ADDED THIS SECTION ---
    .overrideProvider(NotificationsService)
    .useValue({
      notify: (jest.fn() as any).mockResolvedValue(undefined),
    })
    // ---------------------------

    .overrideModule(CacheModule)
    .useModule(CacheModule.register({ isGlobal: true })) // Swaps Redis for in-memory store

    .overrideProvider(MailerService)
    .useValue({ sendMail: jest.fn() })

    .compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  await app.init();
  return app;
}
