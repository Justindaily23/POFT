// src/contract-amendments/dto/create-contract-amendment.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateContractAmendmentDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderLineId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  newContractAmount: number;

  @IsString()
  @IsNotEmpty()
  reason: string; // e.g., board decision, escalation, etc.
}
