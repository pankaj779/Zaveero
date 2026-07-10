import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hash } from 'argon2';
import type { EmailService } from '../../email/interfaces/email-service.interface';
import {
  TokenExpiredException,
  TokenInvalidException,
} from '../exceptions';
import type {
  AuthRepository,
  AuthUserRecord,
  RefreshTokenRecord,
  RotateRefreshTokenInput,
  RotateRefreshTokenResult,
} from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import { AuthService } from '../services/auth.service';
import type { TokenService } from '../services/token.service';

function createService(deps: {
  authRepository: AuthRepository;
  userRepository: UserRepository;
  tokenService: TokenService;
  emailService: EmailService;
}): AuthService {
  const configService = {
    get: (key: string) => {
      if (key === 'FRONTEND_URL') {
        return 'http://localhost:3000';
      }
      if (key === 'APP_NAME') {
        return 'Graphology Platform';
      }
      return undefined;
    },
  };

  return new AuthService(
    deps.authRepository,
    deps.userRepository,
    deps.tokenService,
    deps.emailService,
    configService as never,
  );
}

describe('AuthService.refresh and logout', () => {
  const createRefreshToken = vi.fn();
  const findRefreshTokenByHash = vi.fn<(hash: string) => Promise<RefreshTokenRecord | null>>();
  const rotateRefreshToken =
    vi.fn<(input: RotateRefreshTokenInput) => Promise<RotateRefreshTokenResult>>();
  const revokeRefreshToken = vi.fn();
  const revokeAllRefreshTokensForUser = vi.fn();
  const findById = vi.fn<(id: string) => Promise<AuthUserRecord | null>>();
  const createTokenPair = vi.fn();
  const hashIncomingRefreshToken = vi.fn();

  const authRepository = {
    marker: 'auth-repository' as const,
    registerUser: vi.fn(),
    createEmailVerificationToken: vi.fn(),
    findEmailVerificationTokenByHash: vi.fn(),
    deleteEmailVerificationTokensForUser: vi.fn(),
    deleteEmailVerificationToken: vi.fn(),
    createRefreshToken,
    findRefreshTokenByHash,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokensForUser,
    createPasswordResetToken: vi.fn(),
    findPasswordResetTokenByHash: vi.fn(),
    deletePasswordResetTokensForUser: vi.fn(),
    completePasswordReset: vi.fn(),
  };

  const userRepository = {
    marker: 'user-repository' as const,
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    findById,
    markEmailVerified: vi.fn(),
  };

  const tokenService = {
    createAccessToken: vi.fn(),
    createRefreshToken: vi.fn(),
    createTokenPair,
    hashIncomingRefreshToken,
  } as unknown as TokenService;

  const emailService = { sendEmail: vi.fn() } as unknown as EmailService;
  let service: AuthService;
  let activeUser: AuthUserRecord;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = createService({
      authRepository,
      userRepository,
      tokenService,
      emailService,
    });
    activeUser = {
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: await hash('SecurePass1!'),
      emailVerified: true,
      isActive: true,
      deletedAt: null,
    };

    hashIncomingRefreshToken.mockReturnValue('hashed-refresh');
    createTokenPair.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: '15m',
      refreshTokenHash: 'new-hash',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
    });
  });

  it('rotates refresh tokens successfully', async () => {
    findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      replacedByTokenId: null,
    });
    findById.mockResolvedValue(activeUser);
    rotateRefreshToken.mockResolvedValue({
      newToken: {
        id: 'rt-2',
        userId: 'user-1',
        tokenHash: 'new-hash',
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
        createdAt: new Date(),
        replacedByTokenId: null,
      },
      revokedToken: {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        createdAt: new Date(),
        replacedByTokenId: 'rt-2',
      },
    });

    const result = await service.refresh({ refreshToken: 'raw-refresh' });

    expect(result).toEqual({
      message: 'Token refreshed successfully.',
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: '15m',
      },
    });
    expect(rotateRefreshToken).toHaveBeenCalledTimes(1);
    const rotateInput = rotateRefreshToken.mock.calls[0]?.[0];
    expect(rotateInput?.currentTokenId).toBe('rt-1');
    expect(rotateInput?.userId).toBe('user-1');
    expect(rotateInput?.newTokenHash).toBe('new-hash');
    expect(rotateInput?.newExpiresAt).toBeInstanceOf(Date);
  });

  it('rejects expired refresh tokens', async () => {
    findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      createdAt: new Date(),
      replacedByTokenId: null,
    });

    await expect(service.refresh({ refreshToken: 'raw-refresh' })).rejects.toBeInstanceOf(
      TokenExpiredException,
    );
    expect(revokeRefreshToken).toHaveBeenCalledWith('rt-1');
  });

  it('rejects revoked refresh tokens and revokes the token family', async () => {
    findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      replacedByTokenId: 'rt-2',
    });

    await expect(service.refresh({ refreshToken: 'raw-refresh' })).rejects.toBeInstanceOf(
      TokenInvalidException,
    );
    expect(revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
  });

  it('rejects replay of a rotated refresh token', async () => {
    findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-old',
      userId: 'user-1',
      tokenHash: 'hashed-refresh',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      replacedByTokenId: 'rt-new',
    });

    await expect(service.refresh({ refreshToken: 'old-raw' })).rejects.toBeInstanceOf(
      TokenInvalidException,
    );
    expect(revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    expect(rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('logs out by revoking a valid refresh token', async () => {
    findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      replacedByTokenId: null,
    });

    const result = await service.logout({ refreshToken: 'raw-refresh' });

    expect(result.message).toBe('Logged out successfully.');
    expect(revokeRefreshToken).toHaveBeenCalledWith('rt-1');
  });

  it('returns logout success even for unknown tokens', async () => {
    findRefreshTokenByHash.mockResolvedValue(null);

    const result = await service.logout({ refreshToken: 'unknown' });

    expect(result.message).toBe('Logged out successfully.');
    expect(revokeRefreshToken).not.toHaveBeenCalled();
  });
});
