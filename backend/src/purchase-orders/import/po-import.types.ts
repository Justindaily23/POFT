export interface PoExcelRow {
  duid: string;
  poNumber: string;
  projectName: string;
  projectCode: string;
  prNumber: string;

  poType: string;
  poIssuedDate: Date;
  pm: string;
  pmId: string;

  poLineNumber: string;
  allowedOpenDays: number;
  itemCode: string;
  itemDescription: string;
  unitPrice: number;
  requestedQuantity: number;
}

export interface ImportJobData {
  historyId: string;
  filePath: string;
}

export interface ImportResult {
  historyId: string;
  duidCount: number;
  poSucceeded: number;
  poFailed: number;
  linesProcessed: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PENDING';
  errors: string[];
}
