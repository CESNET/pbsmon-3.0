import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  UserContext,
  UserRole,
  parseUserRole,
} from '@/common/types/user-context.types';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { OidcConfig } from '@/config/oidc.config';
import { resolveImpersonatedUserRole } from '@/modules/auth/user-role';

/**
 * Metadata key to skip authentication check
 */
export const SKIP_AUTH_KEY = 'skipAuth';

/**
 * Decorator to skip authentication check for an endpoint
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);

@Injectable()
export class UserContextGuard implements CanActivate {
  private readonly isDevelopment: boolean;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private dataCollectionService: DataCollectionService,
  ) {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const skipAuth = this.reflector.get<boolean>(
      SKIP_AUTH_KEY,
      context.getHandler(),
    );
    if (skipAuth) {
      const userContext = this.extractUserContext(request);
      if (userContext) {
        request.userContext = userContext;
      }
      return true;
    }

    const userContext = this.extractUserContext(request);

    if (!userContext) {
      throw new UnauthorizedException('Authentication required');
    }

    const impersonateHeader =
      request.headers['x-impersonate-user'] ||
      request.headers['X-Impersonate-User'];
    if (impersonateHeader) {
      // Only allow admins to impersonate
      if (userContext.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Only administrators can impersonate users',
        );
      }

      const impersonatedUsername = Array.isArray(impersonateHeader)
        ? impersonateHeader[0]
        : impersonateHeader;

      // Validate that username is a non-empty string
      if (
        !impersonatedUsername ||
        typeof impersonatedUsername !== 'string' ||
        impersonatedUsername.trim() === ''
      ) {
        throw new ForbiddenException('Invalid impersonation username');
      }

      // Look up user's id from pbsmon_users.json
      const userId = await this.getUserSubIdFromUsername(
        impersonatedUsername.trim(),
      );

      // Create impersonated user context with a role that never exceeds
      // the admin's own (see resolveImpersonatedUserRole)
      request.userContext = {
        id: userId || '',
        username: impersonatedUsername.trim(),
        role: resolveImpersonatedUserRole(
          this.dataCollectionService.getPerunData(),
          impersonatedUsername.trim(),
        ),
      };
      return true;
    }

    request.userContext = userContext;

    return true;
  }

  private extractUserContext(request: any): UserContext | null {
    const oidcConfig = this.configService.get<OidcConfig>('oidc');

    if (oidcConfig?.mockAdmin) {
      if (!this.isDevelopment) {
        throw new Error('Cannot use MOCK_ADMIN .env and be in production mode');
      }

      return {
        id: 'a026f632ac52748f0e007190fc59241d83783226@einfra.cesnet.cz',
        username: 'admin',
        role: UserRole.ADMIN,
      };
    }

    if (request.session?.user) {
      const sessionUser = request.session.user;
      return {
        id: sessionUser.id,
        username: sessionUser.username,
        role: parseUserRole(sessionUser.role),
      };
    }

    return null;
  }

  private async getUserSubIdFromUsername(
    username: string,
  ): Promise<string | null> {
    try {
      const perunData = this.dataCollectionService.getPerunData();
      if (!perunData?.users?.users) {
        return null;
      }

      const usernameBase = username.split('@')[0];
      for (const user of perunData.users.users) {
        if (
          user.logname === username ||
          user.logname === usernameBase ||
          user.logname.split('@')[0] === usernameBase
        ) {
          return user.id || null;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
