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
  fileBuffer: string;
  fileName: string;
}

export type PoImportStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface ImportResult {
  historyId: string;
  duidCount: number;
  poSucceeded: number;
  linesProcessed: number;
  status: PoImportStatus;
  errors: string[];
}

export interface ValidationHelpers {
  validPoTypeCodes: Set<string>;
  validPmIds: Set<string>;
}
