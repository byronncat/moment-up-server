import type { Request, Response } from 'express';
import type { ExpressSession } from 'express-session';

import { ExceptionFilter, Catch, ArgumentsHost, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { COOKIE_NAME } from '../constants';

@Catch()
export class CsrfExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

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

      this.logger.debug(`NestJS Exception: ${JSON.stringify(nestException.getResponse())}`, {
        location: 'CsrfExceptionFilter.catch',
        context: 'Exception',
        status,
      });

      response.status(status).json(nestException.getResponse());
    } else {
      this.logger.error(`Unexpected error: ${exception}`, {
        location: 'CsrfExceptionFilter.catch',
        context: 'Exception',
        error: exception,
      });

      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
