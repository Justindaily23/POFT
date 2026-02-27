import { PoAgingFlag, PoLineStatus } from '@prisma/client';
import { Transform, Type, TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, IsString, IsEnum } from 'class-validator';
import { DateFilterMode } from '../po-analytics-types/poAgingDaysResponse.type';

export class PoAgingFilterDto {
  private static safeTrim(value: unknown): unknown {
    return typeof value === 'string' ? value.trim() : value;
  }

  // 1. Text Search Fields
  @IsOptional() @IsString() pmId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  searchPM?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  searchDUID?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  searchPONumber?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  searchProjectCode?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  searchProjectName?: string;

  // 2. Status & Enums
  @IsOptional()
  @Transform(
    ({ value }: TransformFnParams): PoAgingFlag | 'all' => PoAgingFilterDto.safeTrim(value) as PoAgingFlag | 'all',
  )
  agingFlag?: PoAgingFlag | 'all';

  @IsOptional()
  @Transform(
    ({ value }: TransformFnParams): PoLineStatus | 'all' => PoAgingFilterDto.safeTrim(value) as PoLineStatus | 'all',
  )
  invoiceStatus?: PoLineStatus | 'all';

  @IsOptional()
  @IsString()
  // FIX 49: Removed | 'all' because 'string' already covers it
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  poType?: string;

  // 3. Temporal Logic
  @IsOptional() @IsEnum(['year', 'month', 'day', 'range', 'all']) dateMode?: DateFilterMode;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year?: number;

  // FIX 54: Replaced 'any' with 'number' for strict production safety
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) day?: number;

  @IsOptional() @IsString() rangeStart?: string;
  @IsOptional() @IsString() rangeEnd?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;

  // 4. Pagination & Cursor
  @IsOptional() @Type(() => Number) @IsInt() take?: number;
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string => PoAgingFilterDto.safeTrim(value) as string)
  cursor?: string;
}
