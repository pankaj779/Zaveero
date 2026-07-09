import { describe, expect, it } from 'vitest';
import { AUTH_COOKIE_NAMES, AUTH_HEADER, AUTH_SCHEME } from './index.js';

describe('@graphology/auth', () => {
  it('defines auth constants', () => {
    expect(AUTH_COOKIE_NAMES.accessToken).toBe('graphology_access_token');
    expect(AUTH_HEADER).toBe('authorization');
    expect(AUTH_SCHEME).toBe('Bearer');
  });
});
