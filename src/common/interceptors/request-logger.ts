import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { tap } from 'rxjs/operators';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class RequestLogger implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = ctx.getResponse<Response>();
        this.logger.http('Request success', {
          method,
          url: originalUrl,
          status: statusCode,
        });
      })
    );
  }
}
