import { Inject, Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
} from '../constants/auth.constants';
import { AUTH_REPOSITORY, USER_REPOSITORY } from '../constants/injection-tokens';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  PhoneAlreadyExistsException,
} from '../exceptions';
import type { AuthRepository } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import type { LoginResponseData } from '../types/login-response.type';
import type { RegisterResponseData } from '../types/register-response.type';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private dummyPasswordHashPromise?: Promise<string>;

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
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

  async login(dto: LoginDto): Promise<ControllerSuccessPayload<LoginResponseData>> {
    const user = await this.userRepository.findByEmail(dto.email);
    const passwordValid = await this.verifyPassword(user?.passwordHash ?? null, dto.password);

    if (!user || !passwordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive || user.deletedAt !== null) {
      throw new AccountDisabledException();
    }

    const token = await this.tokenService.createAccessToken({
      id: user.id,
      email: user.email,
    });

    return {
      message: 'Login successful.',
      data: {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      },
    };
  }

  private async verifyPassword(
    passwordHash: string | null,
    password: string,
  ): Promise<boolean> {
    const hashToVerify = passwordHash ?? (await this.getDummyPasswordHash());

    try {
      return await verify(hashToVerify, password);
    } catch {
      return false;
    }
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHashPromise ??= hash('graphology-timing-safe-dummy-password');
    return this.dummyPasswordHashPromise;
  }
}
