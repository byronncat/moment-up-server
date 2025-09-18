declare module 'jwt-library' {
  import type { Request } from 'express';

  type JwtPayload = {
    sub?: string;
    jti?: string;
  };

  interface AuthRequest extends Request {
    accessToken?: JwtPayload;
  }
}

declare module 'passport-library' {
  type GoogleUser = {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
  };

  interface GoogleProfile {
    id: string;
    displayName: string;
    name: {
      familyName: string;
      givenName: string;
    };
    emails: Array<{
      value: string;
      verified: boolean;
    }>;
    photos: Array<{
      value: string;
    }>;
  }
}
