import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      this.logger.error('Request processed successfully', { context: 'Database' });
      this.logger.warn('Request processed successfully');
      this.logger.debug('Request processed successfully');
      this.logger.verbose('Request processed successfully');
      this.logger.log('info', 'Request processed successfully');
      this.logger.http('Request processed successfully', {
        method,
        url: originalUrl,
        status: statusCode,
        responseTime: duration,
      });
      this.logger.silly('Request processed successfully');
      this.logger.info('Request processed successfully');
    });

    next();
  }
}
