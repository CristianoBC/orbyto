export type MailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'delivery_failed' };

export interface PasswordResetMail {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}
