import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto';
import { StaffAccountResponseDto } from './dto/staff-account-response.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, NotificationType } from '@prisma/client';
import { logger } from 'src/common/logger/logger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async createStaffAccount(dto: CreateStaffAccountDto): Promise<StaffAccountResponseDto> {
    const tempPassword = randomBytes(6).toString('hex');
    const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    let createdUser;
    let staffProfile;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // 1️⃣ Create user
          createdUser = await this.createUserInternal(dto.user, hashedPassword, tx);

          // 2️⃣ Generate safe staffId
          const staffId = await this.generateStaffIdMultiInstanceSafe('STC', dto.staffRoleId, dto.stateId, tx);

          // 3️⃣ Create staff profile
          staffProfile = await tx.staffProfile.create({
            data: {
              userId: createdUser.id,
              roleId: dto.staffRoleId,
              stateId: dto.stateId,
              staffId,
              isActive: true,
            },
          });

          logger.info(`StaffId ${staffId} generated for user ${createdUser.email}`);
        },
        { timeout: 15000 },
      );
    } catch (error: any) {
      logger.error('Failed to create staff account', { error, email: dto.user.email });
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Account creation failed');
    }

    // 4️⃣ Queue ACCOUNT_CREATED notification for retries
    try {
      await this.notificationsQueue.add(
        'send-notification',
        {
          userId: createdUser.id,
          type: NotificationType.ACCOUNT_CREATED,
          payload: { tempPassword, email: createdUser.email },
        },
        {
          attempts: 3, // Retry 3 times
          backoff: 5000, // 5 seconds between attempts
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for manual retry/logging
        },
      );
    } catch (queueErr) {
      logger.warn(`Failed to enqueue ACCOUNT_CREATED notification for ${createdUser.email}`, queueErr);
    }

    return {
      user: { ...createdUser, tempPassword },
      staffProfile,
    };
  }

  // --- Internal user creation ---
  private async createUserInternal(dto: CreateUserDto, hashedPassword: string, tx: Prisma.TransactionClient) {
    const exists = await tx.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    return tx.user.create({
      data: { ...dto, password: hashedPassword, mustChangePassword: true, isActive: true },
      select: { id: true, email: true, fullName: true, role: true },
    });
  }

  // --- Safe staffId generation with optional role code ---
  private async generateStaffIdMultiInstanceSafe(
    companyCode: string,
    staffRoleId: string,
    stateId: string,
    tx: Prisma.TransactionClient,
    roleCodeFromFrontend?: string, // optional
  ): Promise<string> {
    const role = await tx.staffRole.findUnique({ where: { id: staffRoleId } });
    const state = await tx.state.findUnique({ where: { id: stateId } });

    if (!role || !state) {
      throw new BadRequestException('Invalid role or state');
    }

    // Use provided roleCode or auto-generate from role name
    const roleCode = roleCodeFromFrontend
      ? roleCodeFromFrontend.toUpperCase()
      : role.name
          .split(/\s+/) // split by space
          .map((word) => word[0]) // take first letter
          .join('')
          .toUpperCase();

    // Upsert sequence for safe multi-instance increment
    const seq = await tx.staffIdSequence.upsert({
      where: { company_roleCode_stateCode: { company: companyCode, roleCode, stateCode: state.code } },
      update: { lastValue: { increment: 1 } },
      create: { company: companyCode, roleCode, stateCode: state.code, lastValue: 1 },
    });

    const padded = seq.lastValue.toString().padStart(5, '0');
    return `${companyCode}-${roleCode}-${state.code}-${padded}`;
  }
}
