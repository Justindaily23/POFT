import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthRole } from '@prisma/client';
import { logger } from 'src/common/logger/logger';

export async function seedSuperAdmin(prisma: PrismaService, configService: ConfigService) {
  logger.info('Seeding Super admin');
  console.log('🌱 Seeding super admin...');

  const superAdminEmail = configService.get<string>('SUPER_ADMIN_EMAIL') || 'superadmin@poft.com';
  const defaultPassword = configService.get<string>('SEED_DEFAULT_PASSWORD') || 'TempPass123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { role: AuthRole.SUPER_ADMIN, isActive: true },
    create: {
      email: superAdminEmail,
      fullName: 'Super Admin',
      phoneNumber: '+2348084915685',
      password: passwordHash,
      role: AuthRole.SUPER_ADMIN,
      mustChangePassword: true,
      isActive: true,
    },
  });

  logger.info(`Super admin created on app launch: ${superAdminEmail}`);
  console.log(`✅ Super admin seeded: ${superAdminEmail}`);
}
