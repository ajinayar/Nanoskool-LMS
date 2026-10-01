import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/nanoskool'),

  // Secrets: must be long random strings in production (openssl rand -hex 64)
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-only-access-secret-change-me-please-0123456789'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),

  // Comma-separated list of allowed browser origins
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  APP_URL: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: bool,

  // Email (leave SMTP_HOST empty to log emails to the console)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Nanoskool <no-reply@nanoskool.local>'),

  // File storage: "local" (./uploads) or "s3" (any S3-compatible bucket, e.g. Vultr)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  // Leave empty to serve uploads as relative /files/... links (works behind the Vite proxy and nginx)
  PUBLIC_API_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().default(60), // project videos can be large

  // AI tutor. "mock" works offline; "nanobot" proxies the existing chatbot service;
  // "anthropic" calls the Claude API directly.
  AI_PROVIDER: z.enum(['mock', 'nanobot', 'anthropic', 'openai']).default('mock'),
  NANOBOT_URL: z.string().default('https://chatbot.nanoskool.in'),
  NANOBOT_SERVICE_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1'),
  SETTINGS_SECRET: z.string().min(16).optional(), // encrypts API keys saved in AI settings (defaults to JWT_ACCESS_SECRET)
  AI_DEFAULT_MONTHLY_TOKENS: z.coerce.number().default(200000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.startsWith('dev-only')) {
  console.error('JWT_ACCESS_SECRET must be set in production');
  process.exit(1);
}

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
