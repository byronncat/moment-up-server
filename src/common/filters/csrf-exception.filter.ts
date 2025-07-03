import type { Request, Response } from 'express';
import type { ExpressSession } from 'express-session';

import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
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
      response.clearCookie(COOKIE_NAME.CSRF);

      response.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token',
        error: 'Forbidden',
      });
      return;
    }

    if (typeof exception === 'object' && exception !== null && 'getStatus' in exception) {
      const nestException = exception as { getStatus: () => number; getResponse: () => unknown };
      const status = nestException.getStatus();
      response.status(status).json(nestException.getResponse());
    } else {
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
