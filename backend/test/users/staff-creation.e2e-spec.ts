import { INestApplication } from '@nestjs/common';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../setup/test-app';
import { loginAsAdmin } from '../auth/auth.helper';
import { AuthRole } from '@prisma/client';
import { cleanDatabase, disconnectUtilPrisma, seedRequiredData } from '../utils/database.util';
import { prisma as utilPrisma } from '../utils/database.util';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../../src/notifications/notifications.service';

describe('Staff Creation Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notificationsService = app.get(NotificationsService);
    // Mock the queue so we can spy on call
  });

  afterAll(async () => {
    // Close the Nest app and its internal Prisma connection
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    // 2. Close the utility connection used for cleaning/seeding
    await disconnectUtilPrisma();
  });
  beforeEach(async () => {
    await cleanDatabase(); // Clears everything including Admin

    // Re-create the Admin user so loginAsAdmin works every time
    const hashed = await bcrypt.hash('adminPassword123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashed,
        fullName: 'Admin',
        phoneNumber: '+2348000000001',
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
      },
    });

    // Seed other dependencies
    await seedRequiredData();
  });

  it('creates staff successfully', async () => {
    const { accessToken } = await loginAsAdmin(app, 'admin@example.com', 'adminPassword123');

    const state = await prisma.state.upsert({
      where: { code: 'ABJ' },
      update: {},
      create: { name: 'Abuja', code: 'ABJ' },
    });

    const role = await prisma.staffRole.upsert({
      where: { code: 'SE' },
      update: {},
      create: { name: 'Software Engineer', code: 'SE' },
    });

    const res = await request(app.getHttpServer())
      .post('/user/create-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        user: {
          email: 'staff@company.com',
          fullName: 'New Staff',
          phoneNumber: '+2348000000000',
          role: AuthRole.USER,
        },
        staffRoleId: role.id, // UUID
        stateId: state.id, // UUID
      });

    expect(res.status).toBe(201);
  });

  it('creates staff and sends notification', async () => {
    const { accessToken } = await loginAsAdmin(app, 'admin@example.com', 'adminPassword123');

    const notifySpy = jest.spyOn(notificationsService, 'notify');

    // Use the data already seeded by beforeEach (or call it here)
    const { state, role } = await seedRequiredData();

    const email = `staff.notif.${Date.now()}@company.com`;

    const res = await request(app.getHttpServer())
      .post('/user/create-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        user: {
          email,
          fullName: 'Notification Staff',
          phoneNumber: '+2348031234567',
          role: AuthRole.USER,
        },
        staffRoleId: role.id, // Uses seeded 'PM' role
        stateId: state.id, // Uses seeded 'LAG' state
      });

    expect(res.status).toBe(201);
    await new Promise((resolve) => setImmediate(resolve));
    expect(notifySpy).toHaveBeenCalled();

    notifySpy.mockRestore(); // Clean up for other tests
  });
});
