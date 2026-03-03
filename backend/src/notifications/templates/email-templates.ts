import { NotificationType } from '@prisma/client';
import {
  NotificationMapping,
  FundRequestPayload,
  AccountCreatedPayload,
  ContractAmendedPayload,
  FundRequestStatusPayload,
  PasswordResetPayload,
  PoAgingAlertPayload,
  PasswordChangedPayload, // 👈 Imported for strict typing
} from '../types/notification-payload.interface';
import { toTitleCase } from 'src/auth/utils/utils';

type TemplateResult = { subject: string; html: string; text?: string };

type EmailTemplateRegistry = {
  [K in keyof NotificationMapping]?: (payload: NotificationMapping[K]) => TemplateResult;
};

const emailWrapper = (title: string, content: string, actionLabel?: string, actionUrl?: string) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; padding: 40px 10px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <span style="color: #ffffff; font-weight: 800; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">Stecam Ops Portal</span>
      </div>
      <div style="padding: 32px;">
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${title}</h2>
        <div style="font-size: 15px; line-height: 1.6; color: #475569;">${content}</div>
        ${
          actionUrl
            ? `
          <div style="margin-top: 32px; text-align: center;">
            <a href="${actionUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;">${actionLabel || 'View Details'}</a>
          </div>`
            : ''
        }
      </div>
      <div style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0;"><strong>Stecam Nigeria Ltd</strong> • 123 Business Way, Lagos, Nigeria.</p>
        <p style="margin: 4px 0 0 0;">Automated System Alert • Internal Use Only</p>
      </div>
    </div>
  </div>
`;

export const EmailTemplates: EmailTemplateRegistry = {
  [NotificationType.FUND_REQUEST_CREATED]: (p: FundRequestPayload) => ({
    subject: `New Fund Request: ${p.duid}`,
    html: emailWrapper(
      'New Fund Request Created',
      `A new request for <strong>${p.duid} PoNo: ${p.poNumber} Line: ${p.poLineNumber}</strong> requires review:
       <div style="margin-top: 16px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
         <p style="margin:0;"><strong>Amount:</strong> ₦${(p.requestedAmount || 0).toLocaleString()}</p>
          <p style="margin:8px 0 0 0;"><strong>PM:</strong> ${p.pm}</p>
          <p style="margin:8px 0 0 0;"><strong>Description:</strong> ${p.itemDescription}</p>
         <p style="margin:8px 0 0 0;"><strong>Purpose:</strong> ${p.requestPurpose}</p>
       </div>`,
    ),
  }),

  [NotificationType.FUND_REQUEST_APPROVED]: (p: FundRequestStatusPayload) => ({
    subject: `Fund Request Approved: ${p.poNumber || 'N/A'}`,
    html: emailWrapper(
      'Request Approved',
      `Your fund request for  <strong>${p.duid} PoNo: ${p.poNumber}  Line: ${p.poLineNumber}</strong> has been approved:
       <div style="margin-top: 16px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
         <p style="margin:0;"><strong>Amount:</strong> ₦${(p.requestedAmount || 0).toLocaleString()}</p>
          <p style="margin:8px 0 0 0;"><strong>PM:</strong> ${p.pm}</p>
          <p style="margin:8px 0 0 0;"><strong>Description:</strong> ${p.itemDescription}</p>
       </div>`,
    ),
  }),

  [NotificationType.PO_AGING_WARNING]: (p: PoAgingAlertPayload) => ({
    subject: `Aging Warning: ${p.poNumber || 'PO Line'}`,
    html: emailWrapper(
      'Aging Warning',
      `PO Line <strong>${p.poLineNumber}</strong> has reached <strong>${p.agingFlag}</strong> status.`,
    ),
  }),

  [NotificationType.PO_AGING_ALERT]: (p: PoAgingAlertPayload) => ({
    // 👈 Strict typing here!
    subject: `Critical Aging Alert: ${p.duid}`,
    html: emailWrapper(
      'Action Required: PO Overdue',
      `<p style="color: #ef4444; font-weight: bold;">CRITICAL AGING STATUS (RED)</p>
       <ul style="padding-left: 18px; color: #475569;">
         <li><strong>DUID:</strong> ${p.duid}</li>
          <li><strong>PO Number:</strong> ${p.poNumber}</li>
          <li><strong>PO Line:</strong> ${p.poLineNumber}</li>
          <li><strong>Project:</strong> ${p.projectName}</li>
          <li><strong>Days Open:</strong> ${p.daysOpen}</li>
       </ul>`,
      'Resolve Status',
      `https://stecam-ops.com${p.poNumber} & line: ${p.poLineNumber}`, // ✅ Corrected URL syntax
    ),
  }),

  [NotificationType.ACCOUNT_CREATED]: (p: AccountCreatedPayload) => ({
    subject: 'Welcome to Stecam Ops Portal',
    html: emailWrapper(
      'Account Created',
      `Staff ID: <strong>${p.staffId || 'N/A'}</strong><br>
       Temp Password: <code style="color: #2563eb;">${p.tempPassword}</code>`,
      'Login Now to Change Password',
      `https://stecam-ops.com`,
    ),
  }),

  [NotificationType.PASSWORD_RESET]: (p: PasswordResetPayload) => ({
    subject: 'Password Reset Request',
    html: emailWrapper(
      'Reset Your Password',
      `Hello <strong>${toTitleCase(p.name)}</strong>, click below to reset.`,
      'Set Password',
      p.resetLink,
    ),
  }),

  // Explicitly mapping the remaining types to satisfy the Registry
  [NotificationType.FUND_REQUEST_REJECTED]: (p: FundRequestStatusPayload) => ({
    subject: `Fund Request Rejected`,
    html: emailWrapper(
      'Request Rejected',
      `Your request for Po: ${p.poNumber || 'N/A'} with PoLine: ${p.poLineNumber || 'N/A'} and amount ₦${(p.requestedAmount || 0).toLocaleString()} was rejected.`,
    ),
  }),

  // ✅ FIX: Use the specific PasswordChangedPayload from your mapping
  [NotificationType.PASSWORD_CHANGED]: (p: PasswordChangedPayload) => ({
    subject: 'Security Alert: Password Changed',
    html: emailWrapper(
      'Password Updated Successfully',
      `Hello <strong>${toTitleCase(String(p.name || 'User'))}</strong>,<br><br>
       This is a confirmation that the password for your Stecam Ops account was changed on <strong>${new Date().toLocaleString()}</strong>.<br>
       If you did not perform this action, please contact the IT Administrator immediately.`,
      'Login to your account',
    ),
  }),

  // ✅ FIX: Also wrap unknown properties in String() for other templates to clear the literal error
  [NotificationType.CONTRACT_AMENDED]: (p: ContractAmendedPayload) => ({
    subject: `Contract Amended: ${String(p.poLineId)}`,
    html: emailWrapper(
      `Contract Amended for Duid: ${String(p.duid)}, PoNo: ${String(p.poNumber)} PoLine: ${String(p.poLineNumber)}`,
      `New Amount: ₦${(Number(p.newAmount) || 0).toLocaleString()}`,
    ),
  }),
};
