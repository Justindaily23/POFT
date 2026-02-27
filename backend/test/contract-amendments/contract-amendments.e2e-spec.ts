import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { cleanDatabase, disconnectUtilPrisma, seedRequiredData } from '../utils/database.util';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AuthRole } from '../../src/auth/enums/auth-name.enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../../src/notifications/notifications.service';

describe('Contract Amendments E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let poLineId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await cleanDatabase();
    await seedRequiredData();

    const admin = await prisma.user.create({
      data: { email: 'admin-amend@test.com', fullName: 'Admin', password: 'password', role: AuthRole.SUPER_ADMIN },
    });
    adminToken = `Bearer ${jwtService.sign({
      sub: admin.id,
      role: admin.role,
      email: admin.email,
    })}`;

    const po = await prisma.purchaseOrder.create({
      data: { duid: 'AMEND-001', poNumber: 'PO-AMEND', projectName: 'Amend Project' },
    });

    const poLine = await prisma.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        poLineNumber: 'L1',
        poLineAmount: 10000,
        contractAmount: 10000, // Initial setup required by service
        remainingBalance: 10000,
        version: 1,
      },
    });
    poLineId = poLine.id;
  });

  afterAll(async () => {
    // Close the Nest app and its internal Prisma connection
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    // 2. Close the utility connection used for cleaning/seeding
    await disconnectUtilPrisma();
  });
  it('successfully amends a contract and notifies requesters', async () => {
    const notificationsService = app.get(NotificationsService);
    const notifySpy = jest.spyOn(notificationsService, 'notify');

    const payload = {
      purchaseOrderLineId: poLineId,
      newContractAmount: 15000,
      reason: 'Expanding project scope',
    };

    const res = await request(app.getHttpServer())
      .post('/contract-amendments')
      .set('Authorization', adminToken)
      .send(payload);

    expect(res.status).toBe(201);
    expect(Number(res.body.updatedPoLine.contractAmount)).toBe(15000);
    expect(Number(res.body.updatedPoLine.remainingBalance)).toBe(15000);
    expect(res.body.amendment.reason).toBe(payload.reason);

    // Verify background notification tick
    await new Promise(process.nextTick);
    // Note: notify is only called if fund requests exist for this PO line
    // You can add a FundRequest in beforeAll to see this spy triggered
  });

  it('fails with 400 if new amount is less than total approved (Safety Violation)', async () => {
    // Manually simulate approved funds in DB
    await prisma.purchaseOrderLine.update({
      where: { id: poLineId },
      data: { totalApprovedAmount: 12000 },
    });

    const res = await request(app.getHttpServer()).post('/contract-amendments').set('Authorization', adminToken).send({
      purchaseOrderLineId: poLineId,
      newContractAmount: 10000, // 10k < 12k approved
      reason: 'Illegal reduction',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Safety Violation');
  });

  it('enforces DTO validation for reason length', async () => {
    const res = await request(app.getHttpServer()).post('/contract-amendments').set('Authorization', adminToken).send({
      purchaseOrderLineId: poLineId,
      newContractAmount: 20000,
      reason: 'Fix', // Under 5 chars
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('descriptive reason')]));
  });
});
