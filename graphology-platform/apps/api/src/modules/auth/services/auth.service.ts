import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, USER_REPOSITORY } from '../constants/injection-tokens';
import type { AuthRepository } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';

/**
 * Authentication application service.
 * Business methods will be added in later authentication tasks.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Confirms repository wiring for foundation verification.
   */
  getRepositoryMarkers(): { auth: AuthRepository['marker']; user: UserRepository['marker'] } {
    return {
      auth: this.authRepository.marker,
      user: this.userRepository.marker,
    };
  }
}
