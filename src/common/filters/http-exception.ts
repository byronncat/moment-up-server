import type { Request, Response } from 'express';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.logger.http(
      `Request failed in ${status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'server' : 'client'} error`,
      {
        method: request.method,
        url: request.originalUrl,
        status,
      }
    );

    const responsePayload =
      status === HttpStatus.TOO_MANY_REQUESTS
        ? {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
          }
        : exception.getResponse();

    response.status(status).json(responsePayload);
  }
}
