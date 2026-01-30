import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { logger } from 'src/common/logger/logger';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailerService,
  ) {}

  async createUser(dto: CreateUserDto) {
    // Confirm user to be created does not exist
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    //enforce  business rules for allowed roles
    const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER]; // Only SuperAdmin can assign these
    if (!allowedRoles.includes(dto.role)) {
      logger.warn(
        `${dto.email} attempted to create a user with an invalid role`,
      );
      throw new BadRequestException('Invalid role selected');
    }

    if (userExists) {
      logger.info(`User with email ${dto.email} already exisits`);
      throw new ConflictException('Email already exists');
    }

    //Create temporary password and hash it
    const tempPassword = randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user and assign role for the user
    try {
      const user = await this.prisma.$transaction(async (prisma) => {
        const newUser = await this.prisma.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            phoneNumber: dto.phoneNumber,
            password: hashedPassword,
            role: dto.role,
            mustChangePassword: true,
            isActive: true,
          },
        });

        // Send email to user with temporary password
        await this.mailService.sendMail({
          to: dto.email,
          subject: 'Your Account Has Been Created',
          template: 'account-created', // Assumes you have a template named 'account-created'
          context: {
            email: dto.email,
            tempPassword: tempPassword,
          },
        });

        return newUser;
      });

      // Return the created user for admin tracking/reviewing and audit trail
      return {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tempPassword,
      };
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw new BadRequestException('Failed. Please Try again...');
    }
  }
}
