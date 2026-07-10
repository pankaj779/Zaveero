import { describe, expect, it } from 'vitest';
import {
  expiresAtFromDuration,
  generateRefreshToken,
  hashRefreshToken,
  parseDurationToMs,
} from '../utils/refresh-token.util';

describe('refresh token util', () => {
  it('hashes tokens with a secret pepper', () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token, 'secret');

    expect(hash).not.toBe(token);
    expect(hash).toBe(hashRefreshToken(token, 'secret'));
    expect(hash).not.toBe(hashRefreshToken(token, 'other-secret'));
  });

  it('parses duration strings', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60_000);
    expect(parseDurationToMs('7d')).toBe(7 * 86_400_000);
    expect(expiresAtFromDuration('1h').getTime()).toBeGreaterThan(Date.now());
  });
});
