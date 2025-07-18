import type { Request, Response } from 'express';
import type { ExpressSession } from 'express-session';

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class CsrfExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const isErrorWithMessage = (error: unknown): error is { message: string; name?: string } => {
      return typeof error === 'object' && error !== null && 'message' in error;
    };

    if (
      isErrorWithMessage(exception) &&
      (exception.message.includes('invalid csrf token') ||
        (exception.name === 'ForbiddenError' && exception.message.includes('csrf')))
    ) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request & { session: ExpressSession }>();
      const method = request.method;
      const originalUrl = request.originalUrl;
      this.logger.http('Invalid CSRF token', {
        method,
        url: originalUrl,
        status: HttpStatus.FORBIDDEN,
      });
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
