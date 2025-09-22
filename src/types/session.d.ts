declare module 'app-session' {
  import type { Session, SessionData as BaseSessionData } from 'express-session';

  interface OtpPayload {
    code: string;
    expiresAt: number;
    purpose: 'password-reset' | 'email-verification' | 'account-verification';
    uid: string;
  }

  interface AppSessionData {
    user?: { sub: string; jti: string };
    otp?: OtpPayload;
    csrfToken?: string;
  }

  type ExpressSession = Session & BaseSessionData;
  type AppSession = ExpressSession & AppSessionData;
}
