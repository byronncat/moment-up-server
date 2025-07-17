import type { Request, Response } from 'express';
import type { ExpressSession } from 'express-session';

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { COOKIE_NAME } from '../constants';

@Catch()
export class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { session: ExpressSession }>();

    const isErrorWithMessage = (error: unknown): error is { message: string; name?: string } => {
      return typeof error === 'object' && error !== null && 'message' in error;
    };

    if (
      isErrorWithMessage(exception) &&
      (exception.message.includes('invalid csrf token') ||
        (exception.name === 'ForbiddenError' && exception.message.includes('csrf')))
    ) {
      if (request.session) delete request.session.user;
      response.clearCookie(COOKIE_NAME.SESSION);
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Invalid CSRF token',
        error: 'Forbidden',
      });
      return;
    }

    throw exception; // Re-throw if not a CSRF error
  }
}
