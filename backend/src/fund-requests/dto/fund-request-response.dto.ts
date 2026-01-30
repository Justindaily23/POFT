export class FundRequestResponseDto {
  id: string;
  status: string;
  requestedAmount: number;
  requestPurpose: string;
  contractAmount: number | null;

  duid: string;
  projectName: string | null;
  projectCode: string | null;
  poNumber: string | null;
  prNumber: string | null;
  poLineNumber: string | null;
  poTypeId: string | null;
  poIssuedDate: Date | null;
  pm: string | null;
  itemDescription: string | null;
  itemCode: string | null;
  unitPrice: number | null;
  requestedQuantity: number | null;
  poLineAmount: number | null;
}
