import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffRoleDto {
  @IsString()
  @MinLength(2)
  name: string;

  // Optional: backend generates if missing
  @IsOptional()
  @IsString()
  code?: string;
}
