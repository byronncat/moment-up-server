import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('db.supabaseUrl');
    const supabaseKey = this.configService.get<string>('db.supabaseKey');

    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration is missing!');
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient() {
    return this.client;
  }
}
