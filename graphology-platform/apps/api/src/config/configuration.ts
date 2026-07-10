import type { EnvConfig } from './env.schema';

export default (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV;
  const resolvedNodeEnv: EnvConfig['NODE_ENV'] =
    nodeEnv === 'production' || nodeEnv === 'test' || nodeEnv === 'development'
      ? nodeEnv
      : 'development';

  return {
    NODE_ENV: resolvedNodeEnv,
    PORT: Number(process.env.PORT ?? 3001),
    HOST: process.env.HOST ?? '0.0.0.0',
    APP_NAME: process.env.APP_NAME ?? 'Graphology Platform',
    APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
    API_URL: process.env.API_URL ?? 'http://localhost:3001',
    FRONTEND_URL:
      process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    DIRECT_URL: process.env.DIRECT_URL ?? '',
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    REFRESH_TOKEN_SECRET:
      process.env.REFRESH_TOKEN_SECRET ?? process.env.JWT_REFRESH_SECRET ?? '',
    JWT_EXPIRES_IN:
      process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
    REFRESH_TOKEN_EXPIRES_IN:
      process.env.REFRESH_TOKEN_EXPIRES_IN ?? process.env.JWT_REFRESH_EXPIRATION ?? '7d',
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
    EMAIL_FROM:
      process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? '',
    RAZORPAY_SECRET: process.env.RAZORPAY_SECRET ?? process.env.RAZORPAY_KEY_SECRET ?? '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
};
