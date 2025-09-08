import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const { createClient } = await import('redis');
        
        const client = createClient({
          username: configService.get<string>('db.redisUsername'),
          password: configService.get<string>('db.redisPassword'),
          socket: {
            host: configService.get<string>('db.redisHost'),
            port: configService.get<number>('db.redisPort'),
          },
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
