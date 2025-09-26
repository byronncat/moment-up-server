import type { GoogleProfile } from 'passport-library';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    configService: ConfigService
  ) {
    super({
      clientID: configService.get<string>('google.clientId')!,
      clientSecret: configService.get<string>('google.clientSecret')!,
      callbackURL: `${configService.get<string>('app.baseUrl')}/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
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
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
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
