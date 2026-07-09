import type { UserRole } from '@graphology/types';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
}

export const AUTH_COOKIE_NAMES = {
  accessToken: 'graphology_access_token',
  refreshToken: 'graphology_refresh_token',
} as const;

export const AUTH_HEADER = 'authorization' as const;

export const AUTH_SCHEME = 'Bearer' as const;
