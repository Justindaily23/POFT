import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto';
import { StaffAccountResponseDto } from './dto/staff-account-response.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, NotificationType } from '@prisma/client';
import { logger } from 'src/common/logger/logger';

import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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
      await this.notificationsService.notify(createdUser.id, NotificationType.ACCOUNT_CREATED, {
        type: NotificationType.ACCOUNT_CREATED,
        email: createdUser.email,
        tempPassword,
        staffId: staffProfile.staffId,
      });
    } catch (noticeErr: unknown) {
      const msg = noticeErr instanceof Error ? noticeErr.message : 'Unknown';
      logger.warn(`Notification failed for ${createdUser.email}: ${msg}`);
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
  ): Promise<string> {
    const role = await tx.staffRole.findUnique({ where: { id: staffRoleId } });
    const state = await tx.state.findUnique({ where: { id: stateId } });

    if (!role || !state) throw new BadRequestException('Invalid role or state');

    // 1. Generate the Role Code (e.g., "Project Manager" -> "PM")
    const roleCode = role.name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    const stateCode = state.code.toUpperCase();

    let isUnique = false;
    let finalStaffId = '';
    let randomValue = 0;

    // 2. 🚀 THE RANDOMIZER LOOP: Ensures absolute uniqueness in Stecam
    while (!isUnique) {
      randomValue = Math.floor(10000 + Math.random() * 90000); // 5 digits
      const padded = randomValue.toString().padStart(5, '0');
      finalStaffId = `${companyCode}-${roleCode}-${stateCode}-${padded}`;

      // Check if this ID is already used by someone else
      const existing = await tx.staffProfile.findUnique({
        where: { staffId: finalStaffId },
      });

      if (!existing) isUnique = true;
    }

    // 3. Keep the Sequence Table in sync (Update it with the latest random value)
    await tx.staffIdSequence.upsert({
      where: {
        company_roleCode_stateCode: {
          company: companyCode,
          roleCode,
          stateCode,
        },
      },
      update: { lastValue: randomValue }, // Store the most recent random hit
      create: { company: companyCode, roleCode, stateCode, lastValue: randomValue },
    });

    return finalStaffId;
  }
}
