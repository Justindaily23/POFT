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

    const { createdUser, staffProfile } = await (async () => {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const user = await this.createUserInternal(dto.user, hashedPassword, tx);
            const staffId = await this.generateStaffIdMultiInstanceSafe('STC', dto.staffRoleId, dto.stateId, tx);

            const profile = await tx.staffProfile.create({
              data: {
                userId: user.id,
                roleId: dto.staffRoleId,
                stateId: dto.stateId,
                staffId,
                isActive: true,
              },
            });

            logger.info(`StaffId ${staffId} generated for user ${user.email}`);

            return { createdUser: user, staffProfile: profile };
          },
          { timeout: 15000 },
        );
      } catch (error: unknown) {
        // FIX: Changed from 'any' to 'unknown'
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to create staff account', { error: errorMessage, email: dto.user.email });

        if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
        throw new InternalServerErrorException('Account creation failed');
      }
    })();

    try {
      await this.notificationsQueue.add(
        'send-notification',
        {
          userId: createdUser.id,
          type: NotificationType.ACCOUNT_CREATED,
          payload: { tempPassword, email: createdUser.email },
        },
        {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (queueErr: unknown) {
      // FIX: Use unknown here too
      const qMsg = queueErr instanceof Error ? queueErr.message : 'Queue error';
      logger.warn(`Failed to enqueue ACCOUNT_CREATED notification for ${createdUser.email}`, { error: qMsg });
    }

    return {
      user: { ...createdUser, tempPassword },
      staffProfile,
    };
  }

  private async createUserInternal(dto: CreateUserDto, hashedPassword: string, tx: Prisma.TransactionClient) {
    const exists = await tx.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    return tx.user.create({
      data: { ...dto, password: hashedPassword, mustChangePassword: true, isActive: true },
      select: { id: true, email: true, fullName: true, role: true },
    });
  }

  private async generateStaffIdMultiInstanceSafe(
    companyCode: string,
    staffRoleId: string,
    stateId: string,
    tx: Prisma.TransactionClient,
    roleCodeFromFrontend?: string,
  ): Promise<string> {
    const role = await tx.staffRole.findUnique({ where: { id: staffRoleId } });
    const state = await tx.state.findUnique({ where: { id: stateId } });

    if (!role || !state) {
      throw new BadRequestException('Invalid role or state');
    }

    const roleCode = roleCodeFromFrontend
      ? roleCodeFromFrontend.toUpperCase()
      : role.name
          .split(/\s+/)
          .map((word) => word[0]) // Extract first letter
          .join('')
          .toUpperCase();

    const seq = await tx.staffIdSequence.upsert({
      where: { company_roleCode_stateCode: { company: companyCode, roleCode, stateCode: state.code } },
      update: { lastValue: { increment: 1 } },
      create: { company: companyCode, roleCode, stateCode: state.code, lastValue: 1 },
    });

    const padded = seq.lastValue.toString().padStart(5, '0');
    return `${companyCode}-${roleCode}-${state.code}-${padded}`;
  }
}
