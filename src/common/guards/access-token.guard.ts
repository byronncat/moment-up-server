import type { AuthRequest } from 'library';
import type { ExpressSession } from 'express-session';

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.accessToken;
    const session: ExpressSession = request.session;

    try {
      if (!token) throw new UnauthorizedException('Access token is required');

      const user = await this.userService.getById(token.sub);
      if (!user) throw new UnauthorizedException('User not found');
      if (!user.verified) throw new ForbiddenException('Email not verified');
      if (user.blocked) throw new ForbiddenException('Account is blocked');

      return true;
    } catch (error) {
      this.clearAuthState(session);
      this.logger.error(error.message, {
        context: 'Auth',
        location: 'AccessTokenGuard',
      });

      if (error instanceof UnauthorizedException || error instanceof ForbiddenException)
        throw error;
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private clearAuthState(session: ExpressSession) {
    if (session?.user) {
      session.user = undefined;
      session.cookie.maxAge = 3 * 24 * 60 * 60 * 1000; // 3 days default
    }
  }
}
