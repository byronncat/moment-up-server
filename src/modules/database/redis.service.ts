import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType) {}

  public async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }

  public async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) await this.redisClient.setEx(key, ttl, value);
    else await this.redisClient.set(key, value);
  }

  public async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  public async exists(key: string): Promise<number> {
    return await this.redisClient.exists(key);
  }

  public async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  public async getHashField(key: string, field: string): Promise<string | undefined> {
    const result = await this.redisClient.hGet(key, field);
    return result ?? undefined;
  }

  public async getAllHashFields(key: string): Promise<Record<string, string>> {
    return await this.redisClient.hGetAll(key);
  }

  public async setHashFields(key: string, data: Record<string, string | number>): Promise<number> {
    return await this.redisClient.hSet(key, data);
  }

  public async addToSortedSet(key: string, members: Array<{ score: number; value: string }>): Promise<number> {
    return await this.redisClient.zAdd(key, members);
  }

  public async countSortedSetByScore(key: string, min: number, max: number): Promise<number> {
    return await this.redisClient.zCount(key, min, max);
  }

  public async getSortedSetRange(key: string, start: number, stop: number, options?: { REV?: boolean }): Promise<string[]> {
    return await this.redisClient.zRange(key, start, stop, options);
  }

  public async removeSortedSetByScore(key: string, min: number, max: number): Promise<number> {
    return await this.redisClient.zRemRangeByScore(key, min, max);
  }

  public async getSortedSetSize(key: string): Promise<number> {
    return await this.redisClient.zCard(key);
  }

  public async setExpiration(key: string, seconds: number): Promise<boolean> {
    const result = await this.redisClient.expire(key, seconds);
    return Boolean(result);
  }
}
