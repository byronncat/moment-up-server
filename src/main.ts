import { NestFactory } from '@nestjs/core';
import { VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SESSION_COOKIE_NAME } from './common/constants';

import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import * as session from 'express-session';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  let app;
  if (process.env.NODE_ENV === 'development') {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '../certificates/localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../certificates/localhost.pem')),
    };

    app = await NestFactory.create(AppModule, {
      httpsOptions,
    });
  } else app = await NestFactory.create(AppModule);

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

  if (!port || !allowedOrigin || !sessionSecret) throw new Error('Server config is missing!');
  if (!redisUsername || !redisPassword || !redisHost || !redisPort)
    throw new Error('Redis config is missing!');

  // === Session ===
  const redisClient = createClient({
    username: redisUsername,
    password: redisPassword,
    socket: {
      host: redisHost,
      port: redisPort,
    },
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  await redisClient.connect();
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'session:',
  });

  app.use(
    session({
      store: redisStore,
      secret: sessionSecret,
      name: SESSION_COOKIE_NAME,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 365 * 24 * 60 * 60 * 1000,
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
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Server running on https://localhost:${port}${prefix ? `/${prefix}` : ''}`);
}
bootstrap();
