// ═══════════════════════════════════════════════════════════
// Configuration — All env vars validated at startup
// Zero hardcoded values. Everything from env.
// ═══════════════════════════════════════════════════════════

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  // Server
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isProduction: process.env['NODE_ENV'] === 'production',
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  // Supabase
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  // Clerk Auth
  clerk: {
    secretKey: requireEnv('CLERK_SECRET_KEY'),
    webhookSecret: optionalEnv('CLERK_WEBHOOK_SECRET', ''),
  },

  // AI / LLM
  groq: {
    apiKey: requireEnv('GROQ_API_KEY'),
    model: optionalEnv('GROQ_MODEL', 'qwen/qwen3-32b'),
  },

  // Memory
  mem0: {
    apiKey: requireEnv('MEM0_API_KEY'),
  },

  // OpenAI (optional, for embeddings)
  openai: {
    apiKey: optionalEnv('OPENAI_API_KEY', ''),
  },

  // Slack
  slack: {
    botToken: optionalEnv('SLACK_BOT_TOKEN', ''),
    signingSecret: optionalEnv('SLACK_SIGNING_SECRET', ''),
    appToken: optionalEnv('SLACK_APP_TOKEN', ''),
  },

  // Email
  resend: {
    apiKey: optionalEnv('RESEND_API_KEY', ''),
  },

  // Redis (Upstash)
  redis: {
    url: optionalEnv('UPSTASH_REDIS_REST_URL', ''),
    token: optionalEnv('UPSTASH_REDIS_REST_TOKEN', ''),
  },

  // Webhook secrets per source
  webhooks: {
    secret: optionalEnv('WEBHOOK_SECRET', ''),
    uptimerobot: optionalEnv('UPTIMEROBOT_WEBHOOK_SECRET', ''),
    sentry: optionalEnv('SENTRY_WEBHOOK_SECRET', ''),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    maxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  },

  // CORS
  cors: {
    origins: optionalEnv('CORS_ORIGINS', 'http://localhost:3000').split(','),
  },
} as const;
