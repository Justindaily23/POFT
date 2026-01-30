export interface PoExcelRow {
  duid: string;
  poNumber: string;
  poType: string;

  projectName: string;
  projectCode: string;
  prNumber: string;
  poIssuedDate: string;
  pm: string;

  poLineNumber: string;
  itemCode: string;
  itemDescription: string;
  unitPrice: number;
  poLineAmount: number;
  requestedQuantity: number;
}
