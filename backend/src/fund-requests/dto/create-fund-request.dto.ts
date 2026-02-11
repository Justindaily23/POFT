import { Transform, Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';

// Helper function to clean numeric strings with commas/symbols
const cleanNumeric = ({ value }) => {
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.]/g, '');
    return sanitized ? Number(sanitized) : null;
  }
  return value;
};

// Helper function to trim strings automatically
const trimString = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CreateFundRequestDto {
  @IsString() // 2026 Best Practice: Validate format if it's always a UUID
  @IsNotEmpty()
  duid: string;

  @IsString()
  @IsOptional()
  @Transform(trimString) // Trims whitespace from resubmitted data
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
  @Transform(cleanNumeric) // Handles "25,600.00" -> 25600.00
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(cleanNumeric) // Handles formatted quantities too
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

  @IsNumber() // FIXED: Changed from @IsString to @IsNumber because it's an amount
  @IsNotEmpty()
  @Min(0)
  @Transform(cleanNumeric) // Ensures "1,000.50" becomes 1000.5
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
