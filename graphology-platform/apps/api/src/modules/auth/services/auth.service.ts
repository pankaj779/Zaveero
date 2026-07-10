import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from 'argon2';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import type { EnvConfig } from '../../../config/env.schema';
import { EMAIL_SERVICE } from '../../email/constants/injection-tokens';
import type { EmailService } from '../../email/interfaces/email-service.interface';
import {
  buildEmailVerificationHtml,
  buildEmailVerificationText,
} from '../../email/templates/email-verification.template';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
  EMAIL_VERIFICATION_EXPIRY_HOURS,
} from '../constants/auth.constants';
import { AUTH_REPOSITORY, USER_REPOSITORY } from '../constants/injection-tokens';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import type { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { VerifyEmailDto } from '../dto/verify-email.dto';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  PhoneAlreadyExistsException,
  TokenExpiredException,
  TokenInvalidException,
} from '../exceptions';
import type { AuthRepository } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import type { LoginResponseData } from '../types/login-response.type';
import type { RegisterResponseData } from '../types/register-response.type';
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from '../utils/email-verification-token.util';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyPasswordHashPromise?: Promise<string>;

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<EnvConfig, true>,
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

    await this.issueAndSendVerificationEmail({
      userId: registered.userId,
      email: registered.email,
      firstName: dto.firstName,
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

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<ControllerSuccessPayload<{ email: string }>> {
    const tokenHash = hashEmailVerificationToken(dto.token);
    const record = await this.authRepository.findEmailVerificationTokenByHash(tokenHash);

    if (!record) {
      throw new TokenInvalidException('Email verification token is invalid.');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.authRepository.deleteEmailVerificationToken(record.id);
      throw new TokenExpiredException('Email verification token has expired.');
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new TokenInvalidException('Email verification token is invalid.');
    }

    if (!user.emailVerified) {
      await this.userRepository.markEmailVerified(user.id);
    }

    await this.authRepository.deleteEmailVerificationTokensForUser(user.id);

    return {
      message: 'Email verified successfully.',
      data: {
        email: user.email,
      },
    };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<ControllerSuccessPayload<null>> {
    const genericMessage =
      'If an account exists for this email, a verification link has been sent.';

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.isActive || user.deletedAt !== null) {
      return {
        message: genericMessage,
        data: null,
      };
    }

    if (user.emailVerified) {
      return {
        message: 'Email is already verified.',
        data: null,
      };
    }

    await this.issueAndSendVerificationEmail({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });

    return {
      message: genericMessage,
      data: null,
    };
  }

  private async issueAndSendVerificationEmail(input: {
    userId: string;
    email: string;
    firstName: string;
  }): Promise<void> {
    const rawToken = generateEmailVerificationToken();
    const tokenHash = hashEmailVerificationToken(rawToken);
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.authRepository.deleteEmailVerificationTokensForUser(input.userId);
    await this.authRepository.createEmailVerificationToken({
      userId: input.userId,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    const appName = this.configService.get('APP_NAME', { infer: true });
    const verificationUrl = new URL('/verify-email', frontendUrl);
    verificationUrl.searchParams.set('token', rawToken);

    const templateInput = {
      appName,
      recipientName: input.firstName,
      verificationUrl: verificationUrl.toString(),
      expiresInHours: EMAIL_VERIFICATION_EXPIRY_HOURS,
    };

    try {
      await this.emailService.sendEmail({
        to: input.email,
        subject: `Verify your email for ${appName}`,
        html: buildEmailVerificationHtml(templateInput),
        text: buildEmailVerificationText(templateInput),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(
        `Failed to send verification email for userId=${input.userId}: ${message}`,
      );
    }
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
