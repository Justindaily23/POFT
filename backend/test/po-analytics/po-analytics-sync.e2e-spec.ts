import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { cleanDatabase, disconnectUtilPrisma, seedRequiredData } from '../utils/database.util';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AuthRole, PoLineStatus, PoAgingFlag, NotificationType } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('PO Analytics & PM Dashboard E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let pmToken: string;
  let pmStaffId: string;
  let pmUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await cleanDatabase();
    await seedRequiredData();

    // 1. SETUP RELATIONAL DEPENDENCIES
    const role = await prisma.staffRole.upsert({
      where: { code: 'PM' },
      update: {},
      create: { code: 'PM', name: 'Project Manager' },
    });

    const state = await prisma.state.upsert({
      where: { code: 'LAG' },
      update: {},
      create: { code: 'LAG', name: 'Lagos' },
    });

    // 2. SETUP PM USER & PROFILE
    const pmUser = await prisma.user.upsert({
      where: { email: 'pm.analytics@test.com' },
      update: {},
      create: {
        email: 'pm.analytics@test.com',
        fullName: 'John PM',
        password: 'hashed_password',
        role: AuthRole.USER,
        staffProfiles: {
          create: {
            staffId: 'STC-PM-LAG-001',
            roleId: role.id,
            stateId: state.id,
          },
        },
      },
      include: { staffProfiles: true },
    });

    pmUserId = pmUser.id;
    pmStaffId = pmUser.staffProfiles!.staffId;
    pmToken = `Bearer ${jwtService.sign({
      sub: pmUser.id,
      role: pmUser.role,
      email: pmUser.email,
    })}`;
  });

  afterAll(async () => {
    // Close the Nest app and its internal Prisma connection
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    // 2. Close the utility connection used for cleaning/seeding
    await disconnectUtilPrisma();
  });
  it('aggregates dashboard data and heals status to RED in the background', async () => {
    const notificationsService = app.get(NotificationsService);
    const notifySpy = jest.spyOn(notificationsService, 'notify');

    // 🛡️ THE FIX: Clear cache to force the service to run the sync logic
    // In your test case...
    const cacheManager = app.get(CACHE_MANAGER);
    await (cacheManager.clear ? cacheManager.clear() : (cacheManager as any).reset());

    const hundredDaysAgo = new Date();
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

    const po = await prisma.purchaseOrder.create({
      data: { duid: 'D-001', poNumber: 'PO-RED-99', projectName: 'Analytics Test' },
    });

    const poLine = await prisma.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        pmId: pmStaffId, // <--- Double check this is 'STC-PM-LAG-001'
        pm: 'John PM',
        poLineNumber: '1',
        poLineAmount: 5000,
        poLineStatus: PoLineStatus.NOT_INVOICED,
        poIssuedDate: hundredDaysAgo,
        allowedOpenDays: 10,
        agingFlag: PoAgingFlag.GREEN,
      },
    });

    await request(app.getHttpServer()).get('/pm-analytics/dashboard').set('Authorization', pmToken).expect(200);

    // Wait for the chunked promises to persist
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    // const updatedLine = await prisma.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    // expect(updatedLine?.agingFlag).toBe(PoAgingFlag.RED);
    let updatedLine;
    // Retry up to 5 times (total 2.5 seconds)
    for (let i = 0; i < 5; i++) {
      updatedLine = await prisma.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
      if (updatedLine?.agingFlag === PoAgingFlag.RED) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(updatedLine?.agingFlag).toBe(PoAgingFlag.RED);

    expect(updatedLine?.lastAgingNotifiedFlag).toBe(PoAgingFlag.RED);

    // Check Notification
    expect(notifySpy).toHaveBeenCalledWith(
      pmUserId,
      NotificationType.PO_AGING_ALERT,
      expect.objectContaining({ status: 'RED', duid: 'D-001' }),
    );
  });
});
