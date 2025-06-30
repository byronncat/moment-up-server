import { Inject, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class RequestLogger implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, originalUrl } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = ctx.getResponse<Response>();
        const duration = Date.now() - startTime;
        this.logger.http('Request success', {
          method,
          url: originalUrl,
          status: statusCode,
          responseTime: duration,
        });
      }),
      catchError((error) => {
        const statusCode = error.status;
        const duration = Date.now() - startTime;
        this.logger.http('Request failed', {
          method,
          url: originalUrl,
          status: statusCode,
          responseTime: duration,
        });
        return throwError(() => error);
      })
    );
  }
}
