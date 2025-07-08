import type { ExpressSession } from 'express-session';
import { authLib } from '../libraries';

export interface OtpData {
  code: string;
  expiresAt: number;
  purpose: 'password-reset' | 'email-verification' | 'account-verification';
  uid: string;
}

export interface OtpConfig {
  expirationTimeMs: number;
  purpose: OtpData['purpose'];
}

export function create(userId: string, config: OtpConfig): OtpData {
  const code = authLib.generateId('otp');
  const expiresAt = Date.now() + config.expirationTimeMs;

  return {
    code,
    expiresAt,
    purpose: config.purpose,
    uid: userId,
  };
}

export function isValid(otpData: OtpData | undefined): boolean {
  if (!otpData) return false;
  return Date.now() < otpData.expiresAt;
}

export function verify(
  session: ExpressSession,
  inputCode: string,
  purpose: OtpData['purpose']
): boolean {
  const { otp } = session;

  if (!otp) return false;
  if (!isValid(otp)) return false;
  if (otp.purpose !== purpose) return false;
  if (otp.code !== inputCode) return false;

  return true;
}

export function clear(session: ExpressSession): void {
  session.otp = undefined;
}
