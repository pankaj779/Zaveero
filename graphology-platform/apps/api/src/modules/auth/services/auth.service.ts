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
  buildPasswordResetHtml,
  buildPasswordResetText,
} from '../../email/templates/password-reset.template';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
  EMAIL_VERIFICATION_EXPIRY_HOURS,
  PASSWORD_RESET_EXPIRY_MINUTES,
} from '../constants/auth.constants';
import { AUTH_REPOSITORY, USER_REPOSITORY } from '../constants/injection-tokens';
import type { ForgotPasswordDto } from '../dto/forgot-password.dto';
import type { LoginDto } from '../dto/login.dto';
import type { LogoutDto } from '../dto/logout.dto';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { RegisterDto } from '../dto/register.dto';
import type { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';
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
import type {
  LoginResponseData,
  RefreshResponseData,
} from '../types/login-response.type';
import type { RegisterResponseData } from '../types/register-response.type';
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from '../utils/email-verification-token.util';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from '../utils/password-reset-token.util';
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

    const tokens = await this.tokenService.createTokenPair({
      id: user.id,
      email: user.email,
    });

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: tokens.refreshTokenHash,
      expiresAt: tokens.refreshTokenExpiresAt,
    });

    return {
      message: 'Login successful.',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
  ): Promise<ControllerSuccessPayload<RefreshResponseData>> {
    const tokenHash = this.tokenService.hashIncomingRefreshToken(dto.refreshToken);
    const existing = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!existing) {
      throw new TokenInvalidException('Refresh token is invalid.');
    }

    if (existing.revokedAt !== null) {
      await this.authRepository.revokeAllRefreshTokensForUser(existing.userId);
      throw new TokenInvalidException('Refresh token is invalid.');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.authRepository.revokeRefreshToken(existing.id);
      throw new TokenExpiredException('Refresh token has expired.');
    }

    const user = await this.userRepository.findById(existing.userId);
    if (!user || !user.isActive || user.deletedAt !== null) {
      await this.authRepository.revokeAllRefreshTokensForUser(existing.userId);
      throw new TokenInvalidException('Refresh token is invalid.');
    }

    const tokens = await this.tokenService.createTokenPair({
      id: user.id,
      email: user.email,
    });

    await this.authRepository.rotateRefreshToken({
      currentTokenId: existing.id,
      userId: user.id,
      newTokenHash: tokens.refreshTokenHash,
      newExpiresAt: tokens.refreshTokenExpiresAt,
    });

    return {
      message: 'Token refreshed successfully.',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  async logout(dto: LogoutDto): Promise<ControllerSuccessPayload<null>> {
    const tokenHash = this.tokenService.hashIncomingRefreshToken(dto.refreshToken);
    const existing = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (existing?.revokedAt === null) {
      await this.authRepository.revokeRefreshToken(existing.id);
    }

    return {
      message: 'Logged out successfully.',
      data: null,
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

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ControllerSuccessPayload<null>> {
    const message =
      'If an account exists, password reset instructions have been sent.';

    const user = await this.userRepository.findByEmail(dto.email);

    if (user && user.isActive && user.deletedAt === null) {
      await this.issueAndSendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
      });
    }

    return {
      message,
      data: null,
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<ControllerSuccessPayload<null>> {
    const tokenHash = hashPasswordResetToken(dto.token);
    const record = await this.authRepository.findPasswordResetTokenByHash(tokenHash);

    if (record?.usedAt !== null) {
      throw new TokenInvalidException('Password reset token is invalid.');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException('Password reset token has expired.');
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new TokenInvalidException('Password reset token is invalid.');
    }

    const passwordHash = await hash(dto.password);

    await this.authRepository.completePasswordReset({
      userId: user.id,
      passwordHash,
      resetTokenId: record.id,
    });

    return {
      message: 'Password has been reset successfully.',
      data: null,
    };
  }

  private async issueAndSendPasswordResetEmail(input: {
    userId: string;
    email: string;
    firstName: string;
  }): Promise<void> {
    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.authRepository.deletePasswordResetTokensForUser(input.userId);
    await this.authRepository.createPasswordResetToken({
      userId: input.userId,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    const appName = this.configService.get('APP_NAME', { infer: true });
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', rawToken);

    const templateInput = {
      appName,
      recipientName: input.firstName,
      resetUrl: resetUrl.toString(),
      expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
    };

    try {
      await this.emailService.sendEmail({
        to: input.email,
        subject: `Reset your password for ${appName}`,
        html: buildPasswordResetHtml(templateInput),
        text: buildPasswordResetText(templateInput),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(
        `Failed to send password reset email for userId=${input.userId}: ${message}`,
      );
    }
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
