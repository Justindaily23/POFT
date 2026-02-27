import { NotificationType } from '@prisma/client';

export interface FundRequestPayload {
  type: typeof NotificationType.FUND_REQUEST_CREATED;
  duid: string;
  poNumber: string;
  poLineNumber: string;
  requestedAmount: number;
  requestPurpose: string;
  itemDescription: string;
  pm: string;
}

export interface AccountCreatedPayload {
  type: typeof NotificationType.ACCOUNT_CREATED;
  email: string;
  tempPassword?: string;
  staffId?: string;
}

export interface PoAgingAlertPayload {
  type: typeof NotificationType.PO_AGING_WARNING;
  duid: string;
  projectName: string;
  poNumber: string;
  poLineNumber: string;
  agingFlag: string;
  daysOpen: number;
  allowedOpenDays: number;
}

export interface ContractAmendedPayload {
  type: typeof NotificationType.CONTRACT_AMENDED;
  poLineId: string;
  newAmount: number;
  oldAmount: number; // Changed from Decimal to number for the DTO/Payload
  reason: string;
  [key: string]: unknown;
}

// Specific shapes for Approval/Rejection notifications
export interface FundRequestStatusPayload {
  type: typeof NotificationType.FUND_REQUEST_APPROVED | typeof NotificationType.FUND_REQUEST_REJECTED;
  duid: string;
  poNumber?: string;
  itemDescription?: string;
  status: string;
  requestedAmount: number;
  poLineNumber: string | null;
  remainingBalance?: number; // Optional: Only for Approved
  rejectionReason?: string; // Optional: Only for Rejected
}

export interface FullFundRequestPayload {
  type: typeof NotificationType.FUND_REQUEST_CREATED;
  duid: string;
  projectCode?: string;
  projectName?: string;
  prNumber?: string;
  poNumber?: string;
  poLineAmount: number;
  itemDescription?: string;
  requestPurpose: string;
  pm?: string;
  requestedAmount: number;
  poIssuedDate?: string | Date;
  contractAmount: number | null;
  isNegotiation: boolean;
  requestedAt: Date;
  requestedBy: string;
  [key: string]: unknown;
}

export type AllNotificationPayloads =
  | FundRequestPayload
  | AccountCreatedPayload
  | PoAgingAlertPayload
  | ContractAmendedPayload
  | FullFundRequestPayload
  | FundRequestStatusPayload
  | PasswordChangedPayload
  | { name: string; resetLink: string }
  | { duid: string; projectName: string; status: string; daysOpen: number };

export type NotificationMapping = {
  [NotificationType.FUND_REQUEST_CREATED]: FundRequestPayload;
  [NotificationType.FUND_REQUEST_APPROVED]: FundRequestStatusPayload;
  [NotificationType.FUND_REQUEST_REJECTED]: FundRequestStatusPayload;
  [NotificationType.CONTRACT_AMENDED]: ContractAmendedPayload;
  [NotificationType.PO_AGING_WARNING]: PoAgingAlertPayload;
  [NotificationType.ACCOUNT_CREATED]: AccountCreatedPayload;
  [NotificationType.PASSWORD_RESET]: PasswordResetPayload;
  [NotificationType.PO_AGING_ALERT]: PoAgingAlertPayload;
  [NotificationType.PASSWORD_CHANGED]: PasswordChangedPayload;
};

export interface PasswordResetPayload {
  type: typeof NotificationType.PASSWORD_RESET;
  name: string;
  resetLink: string;
}

export interface PasswordChangedPayload {
  type: typeof NotificationType.PASSWORD_CHANGED;
  name: string;
  changedAt: string;
}
