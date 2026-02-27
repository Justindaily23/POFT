import { Transform, Type, TransformFnParams } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';

export class PoWorkspaceFilterDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  duid?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  poNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  projectCode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  projectName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  pm?: string;

  @IsOptional()
  // FIX: Change the return type to 'string[]'
  @Transform(({ value }: TransformFnParams): string[] => {
    if (typeof value === 'string') {
      // Safely convert a single string or comma-separated string to an array
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    // If it's already an array, cast it to ensure the linter is happy
    return (Array.isArray(value) ? value : []) as string[];
  })
  @IsArray()
  @IsString({ each: true })
  poTypes?: string[];

  // --- cursor-based pagination ---
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : value) as string)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(
    ({ value }: TransformFnParams): number => (typeof value === 'string' ? Number(value.trim()) : value) as number,
  )
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(
    ({ value }: TransformFnParams): number => (typeof value === 'string' ? Number(value.trim()) : value) as number,
  )
  limit?: number;
}
