import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { cleanDatabase, seedRequiredData } from '../utils/database.util';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { AuthRole, PoLineStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('PO Workspace E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let poTypeSrvId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);

    await cleanDatabase();
    await seedRequiredData();

    // 1. Setup Admin
    const admin = await prisma.user.create({
      data: { email: 'admin@stecam.com', fullName: 'Admin User', password: 'password', role: AuthRole.SUPER_ADMIN },
    });
    adminToken = `Bearer ${jwt.sign({ sub: admin.id, role: admin.role })}`;

    // 2. Setup Types & POs
    const srvType = await prisma.poType.create({ data: { name: 'Service', code: 'SRV' } });
    poTypeSrvId = srvType.id;

    const po = await prisma.purchaseOrder.create({
      data: { duid: 'DUID-999', poNumber: 'PO-999', projectName: 'Workspace Alpha' },
    });

    // 3. Create 3 lines with specific amounts for Metrics check
    await prisma.purchaseOrderLine.createMany({
      data: [
        {
          purchaseOrderId: po.id,
          poLineNumber: 'L1',
          poLineAmount: 10000,
          contractAmount: 15000,
          totalApprovedAmount: 5000,
          poTypeId: srvType.id,
          pm: 'John Analyst',
          poLineStatus: PoLineStatus.NOT_INVOICED,
        },
        {
          purchaseOrderId: po.id,
          poLineNumber: 'L2',
          poLineAmount: 20000, // This is the 20k you are looking for
          contractAmount: 20000,
          totalApprovedAmount: 20000,
          poTypeId: srvType.id,
          pm: 'Jane Director',
          poLineStatus: PoLineStatus.INVOICED, // 👈 CHANGE THIS TO INVOICED
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /po-workspace - should return metrics and data', async () => {
    const res = await request(app.getHttpServer()).get('/po-workspace').set('Authorization', adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    // Check Metrics logic from your service
    // totalPoAmount: 10k + 20k = 30k
    expect(res.body.metrics.totalPoAmount).toBe(30000);
    // totalAmountSpent: 5k + 20k = 25k
    expect(res.body.metrics.totalAmountSpent).toBe(25000);
    // totalInvoicedAmount: Only L2 is INVOICED (20k)
    expect(res.body.metrics.totalInvoicedAmount).toBe(20000);
  });

  it('GET /po-workspace - should filter by comma-separated poTypes', async () => {
    // Tests your @Transform logic in PoWorkspaceFilterDto
    const res = await request(app.getHttpServer())
      .get('/po-workspace')
      .query({ poTypes: 'SRV,XYZ' })
      .set('Authorization', adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.every((l: any) => l.poType === 'SRV')).toBe(true);
  });

  it('GET /po-workspace - should handle cursor-based pagination', async () => {
    // Page 1
    const res1 = await request(app.getHttpServer())
      .get('/po-workspace')
      .query({ limit: 1 })
      .set('Authorization', adminToken);

    expect(res1.body.data).toHaveLength(1);
    const cursor = res1.body.nextCursor;
    expect(cursor).toBeDefined();

    // Page 2 using cursor
    const res2 = await request(app.getHttpServer())
      .get('/po-workspace')
      .query({ limit: 1, cursor })
      .set('Authorization', adminToken);

    expect(res2.body.data).toHaveLength(1);
    expect(res2.body.data[0].id).not.toBe(res1.body.data[0].id);
  });

  it('PATCH /po-workspace/po-line/:id/status - should update status', async () => {
    const line = await prisma.purchaseOrderLine.findFirst();

    const res = await request(app.getHttpServer())
      .patch(`/po-workspace/po-line/${line!.id}/status`)
      .set('Authorization', adminToken)
      .send({ status: PoLineStatus.INVOICED });

    expect(res.status).toBe(200);
    expect(res.body.poLineStatus).toBe(PoLineStatus.INVOICED);
  });
});
