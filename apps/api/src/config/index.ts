import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/campus'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  UPLOAD_DIR: z.string().default('./uploads'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(20),
});

const env = envSchema.parse(process.env);

/** The only place that reads process.env. Everything else imports this. */
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  mongodbUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  uploadDir: env.UPLOAD_DIR,
  auth: {
    accessTokenTtlSeconds: 15 * 60,
    refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
    bcryptRounds: env.NODE_ENV === 'test' ? 4 : 10,
    rateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    rateLimitWindow: '1 minute',
  },
  /** Budget for sending, editing, deleting and reacting, per client and route. Generous for a person, tight for a script. */
  messages: { writeRateLimit: { max: 120, timeWindow: '1 minute' } },
  typing: { ttlMs: 5000 },
} as const;
