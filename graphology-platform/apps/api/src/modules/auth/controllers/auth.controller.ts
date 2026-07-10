import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';
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
}
