import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffAccountDto {
  // Auth user
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;

  // Staff identity
  @IsNotEmpty()
  @IsUUID()
  staffRoleId: string;

  @IsUUID()
  stateId: string;
}
