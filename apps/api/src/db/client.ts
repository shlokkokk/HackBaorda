// ═══════════════════════════════════════════════════════════
// Supabase Client — Singleton for backend
// Uses service_role key (bypasses RLS)
// ═══════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );
    logger.info('Supabase client initialized');
  }
  return supabaseInstance;
}
