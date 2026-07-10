import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { EnvConfig } from '../../../config/env.schema';
import { AUTH_TOKEN_TYPES } from '../constants/auth.constants';
import {
  expiresAtFromDuration,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/refresh-token.util';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  type: typeof AUTH_TOKEN_TYPES.access;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: string;
}

export interface IssuedRefreshToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async createAccessToken(user: { id: string; email: string }): Promise<AccessTokenResult> {
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', { infer: true });
    const payload: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      type: AUTH_TOKEN_TYPES.access,
    };

    const signOptions: JwtSignOptions = {
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    };

    const accessToken = await this.jwtService.signAsync(payload, signOptions);

    return {
      accessToken,
      expiresIn,
    };
  }

  createRefreshToken(): IssuedRefreshToken {
    const rawToken = generateRefreshToken();
    const secret = this.configService.get('REFRESH_TOKEN_SECRET', { infer: true });
    const expiresIn = this.configService.get('REFRESH_TOKEN_EXPIRES_IN', { infer: true });

    return {
      rawToken,
      tokenHash: hashRefreshToken(rawToken, secret),
      expiresAt: expiresAtFromDuration(expiresIn),
    };
  }

  hashIncomingRefreshToken(rawToken: string): string {
    const secret = this.configService.get('REFRESH_TOKEN_SECRET', { infer: true });
    return hashRefreshToken(rawToken, secret);
  }

  async createTokenPair(user: { id: string; email: string }): Promise<AuthTokenPair> {
    const access = await this.createAccessToken(user);
    const refresh = this.createRefreshToken();

    return {
      accessToken: access.accessToken,
      refreshToken: refresh.rawToken,
      expiresIn: access.expiresIn,
      refreshTokenHash: refresh.tokenHash,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}
