import { Logger } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';

const prisma = new PrismaService();

export async function cleanDatabase() {
  const tablenames = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
  );

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      Logger.error('Truncate Error:', error);
    }
  }
}

export async function seedRequiredData() {
  // 1. Upsert State (Prevents Unique Constraint Error on 'LAG')
  const state = await prisma.state.upsert({
    where: { code: 'LAG' },
    update: {},
    create: { name: 'Lagos', code: 'LAG' },
  });

  // 2. Upsert Staff Role (Prevents Unique Constraint Error on 'PM')
  const role = await prisma.staffRole.upsert({
    where: { code: 'PM' },
    update: {},
    create: { name: 'Project Manager', code: 'PM' },
  });

  return { state, role };
}

// 💡 Helper to close this specific utility connection
export async function disconnectUtilPrisma() {
  await prisma.$disconnect();
}

export { prisma };
