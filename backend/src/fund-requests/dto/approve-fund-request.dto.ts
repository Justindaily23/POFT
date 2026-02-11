// src/fund-requests/dto/approve-fund-request.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, ValidateIf, IsNumber, Min } from 'class-validator';

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveFundRequestDto {
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ValidateIf((o) => o.action === ApprovalAction.REJECT) // Required only if rejecting
  @IsString()
  @IsOptional()
  rejectionReason?: string; // Required if action === REJECT

  @ValidateIf((o) => o.action === ApprovalAction.APPROVE)
  @IsNumber()
  @IsOptional()
  @Min(0)
  setContractAmount?: number;
}
