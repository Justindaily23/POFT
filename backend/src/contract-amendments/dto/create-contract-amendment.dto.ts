import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, MinLength, IsUUID } from 'class-validator';

export class CreateContractAmendmentDto {
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  purchaseOrderLineId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Transform(({ value }: TransformFnParams): number => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? 0 : Number(trimmed);
    }
    return value as number;
  })
  newContractAmount: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Please provide a more descriptive reason (min 5 chars)' })
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  reason: string;
}
