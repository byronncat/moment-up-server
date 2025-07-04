import { NestFactory } from '@nestjs/core';
import { VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { COOKIE_NAME } from './common/constants';

import helmet from 'helmet';
import { csrfSync } from 'csrf-sync';
import * as cookieParser from 'cookie-parser';

import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import * as session from 'express-session';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  let app;
  if (process.env.NODE_ENV === 'development') {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '../certificates/localhost+2-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../certificates/localhost+2.pem')),
    };

    app = await NestFactory.create(AppModule, {
      httpsOptions,
    });
  } else app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // === Configurations ===
  const configService = app.get(ConfigService);
  const port = configService.get<number>('http.port');
  const prefix = configService.get<string>('http.prefix');
  const allowedOrigin = configService.get<string>('http.allowedOrigin');
  const sessionSecret = configService.get<string>('security.sessionSecret');

  const redisUsername = configService.get<string>('db.redisUsername');
  const redisPassword = configService.get<string>('db.redisPassword');
  const redisHost = configService.get<string>('db.redisHost');
  const redisPort = configService.get<number>('db.redisPort');

  // === Session ===
  const redisClient = createClient({
    username: redisUsername,
    password: redisPassword,
    socket: {
      host: redisHost,
      port: redisPort,
    },
  });

  redisClient.on('error', (error) => logger.error('Redis Error:', error));

  await redisClient.connect();
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'session:',
  });

  app.use(
    session({
      store: redisStore,
      secret: sessionSecret!,
      name: COOKIE_NAME.CSRF,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
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
    origin: [allowedOrigin, "https://localhost:3000"],
    credentials: true,
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

  await app.listen(port!, () => {
    logger.log(`Server is running on http://localhost:${port}${prefix ? `/${prefix}` : ''}`);
  });
}
bootstrap();
