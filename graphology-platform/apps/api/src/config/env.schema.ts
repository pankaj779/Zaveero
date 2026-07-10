import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  APP_NAME: z.string().default('Graphology Platform'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: nonEmptyString,
  DIRECT_URL: nonEmptyString,
  JWT_SECRET: nonEmptyString,
  JWT_REFRESH_SECRET: nonEmptyString.optional(),
  REFRESH_TOKEN_SECRET: nonEmptyString,
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ACCESS_EXPIRATION: z.string().optional(),
  JWT_REFRESH_EXPIRATION: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY: nonEmptyString,
  EMAIL_FROM: z.string().email(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RAZORPAY_KEY_ID: nonEmptyString,
  RAZORPAY_SECRET: nonEmptyString,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const normalized: Record<string, unknown> = {
    ...config,
    RAZORPAY_SECRET: config.RAZORPAY_SECRET ?? config.RAZORPAY_KEY_SECRET,
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN ?? config.JWT_ACCESS_EXPIRATION,
    FRONTEND_URL: config.FRONTEND_URL ?? config.APP_URL ?? 'http://localhost:3000',
    EMAIL_FROM: config.EMAIL_FROM ?? config.RESEND_FROM_EMAIL,
    REFRESH_TOKEN_SECRET: config.REFRESH_TOKEN_SECRET ?? config.JWT_REFRESH_SECRET,
    REFRESH_TOKEN_EXPIRES_IN:
      config.REFRESH_TOKEN_EXPIRES_IN ?? config.JWT_REFRESH_EXPIRATION ?? '7d',
  };

  const parsed = envSchema.safeParse(normalized);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}
