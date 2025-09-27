import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { RedisService } from './redis.service';
import { createClient } from 'redis';
import { CloudinaryService } from './cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService, logger: Logger) => {
        const client = createClient({
          username: configService.get<string>('db.redis.username'),
          password: configService.get<string>('db.redis.password'),
          socket: {
            host: configService.get<string>('db.redis.host'),
            port: configService.get<number>('db.redis.port'),
            reconnectStrategy: (retries) => {
              if (retries > 10) return new Error('Redis connection failed');
              return Math.min(retries * 50, 500); // back off for 500ms
            },
          },
        });

        client.on('error', (error) => {
          logger.error(error.message, {
            location: 'redis',
            context: 'Database',
          });
        });

        client.on('reconnecting', () => {
          logger.info('Redis reconnecting...', {
            location: 'redis',
            context: 'Database',
          });
        });

        await client.connect();
        return client;
      },
      inject: [ConfigService, WINSTON_MODULE_PROVIDER],
    },
    {
      provide: 'CLOUDINARY_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const cloudName = configService.get<string>('db.cloudinary.cloudName');
        const apiKey = configService.get<string>('db.cloudinary.apiKey');
        const apiSecret = configService.get<string>('db.cloudinary.apiSecret');

        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });

        return cloudinary;
      },
      inject: [ConfigService],
    },
    SupabaseService,
    RedisService,
    CloudinaryService,
  ],
  exports: [SupabaseService, RedisService, CloudinaryService, 'REDIS_CLIENT', 'CLOUDINARY_CLIENT'],
})
export class DatabaseModule {}
