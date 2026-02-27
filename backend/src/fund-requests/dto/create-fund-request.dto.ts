import { Transform, Type, TransformFnParams } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

// 1. Fixed: Explicitly return number | null | undefined
const cleanNumeric = ({ value }: TransformFnParams): number | null | undefined => {
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.]/g, '');
    return sanitized === '' ? undefined : Number(sanitized);
  }
  return value as number | undefined;
};

// 2. FIXED: Changed 'string | unknown' to just 'unknown'
// This clears the 'redundant-type-constituents' error.
const trimString = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateFundRequestDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trimString)
  duid: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  poNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  prNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  poLineNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  itemDescription?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trimString)
  requestPurpose: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  poTypeId?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  projectName?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  projectCode?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  itemCode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(cleanNumeric)
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(cleanNumeric)
  requestedQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(cleanNumeric)
  poLineAmount?: number;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  pm?: string;

  @IsString()
  @IsOptional()
  @Transform(trimString)
  pmId?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Transform(cleanNumeric)
  requestedAmount: number;

  @Type(() => Date)
  @IsOptional()
  poIssuedDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(cleanNumeric)
  contractAmount?: number;
}
