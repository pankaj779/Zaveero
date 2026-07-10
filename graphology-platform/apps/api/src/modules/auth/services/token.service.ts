import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { EnvConfig } from '../../../config/env.schema';
import { AUTH_TOKEN_TYPES } from '../constants/auth.constants';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  type: typeof AUTH_TOKEN_TYPES.access;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: string;
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
}
