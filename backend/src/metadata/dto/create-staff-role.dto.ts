import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffRoleDto {
  @IsString()
  @MinLength(2)
  // FIX: Type the params and check if value is a string before trimming
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  name: string;

  // Optional: backend generates if missing
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string | undefined =>
    typeof value === 'string' ? value.trim() : (value as string | undefined),
  )
  code?: string;
}
