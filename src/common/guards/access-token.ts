import type { AuthRequest } from 'jwt-library';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.accessToken;

    try {
      if (!token?.sub) throw new UnauthorizedException('Access token is required.');
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Auth',
        location: 'AccessTokenGuard',
      });

      if (error instanceof UnauthorizedException || error instanceof ForbiddenException)
        throw error;
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
