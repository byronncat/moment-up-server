import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { String } from 'src/common/helpers';

type MainTable =
  | 'users'
  | 'hashtags'
  | 'posts'
  | 'post_stats'
  | 'stories'
  | 'comments'
  | 'user_reports'
  | 'post_reports'
  | 'trending_reports';
type RelationshipTable =
  | 'post_hashtags'
  | 'follows'
  | 'blocks'
  | 'mutes'
  | 'post_likes'
  | 'post_bookmarks'
  | 'reposts'
  | 'comment_likes';
type Table = MainTable | RelationshipTable;

export interface SelectOptions {
  select?: string;
  where?: Record<string, any>;
  orWhere?: Record<string, any>;
  whereIn?: Record<string, any[]>;
  whereNotIn?: Record<string, any[]>;
  whereGte?: Record<string, any>;
  whereLte?: Record<string, any>;
  whereNull?: string[];
  whereNotNull?: string[];
  caseSensitive?: boolean;
  orderBy?:
    | { column: string; ascending?: boolean }
    | Array<{ column: string; ascending?: boolean }>;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('db.supabase.url');
    const supabaseKey = this.configService.get<string>('db.supabase.key');

    this.supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.info('Supabase client initialized successfully', {
      context: 'Database',
    });
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  private shouldUseIlike(value: any): boolean {
    if (typeof value !== 'string') return false;
    if (String.isUuid(value)) return false;
    return true;
  }

  public async select<T = any>(table: Table, options?: SelectOptions): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select(options?.select ?? '*');

      if (options?.where)
        Object.entries(options.where).forEach(([key, value]) => {
          if (value !== undefined) {
            const useIlike = options.caseSensitive === false && this.shouldUseIlike(value);
            if (useIlike) query = query.ilike(key, `${value}`);
            else query = query.eq(key, value);
          }
        });

      if (options?.orWhere) {
        const orClauses = Object.entries(options.orWhere)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => {
            const useIlike = options.caseSensitive === false && this.shouldUseIlike(value);
            const operator = useIlike ? 'ilike' : 'eq';
            return `${key}.${operator}.${value}`;
          })
          .join(',');
        if (orClauses) query = query.or(orClauses);
      }

      if (options?.whereIn)
        Object.entries(options.whereIn).forEach(([key, values]) => {
          if (values.length > 0) query = query.in(key, values);
        });

      if (options?.whereNotIn)
        Object.entries(options.whereNotIn).forEach(([key, values]) => {
          if (values.length > 0) query = query.not(key, 'in', `(${values.join(',')})`);
        });

      if (options?.whereGte)
        Object.entries(options.whereGte).forEach(([key, value]) => {
          if (value !== undefined) query = query.gte(key, value);
        });

      if (options?.whereLte)
        Object.entries(options.whereLte).forEach(([key, value]) => {
          if (value !== undefined) query = query.lte(key, value);
        });

      if (options?.whereNull)
        options.whereNull.forEach((column) => {
          query = query.is(column, null);
        });

      if (options?.whereNotNull)
        options.whereNotNull.forEach((column) => {
          query = query.not(column, 'is', null);
        });

      if (options?.orderBy) {
        if (Array.isArray(options.orderBy))
          options.orderBy.forEach((order) => {
            query = query.order(order.column, {
              ascending: order.ascending ?? true,
            });
          });
        else
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? true,
          });
      }

      if (options?.limit) query = query.limit(options.limit);

      if (options?.offset)
        query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);

      const { data, error } = await query;

      if (error) throw error;

      return data as T[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'select',
      });
      throw error;
    }
  }

  public async insert<T = any>(table: Table, data: Partial<T> | Array<Partial<T>>): Promise<T[]> {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data as any)
        .select();

      if (error) throw error;

      return result as T[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'insert',
      });
      throw error;
    }
  }

  public async update<T = any>(
    table: Table,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).update(data as any);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) throw error;

      return result as T[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'update',
      });
      throw error;
    }
  }

  public async delete<T = any>(table: string, where: Record<string, any>): Promise<T[]> {
    try {
      let query = this.supabase.from(table).delete();

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) throw error;

      return result as T[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'delete',
      });
      throw error;
    }
  }

  public async exists(
    table: Table,
    options?: Omit<SelectOptions, 'select' | 'orderBy' | 'limit' | 'offset'>
  ): Promise<boolean> {
    try {
      let query = this.supabase.from(table).select('*').limit(1);

      if (options?.where)
        Object.entries(options.where).forEach(([key, value]) => {
          if (value !== undefined) {
            const useIlike = options.caseSensitive === false && this.shouldUseIlike(value);
            if (useIlike) query = query.ilike(key, `${value}`);
            else query = query.eq(key, value);
          }
        });

      if (options?.whereIn)
        Object.entries(options.whereIn).forEach(([key, values]) => {
          if (values.length > 0) {
            query = query.in(key, values);
          }
        });

      if (options?.whereNotIn)
        Object.entries(options.whereNotIn).forEach(([key, values]) => {
          if (values.length > 0) {
            query = query.not(key, 'in', `(${values.join(',')})`);
          }
        });

      if (options?.whereGte)
        Object.entries(options.whereGte).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.gte(key, value);
          }
        });

      if (options?.whereLte)
        Object.entries(options.whereLte).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.lte(key, value);
          }
        });

      if (options?.whereNull)
        options.whereNull.forEach((column) => {
          query = query.is(column, null);
        });

      if (options?.whereNotNull)
        options.whereNotNull.forEach((column) => {
          query = query.not(column, 'is', null);
        });

      const { data, error } = await query;

      if (error) throw error;

      return data.length > 0;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'exists',
      });
      throw error;
    }
  }

  async upsert<T = any>(
    table: string,
    data: Partial<T> | Array<Partial<T>>,
    options?: {
      onConflict?: string;
      ignoreDuplicates?: boolean;
    }
  ): Promise<T[]> {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .upsert(data as any, {
          onConflict: options?.onConflict,
          ignoreDuplicates: options?.ignoreDuplicates,
        })
        .select();

      if (error) throw error;

      return result as T[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'Supabase',
        location: 'upsert',
      });
      throw error;
    }
  }

  subscribeToTable(
    table: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, any> | null;
      old: Record<string, any> | null;
    }) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
    }
  ) {
    const channel = this.supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as any,
        {
          event: options?.event ?? '*',
          schema: 'public',
          table,
          filter: options?.filter,
        },
        callback as any
      )
      .subscribe();

    return channel;
  }

  async unsubscribe(channel: any) {
    await this.supabase.removeChannel(channel);
  }
}
