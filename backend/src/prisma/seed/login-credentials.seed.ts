import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { ConfigService, ConfigModule } from '@nestjs/config'; // Add ConfigModule
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
// DO NOT import AppModule if it contains Auth/Jwt strategies

async function bootstrap() {
  /**
   * FIX: Create a dynamic module that only includes what the seed needs.
   * This prevents Nest from instantiating the JwtStrategy which is failing.
   */
  const app = await NestFactory.createApplicationContext({
    module: class SeedModule {},
    imports: [
      ConfigModule.forRoot({ isGlobal: true }), // Loads your .env
      // Import your PrismaModule here. Assuming it exports PrismaService.
      // If not, you can use: providers: [PrismaService]
    ],
    providers: [PrismaService],
  });

  const prisma = app.get(PrismaService);
  const configService = app.get(ConfigService);

  try {
    console.log('🌱 Seeding super admin...');

    const superAdminEmail =
      configService.get<string>('SUPER_ADMIN_EMAIL') || 'superadmin@poft.com';
    const defaultPassword =
      configService.get<string>('SEED_DEFAULT_PASSWORD') || 'TempPass123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {},
      create: {
        email: superAdminEmail,
        fullName: 'Super Admin',
        phoneNumber: '+2348000000000',
        password: passwordHash,
        role: Role.SUPER_ADMIN,
        mustChangePassword: true,
        isActive: true,
      },
    });

    console.log(`✅ Super admin seeded: ${superAdminEmail}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

bootstrap();
