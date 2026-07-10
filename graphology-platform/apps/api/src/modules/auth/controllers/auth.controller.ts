import { Controller } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

/**
 * Authentication HTTP controller placeholder.
 * REST endpoints will be added in later authentication tasks.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
