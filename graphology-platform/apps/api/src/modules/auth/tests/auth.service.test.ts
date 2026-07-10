import { describe, expect, it } from 'vitest';
import { AuthService } from '../services/auth.service';
import type { AuthRepository } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';

describe('AuthService', () => {
  it('exposes repository markers from injected abstractions', () => {
    const authRepository: AuthRepository = { marker: 'auth-repository' };
    const userRepository: UserRepository = { marker: 'user-repository' };
    const service = new AuthService(authRepository, userRepository);

    expect(service.getRepositoryMarkers()).toEqual({
      auth: 'auth-repository',
      user: 'user-repository',
    });
  });
});
