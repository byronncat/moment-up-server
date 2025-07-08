import 'express-session';

interface OtpData {
  code: string;
  expiresAt: number;
  purpose: 'password-reset' | 'email-verification' | 'account-verification';
  uid: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: { sub: string; jti: string };
    otp?: OtpData;
    csrfToken: string;
  }

  type ExpressSession = Session & SessionData;
}
