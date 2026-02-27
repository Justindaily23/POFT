import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, IsOptional, IsEnum, ValidateIf, IsNumber, Min } from 'class-validator';

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveFundRequestDto {
  @IsEnum(ApprovalAction)
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  action: ApprovalAction;

  @ValidateIf((o: ApproveFundRequestDto) => o.action === ApprovalAction.REJECT)
  @IsString()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string | undefined =>
    typeof value === 'string' ? value.trim() : (value as string | undefined),
  )
  rejectionReason?: string;

  @ValidateIf((o: ApproveFundRequestDto) => o.action === ApprovalAction.APPROVE)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }: TransformFnParams): number | undefined => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : Number(trimmed);
    }
    return value as number | undefined;
  })
  setContractAmount?: number;
}
