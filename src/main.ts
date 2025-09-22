import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

import { NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Cookie } from './common/constants';

import helmet from 'helmet';
import { csrfSync } from 'csrf-sync';
import * as cookieParser from 'cookie-parser';

import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import * as session from 'express-session';

import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { createWinstonTransports } from './configurations';

const CSRF_ERROR_CODE = 'EBADCSRFTOKEN';

async function bootstrap() {
  let app: NestExpressApplication;
  const logger = winston.createLogger({
    transports: createWinstonTransports(false),
  });

  const https = process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true';
  if (https) {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '../certificates/localhost+2-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../certificates/localhost+2.pem')),
    };

    app = await NestFactory.create(AppModule, {
      httpsOptions,
    });
  } else app = await NestFactory.create(AppModule);

  // === For Render deployment ===
  app.set('trust proxy', 1);

  // === Global Pipes ===
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // === Configurations ===
  const configService = app.get(ConfigService);
  const port = configService.get<number>('http.port');
  const prefix = configService.get<string>('http.prefix');
  const allowedOrigin = configService.get<string>('http.allowedOrigin')!;

  const sessionSecret = configService.get<string>('security.sessionSecret');
  const redisUsername = configService.get<string>('db.redis.username');
  const redisPassword = configService.get<string>('db.redis.password');
  const redisHost = configService.get<string>('db.redis.host');
  const redisPort = configService.get<number>('db.redis.port');

  // === Session ===
  const redisClient = createClient({
    username: redisUsername,
    password: redisPassword,
    socket: {
      host: redisHost,
      port: redisPort,
    },
  });

  redisClient.on('error', (error) =>
    logger.error(JSON.stringify(error), {
      location: 'Redis Client',
      context: 'Database',
    })
  );

  await redisClient.connect();
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'session:',
  });

  app.use(
    session({
      store: redisStore,
      secret: sessionSecret!,
      name: Cookie.Name.SESSION,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: https,
        sameSite: https ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // === Global configs ===
  if (prefix) app.setGlobalPrefix(prefix);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors({
    origin: [allowedOrigin],
    credentials: true,
  });

  const staticPath = path.join(process.cwd(), 'src', 'common', 'static');
  app.useStaticAssets(staticPath, {
    prefix: '/static/',
  });

  app.use('/favicon.ico', (req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'favicon.ico'));
  });

  app.use(helmet());
  app.use(cookieParser());
  const { csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: (req) => {
      const token = req.headers['x-csrf-token'];
      return Array.isArray(token) ? token[0] : token;
    },
    getTokenFromState: (req) => req.session.csrfToken,
    storeTokenInState: (req, token) => {
      req.session.csrfToken = token;
    },
    size: 128,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });
  app.use(csrfSynchronisedProtection);
  app.use((error: any, request: Request, response: Response, next: NextFunction) => {
    if (error.code === CSRF_ERROR_CODE) {
      logger.http(error.message, {
        method: request.method,
        url: request.originalUrl,
        status: HttpStatus.FORBIDDEN,
      });
      return response.status(HttpStatus.FORBIDDEN).json({ message: 'CSRF validation failed.' });
    }
    next(error);
  });

  await app.listen(port!, () => {
    logger.info(`Server is running on ${https ? 'https' : 'http'}://localhost:${port}${prefix ? `/${prefix}` : ''}`);
  });
}
bootstrap();
