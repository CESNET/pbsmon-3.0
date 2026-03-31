import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SkipAuth } from '@/common/guards/user-context.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OidcConfig } from '@/config/oidc.config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseDto } from '@/common/dto/api-response.dto';
import { ApiOkResponseModel } from '@/common/swagger/api-generic-response';
import { CurrentUserDTO } from './dto/current-user.dto';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { OidcService } from './oidc.service';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import '@/common/types/session.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private configService: ConfigService,
    private oidcService: OidcService,
    private dataCollectionService: DataCollectionService,
  ) {}

  @Get('login')
  @SkipAuth()
  async login(@Req() req: Request, @Res() res: Response) {
    if (!this.oidcService.isConfigured()) {
      this.logger.error('OIDC is not configured');
      throw new UnauthorizedException('OIDC authentication not available');
    }

    // Get the redirect URI matching the current request host
    const requestHost = req.get('host') || '';
    const redirectUri = this.oidcService.getRedirectUriForHost(requestHost);

    const authData = await this.oidcService.getAuthorizationUrl(undefined, redirectUri);
    if (!authData) {
      throw new UnauthorizedException('Failed to generate authorization URL');
    }

    if (req.session) {
      (req.session as any).oidcState = authData.state;
      (req.session as any).oidcCodeVerifier = authData.codeVerifier;
      (req.session as any).oidcRedirectUri = redirectUri;
    }

    this.logger.log('Redirecting to OIDC provider', { state: authData.state });
    res.redirect(authData.url);
  }

  @Get('login/callback')
  @SkipAuth()
  async callback(@Req() req: Request, @Res() res: Response) {
    this.logger.log('OIDC callback received', {
      path: req.path,
      query: req.query,
    });

    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      this.logger.error('OIDC callback error', {
        error,
        error_description: req.query.error_description,
      });
      throw new UnauthorizedException(`Authentication failed: ${error}`);
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Get stored state and code verifier from session
    const session = req.session as any;
    const storedState = session?.oidcState;
    const storedCodeVerifier = session?.oidcCodeVerifier;

    if (!storedState || !storedCodeVerifier) {
      this.logger.error('OIDC callback: Missing session data');
      throw new UnauthorizedException('Session expired or invalid');
    }

    try {
      const oidcConfig = this.configService.get<OidcConfig>('oidc')!;
      const configuredRedirectUri = oidcConfig.redirectUri;

      // Get stored redirect URI from session, or find matching one for current host
      let selectedRedirectUri: string;
      const session = req.session as any;
      if (session?.oidcRedirectUri) {
        selectedRedirectUri = session.oidcRedirectUri;
      } else {
        const requestHost = req.get('host') || '';
        selectedRedirectUri = this.oidcService.getRedirectUriForHost(requestHost);
      }

      if (!selectedRedirectUri) {
        throw new BadRequestException('OIDC redirect URI not configured');
      }

      const callbackUrl = new URL(selectedRedirectUri);
      const requestUrl = new URL(
        req.originalUrl || req.url,
        `${req.protocol}://${req.get('host')}`,
      );
      requestUrl.searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });

      this.logger.log('OIDC callback: Using redirect URI', {
        configured: configuredRedirectUri,
        callbackUrl: callbackUrl.toString(),
        requestUrl: requestUrl.toString(),
      });

      const user = await this.oidcService.handleCallback(
        callbackUrl,
        storedState,
        storedCodeVerifier,
      );

      const username = user.username;
      if (!username) {
        return new UnauthorizedException('Invalid username');
      }

      const unixAdminEtcGroups = ['pbs-admins', 'metasw'];

      const isAdmin = this.checkIsAdmin(username, unixAdminEtcGroups);

      if (req.session) {
        (req.session as any).user = {
          id: user.id,
          username: username,
          name: user.name,
          role: isAdmin ? 'admin' : 'user',
          eduperson_entitlement: user.eduperson_entitlement,
        };

        delete (req.session as any).oidcState;
        delete (req.session as any).oidcCodeVerifier;
        delete (req.session as any).oidcRedirectUri;
      }

      const frontendUrl =
        process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?authenticated=true`);
    } catch (error) {
      this.logger.error('OIDC callback processing error', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session?.destroy((err) => {
      if (err) {
        this.logger.error('Error destroying session:', err);
      }
    });

    const frontendUrl =
      process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    res.redirect(frontendUrl);
  }

  @Get('current-user')
  @ApiOperation({
    summary: 'Get current user information',
    description:
      'Returns the current authenticated user information including username and role.',
  })
  @ApiOkResponseModel(CurrentUserDTO, 'Current user')
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getCurrentUser(
    @UserContextDecorator() userContext: UserContext,
  ): ApiResponseDto<CurrentUserDTO> {
    const data: CurrentUserDTO = {
      username: userContext.username,
      role: userContext.role,
    };
    return new ApiResponseDto(data);
  }

  /**
   * Check if a user is an admin by verifying membership in admin groups
   * @param username - The username to check
   * @param adminGroups - Array of group names to check (e.g., ['pbs-admins', 'metasw'])
   * @returns true if the user is a member of any of the admin groups, false otherwise
   */
  private checkIsAdmin(username: string, adminGroups: string[]): boolean {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData || !perunData.etcGroups) {
      this.logger.warn('Perun data or etcGroups not available');
      return false;
    }

    // Iterate through all servers' etc groups
    for (const serverGroup of perunData.etcGroups) {
      // Check each group entry for this server
      for (const entry of serverGroup.entries) {
        // Check if this is one of the admin groups we're looking for
        if (adminGroups.includes(entry.groupname)) {
          // Check if the username is in the members array
          if (entry.members.includes(username)) {
            this.logger.debug(
              `User ${username} is admin (member of ${entry.groupname} on ${serverGroup.serverName})`,
            );
            return true;
          }
        }
      }
    }

    this.logger.debug(`User ${username} is not an admin`);
    return false;
  }
}
