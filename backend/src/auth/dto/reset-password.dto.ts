import { IsString, MinLength } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  newPassword: string;
}
