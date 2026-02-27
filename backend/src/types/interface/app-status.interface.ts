// src/common/interfaces/app-status.interface.ts
export interface AppStatusResponse {
  status: 'OPERATIONAL' | 'MAINTENANCE';
  app: string;
  version: string;
  timestamp: string;
}
