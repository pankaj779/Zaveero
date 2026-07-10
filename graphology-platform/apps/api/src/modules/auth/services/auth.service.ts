import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
} from '../constants/auth.constants';
import { AUTH_REPOSITORY, USER_REPOSITORY } from '../constants/injection-tokens';
import type { RegisterDto } from '../dto/register.dto';
import {
  EmailAlreadyExistsException,
  PhoneAlreadyExistsException,
} from '../exceptions';
import type { AuthRepository } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import type { RegisterResponseData } from '../types/register-response.type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  getRepositoryMarkers(): { auth: AuthRepository['marker']; user: UserRepository['marker'] } {
    return {
      auth: this.authRepository.marker,
      user: this.userRepository.marker,
    };
  }

  async register(
    dto: RegisterDto,
  ): Promise<ControllerSuccessPayload<RegisterResponseData>> {
    const existingByEmail = await this.userRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new EmailAlreadyExistsException();
    }

    if (dto.phone) {
      const existingByPhone = await this.userRepository.findByPhone(dto.phone);
      if (existingByPhone) {
        throw new PhoneAlreadyExistsException();
      }
    }

    const passwordHash = await hash(dto.password);

    const registered = await this.authRepository.registerUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      organizationSlug: DEFAULT_ORGANIZATION.slug,
      roleName: DEFAULT_REGISTRATION_ROLE,
    });

    return {
      message: 'Registration successful. Please verify your email.',
      data: {
        userId: registered.userId,
        email: registered.email,
        organization: registered.organizationName,
      },
    };
  }
}
