import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { AuthService } from '../services/auth.service';
import type {
  LoginResponseData,
  RefreshResponseData,
} from '../types/login-response.type';
import type { RegisterResponseData } from '../types/register-response.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  register(
    @Body() dto: RegisterDto,
  ): Promise<ControllerSuccessPayload<RegisterResponseData>> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  login(@Body() dto: LoginDto): Promise<ControllerSuccessPayload<LoginResponseData>> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<ControllerSuccessPayload<RefreshResponseData>> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: LogoutDto): Promise<ControllerSuccessPayload<null>> {
    return this.authService.logout(dto);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using a verification token' })
  verifyEmail(
    @Query() dto: VerifyEmailDto,
  ): Promise<ControllerSuccessPayload<{ email: string }>> {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<ControllerSuccessPayload<null>> {
    return this.authService.resendVerification(dto);
  }
}
