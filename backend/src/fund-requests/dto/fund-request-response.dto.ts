export class FundRequestResponseDto {
  id: string;
  poLineId: string;
  status: string;
  requestedAmount: number;
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  contractAmount: number | null;
  cumulativeApprovedAmount: number;
  remainingBalance: number;
  isNegotiationRequired: boolean;

  duid: string;
  poNumber: string | null;
  prNumber: string | null;
  projectName: string | null;
  projectCode: string | null;
  poLineNumber: string | null;
  poTypeId: string | null;
  requestPurpose: string;
  rejectionReason: string | null;
  createdAt: Date;

  itemDescription: string | null;
  itemCode: string | null;
  unitPrice: number | null;
  requestedQuantity: number | null;
  poLineAmount: number | null;
  poIssuedDate: Date | null;
  pm: string | null;
  pmId: string | null;
}
