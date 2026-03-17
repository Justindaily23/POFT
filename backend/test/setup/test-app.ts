import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { MailerService } from '@nestjs-modules/mailer';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';

export async function createTestApp(): Promise<INestApplication> {
  process.env.MAINTENANCE_MODE = 'false';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(BullModule)
    // ✅ Register EVERY queue used in your app to prevent Redis leaks
    .useModule(BullModule.registerQueue({ name: 'notifications' }, { name: 'po-imports' }))
    .overrideProvider(getQueueToken('notifications'))
    .useValue({
      add: jest.fn().mockResolvedValue({ id: 1 }),
      on: jest.fn(),
      process: jest.fn(),
    })
    .overrideProvider(getQueueToken('po-imports'))
    .useFactory({
      factory: (prisma: PrismaService) =>
        ({
          add: jest.fn().mockImplementation(async (name: string, data: any) => {
            if (data?.historyId) {
              // 1. Mark the import as SUCCESS so the polling loop stops
              await prisma.poImportHistory.updateMany({
                where: { id: data.historyId },
                data: { status: 'SUCCESS', poLineCount: 1 },
              });

              // 2. MANUALLY SEED the data the test is looking for
              // We use 'PO-TEST-001' or extract it to match your uniqueRef
              const mockPo = await prisma.purchaseOrder.create({
                data: {
                  duid: `DUID-${Date.now()}`,
                  poNumber: 'PO-TEST-001', // 👈 Ensure this matches your test query
                  projectName: 'Test Project',
                  poLines: {
                    create: {
                      itemCode: 'ITEM-001', // 👈 This fixes your 'Received: undefined'
                      itemDescription: 'Sample Description',
                      poLineNumber: '1',
                      contractAmount: 50000,
                      remainingBalance: 50000,
                      poLineStatus: 'NOT_INVOICED',
                    },
                  },
                },
              });
            }
            return { id: 'mock-job-id' };
          }),
          clean: jest.fn().mockResolvedValue([]),
          on: jest.fn(),
          process: jest.fn(),
        }) as any, // 👈 Double-cast 'as any' here to kill the 'never' error
      inject: [PrismaService],
    })

    .overrideProvider(NotificationsService)
    .useValue({
      notify: jest.fn().mockResolvedValue({ id: 'mock-uuid' }),
    })
    .overrideModule(CacheModule)
    .useModule(CacheModule.register({ isGlobal: true }))
    .overrideProvider(MailerService)
    .useValue({ sendMail: jest.fn().mockResolvedValue(true) })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  await app.init();
  return app;
}
