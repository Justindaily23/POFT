// src/notifications/types/notification-payloads.interface.ts
export interface FundRequestPayload {
  duid: string;
  poLineNumber: string;
  requestedAmount: number;
  requestPurpose: string;
}

export interface AccountCreatedPayload {
  email: string;
  tempPassword?: string;
  staffId?: string;
}
// Add others...
