import { IsEnum, IsNotEmpty } from 'class-validator';
import { PoLineStatus } from '@prisma/client';

export class UpdatePoLineStatusDto {
  @IsNotEmpty() // Added for production safety: prevents empty status updates
  @IsEnum(PoLineStatus)
  status: PoLineStatus;
}
