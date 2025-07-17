import type { Response, NextFunction } from 'express';
import type { JwtPayload, AuthRequest } from 'library';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Auth } from '../helpers';

@Injectable()
export class AccessTokenMiddleware implements NestMiddleware {
  private readonly jwtSecret: string = this.configService.get('security.jwtSecret')!;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async use(request: AuthRequest, response: Response, next: NextFunction) {
    const token = Auth.parseBearer(request.headers.authorization);
    if (!token) return next();

    const payload = await this.verifyToken(token);
    if (payload) request.accessToken = payload;

    next();
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });
      if (!payload.sub || !payload.jti) throw new Error('Invalid token payload');
      return payload;
    } catch {
      return null;
    }
  }
}
