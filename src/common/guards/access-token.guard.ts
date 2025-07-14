import type { Request } from 'express';
import type { JwtPayload } from 'library';

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../modules/user/user.service';

interface AuthRequest extends Request {
  accessToken?: {
    sub: string;
    jti: string;
  };
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly jwtSecret: string = this.configService.get('security.jwtSecret')!;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException('Access token is required');
    try {
      const payload = await this.verifyToken(token);

      const user = await this.userService.getById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      if (!user.verified) throw new ForbiddenException('Email not verified');
      if (user.blocked) throw new ForbiddenException('Account is blocked');

      request.accessToken = {
        sub: payload.sub,
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException)
        throw error;
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: AuthRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    console.log('Access token:', authHeader);

    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyToken(token: string): Promise<{ sub: string; jti: string }> {
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });

      if (!payload.sub || !payload.jti) throw new UnauthorizedException('Invalid token payload');
      return payload;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Token verification failed');
    }
  }
}
