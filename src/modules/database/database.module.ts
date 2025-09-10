import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { RedisService } from './redis.service';
import { createClient } from 'redis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = createClient({
          username: configService.get<string>('db.redisUsername'),
          password: configService.get<string>('db.redisPassword'),
          socket: {
            host: configService.get<string>('db.redisHost'),
            port: configService.get<number>('db.redisPort'),
            reconnectStrategy: (retries) => {
              if (retries > 10) return new Error('Redis connection failed');
              return Math.min(retries * 50, 500); // back off for 500ms
            },
          },
        });

        client.on('error', (error) => {
          console.error('Redis connection error:', error);
        });

        client.on('reconnecting', () => {
          console.log('Redis reconnecting...');
        });

        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
    SupabaseService,
    RedisService,
  ],
  exports: [SupabaseService, RedisService, 'REDIS_CLIENT'],
})
export class DatabaseModule {}
