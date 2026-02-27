import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { Transform, Type, TransformFnParams } from 'class-transformer';

export class CreateStaffAccountDto {
  // Auth user
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;

  // Staff identity
  @IsNotEmpty()
  @IsUUID()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  staffRoleId: string;

  @IsUUID()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  stateId: string;
}
