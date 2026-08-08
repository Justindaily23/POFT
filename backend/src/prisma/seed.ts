import { NestFactory } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { seedPoTypes } from './seeds/seed-po-types';
import { seedStates } from './seeds/states.seed';
import { seedSuperAdmin } from './seeds/login-credentials.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext({
    module: class SeedModule {},
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [PrismaService],
  });

  const prisma = app.get(PrismaService);
  const configService = app.get(ConfigService);

  try {
    console.log('Starting full seed sequence...\n');

    await seedPoTypes(prisma);
    await seedStates(prisma);
    await seedSuperAdmin(prisma, configService);

    console.log('\n✅ All seeds completed');
  } catch (err) {
    console.error('❌ Seed sequence failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

bootstrap();
