export type PoImportStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface ImportResult {
  historyId: string;
  duidCount: number;
  poSucceeded: number;
  linesProcessed: number;
  status: PoImportStatus;
  errors: string[];
  poFailed?: number;
}

export interface PoImportHistoryItem {
  id: string;
  fileName: string;
  duidCount: number;
  poCount: number;
  poLineCount: number;
  status: PoImportStatus;
  errors: string[];
  createdAt: string;
  createdBy?: string;
}
