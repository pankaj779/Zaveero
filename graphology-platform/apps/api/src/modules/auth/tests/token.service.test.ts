import { describe, expect, it, vi } from 'vitest';
import { TokenService } from '../services/token.service';

describe('TokenService', () => {
  it('creates an access token with configured expiration', async () => {
    const signAsync = vi.fn().mockResolvedValue('signed.jwt.token');
    const jwtService = { signAsync };
    const configService = {
      get: vi.fn().mockReturnValue('15m'),
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
    expect(signAsync).toHaveBeenCalledWith(
      {
        sub: 'user-1',
        email: 'ada@example.com',
        type: 'access',
      },
      { expiresIn: '15m' },
    );
  });
});
