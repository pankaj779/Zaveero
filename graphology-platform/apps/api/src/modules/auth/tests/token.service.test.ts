import { describe, expect, it, vi } from 'vitest';
import { TokenService } from '../services/token.service';
import { hashRefreshToken } from '../utils/refresh-token.util';

describe('TokenService', () => {
  it('creates an access token with configured expiration', async () => {
    const signAsync = vi.fn().mockResolvedValue('signed.jwt.token');
    const jwtService = { signAsync };
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') {
          return '15m';
        }
        if (key === 'REFRESH_TOKEN_SECRET') {
          return 'refresh-secret';
        }
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') {
          return '7d';
        }
        return undefined;
      }),
    };

    const tokenService = new TokenService(jwtService as never, configService as never);
    const result = await tokenService.createAccessToken({
      id: 'user-1',
      email: 'ada@example.com',
    });

    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      expiresIn: '15m',
    });
  });

  it('creates a hashed refresh token pair', async () => {
    const signAsync = vi.fn().mockResolvedValue('signed.jwt.token');
    const jwtService = { signAsync };
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') {
          return '15m';
        }
        if (key === 'REFRESH_TOKEN_SECRET') {
          return 'refresh-secret';
        }
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') {
          return '7d';
        }
        return undefined;
      }),
    };

    const tokenService = new TokenService(jwtService as never, configService as never);
    const pair = await tokenService.createTokenPair({
      id: 'user-1',
      email: 'ada@example.com',
    });

    expect(pair.accessToken).toBe('signed.jwt.token');
    expect(pair.refreshToken).toBeTruthy();
    expect(pair.refreshTokenHash).toBe(
      hashRefreshToken(pair.refreshToken, 'refresh-secret'),
    );
    expect(pair.refreshTokenHash).not.toBe(pair.refreshToken);
    expect(pair.expiresIn).toBe('15m');
    expect(pair.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
