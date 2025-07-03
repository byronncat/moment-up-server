import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: { sub: string; jti: string };
    csrfToken: string;
  }

  type ExpressSession = Session & SessionData;
}
