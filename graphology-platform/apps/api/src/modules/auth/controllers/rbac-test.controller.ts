import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ControllerSuccessPayload } from '../../../common/interfaces/api-response.interface';
import { AUTH_PERMISSIONS, AUTH_ROLES } from '../constants/auth.constants';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

/**
 * Temporary protected endpoints for RBAC verification.
 * Safe to remove once real business modules adopt the same guards.
 */
@ApiTags('RBAC Test')
@ApiBearerAuth('access-token')
@Controller('test')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RbacTestController {
  @Get('admin')
  @Roles(AUTH_ROLES.admin)
  @ApiOperation({ summary: 'Admin-only test endpoint' })
  admin(
    @CurrentUser() user: AuthenticatedUser,
  ): ControllerSuccessPayload<{ route: string; userId: string }> {
    return {
      message: 'Admin access granted.',
      data: { route: 'admin', userId: user.id },
    };
  }

  @Get('teacher')
  @Roles(AUTH_ROLES.teacher, AUTH_ROLES.admin)
  @ApiOperation({ summary: 'Teacher or Admin test endpoint' })
  teacher(
    @CurrentUser('id') userId: string,
  ): ControllerSuccessPayload<{ route: string; userId: string }> {
    return {
      message: 'Teacher access granted.',
      data: { route: 'teacher', userId },
    };
  }

  @Get('student')
  @Roles(AUTH_ROLES.student)
  @ApiOperation({ summary: 'Student-only test endpoint' })
  student(
    @CurrentUser('email') email: string,
  ): ControllerSuccessPayload<{ route: string; email: string }> {
    return {
      message: 'Student access granted.',
      data: { route: 'student', email },
    };
  }

  @Get('permissions')
  @Permissions(AUTH_PERMISSIONS.studentView)
  @ApiOperation({ summary: 'Permission-protected test endpoint' })
  permissions(
    @CurrentUser() user: AuthenticatedUser,
  ): ControllerSuccessPayload<{ route: string; permissions: string[] }> {
    return {
      message: 'Permission access granted.',
      data: { route: 'permissions', permissions: user.permissions },
    };
  }
}
