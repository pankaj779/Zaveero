import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/i.exec(duration.trim());
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid duration unit: ${unit}`);
  }

  return amount * multiplier;
}

export function expiresAtFromDuration(duration: string, from = new Date()): Date {
  return new Date(from.getTime() + parseDurationToMs(duration));
}
