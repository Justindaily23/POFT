import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { cleanDatabase, seedRequiredData } from '../utils/database.util';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AuthRole } from '../../src/auth/enums/auth-name.enums';
import { FundRequestStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

jest.setTimeout(30000);

let app: INestApplication;
let prisma: PrismaService;
let jwtService: JwtService;

let pmToken: string;
let adminToken: string;
let poLineId: string;

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
  jwtService = app.get(JwtService);

  await cleanDatabase();
  await seedRequiredData();

  // Create PM and Admin users
  const pm = await prisma.user.create({
    data: { email: 'pm1@test.com', fullName: 'PM One', password: 'password', role: AuthRole.USER },
  });
  const admin = await prisma.user.create({
    data: { email: 'admin1@test.com', fullName: 'Admin One', password: 'password', role: AuthRole.SUPER_ADMIN },
  });

  // Token already includes "Bearer "
  pmToken = `Bearer ${jwtService.sign({ sub: pm.id, role: pm.role })}`;
  adminToken = `Bearer ${jwtService.sign({ sub: admin.id, role: admin.role })}`;

  // Seed initial PO
  const po = await prisma.purchaseOrder.create({
    data: { duid: 'DUID-001', poNumber: 'PO-100', projectName: 'Test Project' },
  });

  const poLine = await prisma.purchaseOrderLine.create({
    data: {
      purchaseOrderId: po.id,
      poLineNumber: 'PO-LINE-001',
      poLineAmount: 5000,
      remainingBalance: 5000,
    },
  });

  poLineId = poLine.id;
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (app) await app.close();
});

describe('Fund Requests E2E', () => {
  let fundRequestId: string;

  it('PM can submit a manual fund request', async () => {
    const response = await request(app.getHttpServer())
      .post('/fund-requests/submit')
      .set('Authorization', pmToken) // Fixed: removed double "Bearer"
      .send({
        duid: 'DUID-001',
        poNumber: 'PO-100',
        poLineNumber: 'PO-LINE-001',
        requestedAmount: 5000, // Fixed: Was 'amount'
        requestPurpose: 'Manual Test', // Fixed: Was 'purpose'
      });

    if (response.status !== 201) console.error('Submit Error:', response.body);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    // Save ID for subsequent tests
    fundRequestId = response.body.id;
    expect(response.body.requestedAmount).toBe(5000);
  });

  it('Admin sets contract amount (Required step)', async () => {
    // Service handleApproval requires contractAmount to exist
    const res = await request(app.getHttpServer())
      .patch(`/fund-requests/${fundRequestId}/action`)
      .set('Authorization', adminToken)
      .send({
        action: 'APPROVE',
        setContractAmount: 10000,
      });

    expect(res.status).toBe(200);
    // handleContractSetup keeps status as PENDING
    expect(res.body.status).toBe(FundRequestStatus.PENDING);
  });

  it('Admin can now fully approve the fund request', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/fund-requests/${fundRequestId}/action`)
      .set('Authorization', adminToken)
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(FundRequestStatus.APPROVED);
  });

  it('Admin can reject a new fund request', async () => {
    // Create a fresh request for rejection
    const newReqRes = await request(app.getHttpServer())
      .post('/fund-requests/submit')
      .set('Authorization', pmToken)
      .send({
        duid: 'DUID-001',
        requestedAmount: 2000,
        requestPurpose: 'Reject Test',
      });

    const newReqId = newReqRes.body.id;

    const rejectRes = await request(app.getHttpServer())
      .patch(`/fund-requests/${newReqId}/action`)
      .set('Authorization', adminToken)
      .send({ action: 'REJECT', rejectionReason: 'Not allowed' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe(FundRequestStatus.REJECTED);
    expect(rejectRes.body.rejectionReason).toBe('Not allowed');
  });

  it('PM can fetch own fund request history', async () => {
    const res = await request(app.getHttpServer()).get('/fund-requests/history').set('Authorization', pmToken);

    expect(res.status).toBe(200);

    // FIX: Access .data if your service uses pagination
    const records = Array.isArray(res.body) ? res.body : res.body.data;

    expect(records.length).toBeGreaterThan(0);
    expect(records.some((r: any) => r.id === fundRequestId)).toBe(true);
  });

  it('Admin can fetch all fund requests', async () => {
    const res = await request(app.getHttpServer()).get('/fund-requests/admin').set('Authorization', adminToken);

    expect(res.status).toBe(200);

    // FIX: Access .data
    const records = Array.isArray(res.body) ? res.body : res.body.data;

    expect(records.length).toBeGreaterThan(0);
  });
});
