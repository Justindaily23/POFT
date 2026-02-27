export interface NotificationPayload {
  // --- Existing Fund Request Fields ---
  approvedAmount?: number;
  reason?: string;
  duid?: string;

  // --- 🛡️ New PO Aging / Finance Alert Fields ---
  status?: "RED" | "WARNING" | "GREEN" | string; // For SLA status
  daysOpen?: number; // For aging duration
  projectName?: string; // For context in the alert
  poNumber?: string; // For direct reference
}

export interface Notification {
  id: string;
  // Added PO_AGING_ALERT to the literal type for better autocompletion
  type:
    | "FUND_REQUEST_APPROVED"
    | "FUND_REQUEST_REJECTED"
    | "FUND_REQUEST_CREATED"
    | "PO_AGING_ALERT"
    | string;
  readAt?: string | null;
  createdAt: string;
  payload: NotificationPayload; // Now recognizes 'status' and 'daysOpen'
}
