import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';

// === Type ===
import type { HashtagDto } from 'api';
import type { Hashtag, TrendingReport } from 'schema';

export interface HashtagMetrics {
  hashtag: string;
  currentCount: number;
  previousCount: number;
  rateOfChange: number;
  trendingScore: number;
  isSpike: boolean;
}

export interface TrendingConfig {
  windowSizeMinutes: number;
  minCountThreshold: number;
  spikeMultiplier: number;
  baseWeight: number;
  changeWeight: number;
  spikeWeight: number;
}

interface TimeWindow {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  hashtags: Map<string, number>;
}

// === Service ===
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../database/redis.service';
import { SupabaseService } from '../database/supabase.service';
import { TrendingReportDto } from './dto';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

const ErrorMessage = {
  Hashtag: {
    TopicNotFound: 'Topic not found',
    ReportFailed: 'Failed to report trending topic',
  },
  RefreshUserHashtags: 'Failed to refresh user hashtags',
};

@Injectable()
export class TrendingService {
  private readonly defaultTrendingConfig: TrendingConfig = {
    windowSizeMinutes: 60, // 60-minute windows
    minCountThreshold: 5, // Minimum count to be considered
    spikeMultiplier: 2.0, // Multiplier to detect spikes
    baseWeight: 0.3, // Weight for base count
    changeWeight: 0.4, // Weight for rate of change
    spikeWeight: 0.3, // Weight for spike detection
  };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService
  ) {}

  public async getTrending(limit: number): Promise<HashtagDto[]> {
    // TEMPORARY
    if (this.configService.get('MOCK_DATA')) {
      const mockHashtags = new Set<string>();

      while (mockHashtags.size < 5) {
        mockHashtags.add(faker.lorem.word());
      }

      return Array.from(mockHashtags).map((hashtag) => ({
        name: hashtag,
        count: faker.number.int({ min: 1, max: 100000 }),
      }));
    }
    // TEMPORARY

    const trendingMetrics = await this.getTrendingHashtags(limit);
    const trendingHashtags: HashtagDto[] = trendingMetrics.map((metric) => ({
      name: metric.hashtag,
      count: metric.currentCount,
    }));

    return trendingHashtags;
  }

  public async getTrendingHashtagScoreMap(limit = 200): Promise<Record<number, number>> {
    const metrics = await this.getTrendingHashtags(limit);
    if (metrics.length === 0) return {};

    const names = Array.from(new Set(metrics.map((m) => m.hashtag.toLowerCase())));

    const { data: rows, error } = await this.supabaseService
      .getClient()
      .from('hashtags')
      .select('id,name')
      .in('name', names);

    if (error) {
      this.logger.error(error.message, {
        location: 'getTrendingHashtagScoreMap',
        context: 'TrendingService',
      });
      return {};
    }

    const nameToId = new Map<string, number>();
    const rowList = Array.isArray(rows) ? rows : [];
    for (const r of rowList as any[]) {
      const name = (r?.name ?? '').toString();
      const id = Number(r?.id);
      if (!name) continue;
      if (!Number.isFinite(id)) continue;
      nameToId.set(name.toLowerCase(), id);
    }

    const result: Record<number, number> = {} as Record<number, number>;
    metrics.forEach((m) => {
      const id = nameToId.get(m.hashtag.toLowerCase());
      if (id !== undefined) {
        result[id] = m.trendingScore;
      }
    });

    return result;
  }

  public async processPostHashtags(context: string) {
    const hashtagRegex = /#(\w+)/g;
    const hashtags =
      context.match(hashtagRegex)?.map((hashtag) => hashtag.slice(1).toLowerCase()) ?? [];
    const uniqueHashtags = [...new Set(hashtags)];

    if (uniqueHashtags.length > 0) {
      try {
        await Promise.all(
          uniqueHashtags.map(async (hashtag) => {
            const now = Date.now();
            const key = `trending:hashtag:${hashtag.toLowerCase()}`;
            await this.redisService.addToSortedSet(key, [
              {
                score: now,
                value: now.toString(),
              },
            ]);
            await this.redisService.setExpiration(key, 7200); // 2 hours
          })
        );
      } catch (error) {
        this.logger.error(error.message, {
          location: 'processPostHashtags',
          context: 'TrendingService',
        });
        return undefined;
      }
    }

    return uniqueHashtags;
  }

  public async reportTrendingTopic({ topic, type }: TrendingReportDto, userId: string) {
    // TEMPORARY
    if (this.configService.get('MOCK_DATA')) {
      const trendingReports = await this.supabaseService.insert<TrendingReport>(
        'trending_reports',
        {
          hashtag_id: 15,
          user_id: userId,
          type,
        }
      );
      if (trendingReports.length === 0)
        throw new InternalServerErrorException(ErrorMessage.Hashtag.ReportFailed);
      return;
    }
    // TEMPORARY

    const topics = await this.supabaseService.select<Hashtag>('hashtags', {
      select: 'id',
      where: {
        name: topic,
      },
    });
    if (topics.length === 0) throw new NotFoundException(ErrorMessage.Hashtag.TopicNotFound);

    const trendingReports = await this.supabaseService.insert<TrendingReport>('trending_reports', {
      hashtag_id: topics[0].id,
      user_id: userId,
      type,
    });
    if (trendingReports.length === 0)
      throw new InternalServerErrorException('Failed to report trending topic');
  }

  private async getTrendingHashtags(limit: number): Promise<HashtagMetrics[]> {
    await this.cleanupOldWindows();

    const currentWindow = await this.getCurrentWindow();
    const previousWindow = await this.getPreviousWindow();
    const metrics = await this.calculateMetrics(currentWindow, previousWindow);

    return metrics.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, limit);
  }

  private async getCurrentWindow(): Promise<TimeWindow> {
    const config = await this.getTrendingConfig();
    const now = Date.now();
    const windowStart = now - config.windowSizeMinutes * 60 * 1000;

    return this.getWindowCounts(windowStart, now);
  }

  private async getPreviousWindow(): Promise<TimeWindow> {
    const config = await this.getTrendingConfig();
    const now = Date.now();
    const currentWindowStart = now - config.windowSizeMinutes * 60 * 1000;
    const previousWindowStart = currentWindowStart - config.windowSizeMinutes * 60 * 1000;

    return this.getWindowCounts(previousWindowStart, currentWindowStart);
  }

  private async getWindowCounts(start: number, end: number): Promise<TimeWindow> {
    const hashtags = new Map<string, number>();
    const activeHashtags = await this.getActiveHashtagsInWindow(start, end);

    const countPromises = activeHashtags.map(async (hashtag) => {
      const count = await this.redisService.countSortedSetByScore(
        `trending:hashtag:${hashtag.toLowerCase()}`,
        start,
        end
      );
      return { hashtag, count };
    });

    const results = await Promise.all(countPromises);

    results.forEach(({ hashtag, count }) => {
      if (count > 0) {
        hashtags.set(hashtag, count);
      }
    });

    return { start, end, hashtags };
  }

  private async getActiveHashtagsInWindow(startTime: number, endTime: number): Promise<string[]> {
    const pattern = 'trending:hashtag:*';
    const keys = await this.redisService.keys(pattern);
    const activeHashtags: string[] = [];

    for (const key of keys) {
      const count = await this.redisService.countSortedSetByScore(key, startTime, endTime);
      if (count > 0) {
        const hashtag = key.replace('trending:hashtag:', '');
        activeHashtags.push(hashtag);
      }
    }

    return activeHashtags;
  }

  private async calculateMetrics(
    currentWindow: TimeWindow,
    previousWindow: TimeWindow
  ): Promise<HashtagMetrics[]> {
    const config = await this.getTrendingConfig();
    const metrics: HashtagMetrics[] = [];
    const allHashtags = new Set([
      ...currentWindow.hashtags.keys(),
      ...previousWindow.hashtags.keys(),
    ]);

    allHashtags.forEach((hashtag) => {
      const currentCount = currentWindow.hashtags.get(hashtag) ?? 0;
      const previousCount = previousWindow.hashtags.get(hashtag) ?? 0;

      if (currentCount < config.minCountThreshold) return;

      const rateOfChange = this.calculateRateOfChange(currentCount, previousCount);
      const isSpike = this.detectSpike(currentCount, previousCount, config);
      const trendingScore = this.calculateTrendingScore(
        currentCount,
        rateOfChange,
        isSpike,
        config
      );

      metrics.push({
        hashtag,
        currentCount,
        previousCount,
        rateOfChange,
        trendingScore,
        isSpike,
      });
    });

    return metrics;
  }

  private calculateRateOfChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 1.0 : 0.0; // New hashtag has 100% growth
    return (current - previous) / previous;
  }

  private detectSpike(current: number, previous: number, config: TrendingConfig) {
    if (previous === 0) return current >= config.minCountThreshold;
    return current >= previous * config.spikeMultiplier;
  }

  private calculateTrendingScore(
    count: number,
    rateOfChange: number,
    isSpike: boolean,
    config: TrendingConfig
  ) {
    /* Formula:
     * Score = log(Count + 1) * BaseWeight
     *       + sigmoid(RateOfChange) * ChangeWeight
     *       + SpikeBonus * SpikeWeight
     *
     * - Count is log-scaled to reduce the dominance of very large values.
     * - Rate of change is normalized with a sigmoid (bounded 0–1) to highlight spikes without exploding.
     * - Spike bonus provides an additional boost for sudden surges.
     */

    const normalizedCount = Math.log(count + 1);
    const normalizedChange = 2 / (1 + Math.exp(-rateOfChange)) - 1;
    const spikeBonus = isSpike ? 1.0 : 0.0;

    const weightedScore =
      config.baseWeight * normalizedCount +
      config.changeWeight * Math.max(0, normalizedChange) +
      config.spikeWeight * spikeBonus;

    return Math.max(0, weightedScore);
  }

  private async cleanupOldWindows() {
    const config = await this.getTrendingConfig();
    const cutoffTime = Date.now() - config.windowSizeMinutes * 2 * 60 * 1000;

    const pattern = 'trending:hashtag:*';
    const keys = await this.redisService.keys(pattern);

    for (const key of keys) {
      await this.redisService.removeSortedSetByScore(key, 0, cutoffTime);
      const count = await this.redisService.getSortedSetSize(key);
      if (count === 0) await this.redisService.del(key);
    }
  }

  private async getTrendingConfig(): Promise<TrendingConfig> {
    const redisConfig = await this.redisService.getAllHashFields('config:trending');

    if (Object.keys(redisConfig).length === 0) {
      const serializedConfig: Record<string, string> = {};
      for (const [key, value] of Object.entries(this.defaultTrendingConfig)) {
        serializedConfig[key] = typeof value === 'number' ? value.toString() : value;
      }

      await this.redisService.setHashFields('config:trending', serializedConfig);
      return { ...this.defaultTrendingConfig };
    }

    return {
      windowSizeMinutes:
        parseFloat(redisConfig.windowSizeMinutes) || this.defaultTrendingConfig.windowSizeMinutes,
      minCountThreshold:
        parseFloat(redisConfig.minCountThreshold) || this.defaultTrendingConfig.minCountThreshold,
      spikeMultiplier:
        parseFloat(redisConfig.spikeMultiplier) || this.defaultTrendingConfig.spikeMultiplier,
      baseWeight: parseFloat(redisConfig.baseWeight) || this.defaultTrendingConfig.baseWeight,
      changeWeight: parseFloat(redisConfig.changeWeight) || this.defaultTrendingConfig.changeWeight,
      spikeWeight: parseFloat(redisConfig.spikeWeight) || this.defaultTrendingConfig.spikeWeight,
    };
  }

  public async refreshUserHashtags() {
    try {
      const { error } = await this.supabaseService.getClient().rpc('refresh_user_hashtag_stats');
      if (error) throw new InternalServerErrorException(error.message);
    } catch (error) {
      this.logger.error(error.message, {
        location: 'refreshUserHashtags',
        context: 'TrendingService',
      });
      throw new InternalServerErrorException(ErrorMessage.RefreshUserHashtags);
    }
  }
}
