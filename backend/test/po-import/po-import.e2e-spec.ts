import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../setup/test-app';
import { loginAsAdmin } from '../auth/auth.helper';
import { cleanDatabase, prisma as utilPrisma } from '../utils/database.util';
import { createPoExcelBuffer } from '../utils/excel.util';

describe('PO Excel Import (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
  });

  afterAll(async () => {
    await app.close();
    await utilPrisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Seed Admin
    const hashed = await bcrypt.hash('adminPassword123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashed,
        fullName: 'Admin User',
        phoneNumber: '+2348000000001',
        role: 'SUPER_ADMIN',
      },
    });

    // Seed PO Type (Match the value in the Excel PO_TYPE column)
    await prisma.poType.upsert({
      where: { code: 'HARDWARE' },
      update: {},
      create: { name: 'Hardware', code: 'HARDWARE' },
    });
  });

  it('imports valid Excel data with mapped headers', async () => {
    const { accessToken } = await loginAsAdmin(app, 'admin@example.com', 'adminPassword123');
    const uniqueRef = `TEST-${Date.now()}`;

    const validRow = {
      DU_ID: `DUID-${uniqueRef}`,
      PROJECT_NAME: 'Test Project',
      PROJECT_CODE: 'PRJ-001',
      PO_TYPE: 'HARDWARE',
      PR_NUMBER: 'PR-123',
      PO_NUMBER: `PO-${uniqueRef}`,
      PO_ISSUED_DATE: new Date(), // ✅ Pass actual Date object for cellDates: true
      PM: 'John Doe',
      PM_ID: 'PM-001',
      ALLOWED_OPEN_DAYS: 30,
      PO_LINE_NUMBER: 1,
      ITEM_CODE: 'ITEM-001',
      ITEM_DESCRIPTION: 'Sample Description',
      UNIT_PRICE: 5000.5,
      REQUESTED_QUANTITY: 10,
    };

    const excelBuffer = createPoExcelBuffer([validRow]);

    const res = await request(app.getHttpServer())
      .post('/purchase-orders/import')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', excelBuffer, `import_${uniqueRef}.xlsx`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUCCESS');

    // ✅ Match schema: Change 'lines' to 'poLines'
    const po = await prisma.purchaseOrder.findFirst({
      where: { poNumber: `PO-${uniqueRef}` },
      include: { poLines: true },
    });

    expect(po).toBeDefined();
    // ✅ Access via poLines array
    expect(po?.poLines[0].itemCode).toBe('ITEM-001');
  });
});
