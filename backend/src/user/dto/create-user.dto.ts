import { IsEmail, IsEnum, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { AuthRole } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  // FIXED: Added ': string' return type and 'as string' assertion
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  email: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  fullName: string;

  @IsNotEmpty()
  @IsPhoneNumber('NG')
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  phoneNumber: string;

  @IsNotEmpty()
  @IsEnum(AuthRole)
  // FIXED: Matches return type to the Enum type
  @Transform(({ value }: TransformFnParams): AuthRole => (typeof value === 'string' ? value.trim() : value) as AuthRole)
  role: AuthRole;
}
