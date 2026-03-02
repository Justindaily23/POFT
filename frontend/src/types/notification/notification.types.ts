/**
 * 🛡️ ERASABLE-SAFE TYPE DEFINITION
 * Instead of 'enum', we use a constant object to avoid the 'erasableSyntaxOnly' error.
 */
export const NotificationType = {
  FUND_REQUEST_CREATED: "FUND_REQUEST_CREATED",
  FUND_REQUEST_APPROVED: "FUND_REQUEST_APPROVED",
  FUND_REQUEST_REJECTED: "FUND_REQUEST_REJECTED",
  CONTRACT_AMENDED: "CONTRACT_AMENDED",
  PO_AGING_WARNING: "PO_AGING_WARNING",
  PO_AGING_ALERT: "PO_AGING_ALERT",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  PASSWORD_RESET: "PASSWORD_RESET",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// --- Specific Interfaces (Matches Backend 1:1) ---

export interface FundRequestStatusPayload {
  type:
    | typeof NotificationType.FUND_REQUEST_APPROVED
    | typeof NotificationType.FUND_REQUEST_REJECTED;
  duid: string;
  status: string;
  requestedAmount: number;
  poLineNumber: string | null;

  // 🛡️ ADD THESE TO MATCH YOUR NEW BACKEND PAYLOAD
  poNumber?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  pm?: string | null;
  itemDescription?: string | null;
  contractAmount?: number | null;

  remainingBalance?: number | null;
  rejectionReason?: string | null;
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
  requestedAt: Date | string;
  requestedBy: string;
}

export interface PoAgingAlertPayload {
  type: typeof NotificationType.PO_AGING_WARNING | typeof NotificationType.PO_AGING_ALERT;
  duid: string;
  projectName: string;
  poNumber: string;
  poLineNumber: string;
  agingFlag: string;
  pm: string;
  daysOpen: number;
  allowedOpenDays: number;
}

export interface AccountCreatedPayload {
  type: typeof NotificationType.ACCOUNT_CREATED;
  email: string;
  tempPassword?: string;
  staffId?: string;
}

export interface ContractAmendedPayload {
  type: typeof NotificationType.CONTRACT_AMENDED;
  poLineId: string;
  newAmount: number;
  oldAmount: number;
  reason: string;
}

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

/**
 * 📦 MASTER UNION TYPE
 */
export type AllNotificationPayloads =
  | FundRequestStatusPayload
  | FullFundRequestPayload
  | PoAgingAlertPayload
  | AccountCreatedPayload
  | ContractAmendedPayload
  | PasswordResetPayload
  | PasswordChangedPayload;

export interface Notification {
  id: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  payload: AllNotificationPayloads;
}
