import type { GoogleProfile } from 'library';

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService
  ) {
    const clientId = configService.get('google.clientId');
    const clientSecret = configService.get('google.clientSecret');
    const baseUrl = configService.get('app.baseUrl');
    const callbackURL = `${baseUrl}/v1/auth/google/callback`;

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback
  ) {
    try {
      this.logger.info(`Google OAuth validation started for profile ID: ${profile.id}`, {
        location: 'GoogleStrategy.validate',
        context: 'OAuth',
      });

      const { id, displayName, emails, photos } = profile;
      const email = emails[0]?.value;

      if (!email) return done(new Error('No email found in Google profile'), false);

      const user = {
        googleId: id,
        email,
        name: displayName,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        picture: photos[0]?.value,
        accessToken,
      };
      return done(null, user);
    } catch (error) {
      this.logger.error(`Google OAuth validation failed: ${error.message}`, {
        location: 'GoogleStrategy.validate',
        context: 'OAuth',
      });
      return done(error, false);
    }
  }
}
