import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  DATABASE_URL: 'postgresql://graphology:graphology@localhost:5432/graphology?schema=public',
  DIRECT_URL: 'postgresql://graphology:graphology@localhost:5432/graphology?schema=public',
  JWT_SECRET: 'change-me-in-production',
  RESEND_API_KEY: 're_placeholder',
  EMAIL_FROM: 'noreply@example.com',
  RAZORPAY_KEY_ID: 'rzp_placeholder',
  RAZORPAY_SECRET: 'rzp_secret_placeholder',
};

describe('validateEnv', () => {
  it('accepts a valid environment configuration', () => {
    const config = validateEnv(validEnv);
    expect(config.PORT).toBe(3001);
    expect(config.DATABASE_URL).toContain('postgresql://');
  });

  it('accepts RAZORPAY_KEY_SECRET as an alias for RAZORPAY_SECRET', () => {
    const config = validateEnv({
      ...validEnv,
      RAZORPAY_SECRET: undefined,
      RAZORPAY_KEY_SECRET: 'rzp_secret_alias',
    });

    expect(config.RAZORPAY_SECRET).toBe('rzp_secret_alias');
  });

  it('accepts JWT_ACCESS_EXPIRATION as an alias for JWT_EXPIRES_IN', () => {
    const config = validateEnv({
      ...validEnv,
      JWT_EXPIRES_IN: undefined,
      JWT_ACCESS_EXPIRATION: '30m',
    });

    expect(config.JWT_EXPIRES_IN).toBe('30m');
  });

  it('accepts RESEND_FROM_EMAIL as an alias for EMAIL_FROM', () => {
    const config = validateEnv({
      ...validEnv,
      EMAIL_FROM: undefined,
      RESEND_FROM_EMAIL: 'alias@example.com',
    });

    expect(config.EMAIL_FROM).toBe('alias@example.com');
  });

  it('defaults FRONTEND_URL from APP_URL when omitted', () => {
    const config = validateEnv({
      ...validEnv,
      APP_URL: 'http://localhost:3000',
      FRONTEND_URL: undefined,
    });

    expect(config.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('fails fast when required variables are missing', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT: '3001',
      }),
    ).toThrow(/Invalid environment configuration/);
  });
});
