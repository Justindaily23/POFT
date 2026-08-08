import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../setup/test-app';
import * as bcrypt from 'bcrypt';
import { disconnectUtilPrisma } from '../utils/database.util';
import { AuthRole } from '@prisma/client';

jest.setTimeout(60000); // Give the whole file 60 seconds

describe('Auth E2E (Session Lifecycle)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = 'admin@example.com';
  const password = 'adminPassword123';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const hashed = await bcrypt.hash(password, 1);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed, mustChangePassword: false, tokenVersion: 1 },
      create: {
        email: adminEmail,
        fullName: 'Admin',
        role: 'SUPER_ADMIN',
        password: hashed,
        mustChangePassword: false,
        tokenVersion: 1,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Close the Nest app and its internal Prisma connection
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    // 2. Close the utility connection used for cleaning/seeding
    await disconnectUtilPrisma();
  }, 30000);

  it('logs in admin', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rotates refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password, deviceId: 'rotator' });

    const cookies = login.headers['set-cookie'];

    const res = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookies).send();

    expect(res.status).toBe(201);
  });

  it('allows public password recovery endpoints without authentication', async () => {
    const forgotRes = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: adminEmail });

    expect(forgotRes.status).toBe(201);
    expect(forgotRes.body.message).toContain('If an account exists');
  });

  it('blocks privileged routes until a user completes forced password reset', async () => {
    const forcedEmail = 'forced-admin@example.com';
    const forcedPassword = 'TempPassword123';
    const hashed = await bcrypt.hash(forcedPassword, 1);

    await prisma.user.upsert({
      where: { email: forcedEmail },
      update: {
        password: hashed,
        mustChangePassword: true,
        tokenVersion: 1,
        role: AuthRole.SUPER_ADMIN,
        isActive: true,
      },
      create: {
        email: forcedEmail,
        fullName: 'Forced Admin',
        role: AuthRole.SUPER_ADMIN,
        password: hashed,
        mustChangePassword: true,
        tokenVersion: 1,
        isActive: true,
      },
    });

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: forcedEmail,
      password: forcedPassword,
    });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.mustChangePassword).toBe(true);

    const resetRes = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ newPassword: 'NewPassword123' });

    expect(resetRes.status).toBe(201);
    expect(resetRes.body.message).toContain('Password updated successfully');

    const blockedRes = await request(app.getHttpServer())
      .post('/user/create-account')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({});

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.message).toContain('Password change required');
  });
});
