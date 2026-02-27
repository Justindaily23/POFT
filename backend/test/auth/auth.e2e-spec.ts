import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../setup/test-app';
import * as bcrypt from 'bcrypt';
import { disconnectUtilPrisma } from '../utils/database.util';

describe('Auth E2E (Session Lifecycle)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = 'admin@example.com';
  const password = 'adminPassword123';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed, mustChangePassword: false },
      create: {
        email: adminEmail,
        fullName: 'Admin',
        role: 'SUPER_ADMIN',
        password: hashed,
        mustChangePassword: false,
      },
    });
  });

  afterAll(async () => {
    // Close the Nest app and its internal Prisma connection
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    // 2. Close the utility connection used for cleaning/seeding
    await disconnectUtilPrisma();
  });

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
});
