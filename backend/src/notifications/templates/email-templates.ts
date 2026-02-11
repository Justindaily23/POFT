// src/notifications/templates/email-templates.ts
import { NotificationType } from '@prisma/client';
import { FundRequestPayload, AccountCreatedPayload } from '../types/notification-payload.interface';

export const EmailTemplates: Record<string, (payload: any) => { subject: string; html: string; text?: string }> = {
  [NotificationType.FUND_REQUEST_CREATED]: (p: FundRequestPayload) => ({
    subject: 'New Fund Request Created',
    html: `<p>A new fund request has been created for <strong>${p.duid}</strong>:</p>
           <pre style="background: #f4f4f4; padding: 10px;">Amount: ₦${p.requestedAmount.toLocaleString()}\nPurpose: ${p.requestPurpose}</pre>`,
  }),

  [NotificationType.FUND_REQUEST_APPROVED]: (p: any) => ({
    subject: 'Your Fund Request Approved',
    html: `<p>Your fund request has been approved:</p><pre>${JSON.stringify(p, null, 2)}</pre>`,
  }),

  [NotificationType.FUND_REQUEST_REJECTED]: (p: any) => ({
    subject: 'Your Fund Request Rejected',
    html: `<p>Your fund request was rejected:</p><pre>${JSON.stringify(p, null, 2)}</pre>`,
  }),

  [NotificationType.CONTRACT_AMENDED]: (p: any) => ({
    subject: 'PO Line Contract Amended',
    html: `<p>A contract amendment occurred:</p><pre>${JSON.stringify(p, null, 2)}</pre>`,
  }),

  [NotificationType.PO_AGING_WARNING]: (p: any) => {
    // Preserving your specific validation logic for Aging
    const poNumber = p.poNumber || 'N/A';
    return {
      subject: `PO Aging Alert: ${poNumber}`,
      html: `
        <p>PO Line <strong>${p.poLineNumber}</strong> has reached an aging status of <strong>${p.agingFlag}</strong>.</p>
        <p>Days Open: ${p.daysOpen}<br>Allowed Open Days: ${p.allowedOpenDays}</p>
      `,
    };
  },

  [NotificationType.ACCOUNT_CREATED]: (p: AccountCreatedPayload) => ({
    subject: 'Your Account Has Been Created',
    html: `
      <p>Welcome!</p>
      <p>Your Staff ID is: <strong>${p.staffId || 'N/A'}</strong></p>
      <p>Your temporary password is: <strong>${p.tempPassword}</strong></p>
      <p>Please login to reset your password.</p>
    `,
  }),
};
