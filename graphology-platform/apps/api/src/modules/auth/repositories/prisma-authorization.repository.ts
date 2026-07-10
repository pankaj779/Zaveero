import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import type { AuthPermissionName, AuthRoleName } from '../constants/auth.constants';
import type {
  AuthorizationRepository,
  UserAuthorizationContext,
} from '../interfaces/authorization-repository.interface';

@Injectable()
export class PrismaAuthorizationRepository implements AuthorizationRepository {
  public readonly marker = 'authorization-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findAuthorizationContext(userId: string): Promise<UserAuthorizationContext | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        organizationMembers: {
          where: {
            status: 'ACTIVE',
            organization: { isActive: true },
          },
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const roles = [
      ...new Set(user.userRoles.map((entry) => entry.role.name as AuthRoleName)),
    ];
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((entry) =>
          entry.role.rolePermissions.map(
            (rp) => rp.permission.name as AuthPermissionName,
          ),
        ),
      ),
    ];

    return {
      userId: user.id,
      email: user.email,
      isActive: user.isActive,
      deletedAt: user.deletedAt,
      roles,
      permissions,
      activeOrganizationIds: user.organizationMembers.map((m) => m.organizationId),
    };
  }

  async findPermissionsForUser(userId: string): Promise<AuthPermissionName[]> {
    const context = await this.findAuthorizationContext(userId);
    return context?.permissions ?? [];
  }

  async findRolesForUser(userId: string): Promise<AuthRoleName[]> {
    const context = await this.findAuthorizationContext(userId);
    return context?.roles ?? [];
  }
}
