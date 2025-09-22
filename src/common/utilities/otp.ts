import type { AppSessionData, OtpPayload } from 'app-session';

export interface OtpConfig {
  expirationTimeMs: number;
  purpose: OtpPayload['purpose'];
}

import { Auth } from '../helpers';

export function create(userId: string, config: OtpConfig): OtpPayload {
  const code = Auth.generateId('otp');
  const expiresAt = Date.now() + config.expirationTimeMs;

  return {
    code,
    expiresAt,
    purpose: config.purpose,
    uid: userId,
  };
}

export function isValid(OtpPayload: OtpPayload | undefined): boolean {
  if (!OtpPayload) return false;
  return Date.now() < OtpPayload.expiresAt;
}

export function verify(
  session: AppSessionData,
  inputCode: string,
  purpose: OtpPayload['purpose']
): boolean {
  const { otp } = session;

  if (!otp) return false;
  if (!isValid(otp)) return false;
  if (otp.purpose !== purpose) return false;
  if (otp.code !== inputCode) return false;

  return true;
}

export function clear(session: AppSessionData): void {
  session.otp = undefined;
}
