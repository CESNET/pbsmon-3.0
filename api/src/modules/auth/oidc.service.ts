import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OidcConfig } from '@/config/oidc.config';
import * as client from 'openid-client';

@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);
  private config: client.Configuration | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const oidcConfig = this.configService.get<OidcConfig>('oidc')!;

    if (
      !oidcConfig.issuer ||
      !oidcConfig.clientId ||
      !oidcConfig.clientSecret
    ) {
      this.logger.warn('OIDC not configured, authentication will not work');
      return;
    }

    try {
      const redirectUris = Array.isArray(oidcConfig.redirectUri)
        ? oidcConfig.redirectUri
        : (oidcConfig.redirectUri ? [oidcConfig.redirectUri] : []);

      this.config = await client.discovery(
        new URL(oidcConfig.issuer),
        oidcConfig.clientId,
        {
          redirect_uris: redirectUris.length > 0 ? redirectUris : [''],
          response_types: ['code'],
        },
        client.ClientSecretPost(oidcConfig.clientSecret),
      );

      this.logger.log(`Discovered OIDC issuer: ${oidcConfig.issuer}`);
      this.logger.log('OIDC client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OIDC client', error);
      this.config = null;
    }
  }

  /**
   * Get the authorization URL for OIDC login with PKCE
   * @param state Optional state parameter
   * @param redirectUri Optional specific redirect URI to use. If not provided, uses the first configured URI
   */
  async getAuthorizationUrl(
    state?: string,
    redirectUri?: string,
  ): Promise<{ url: string; state: string; codeVerifier: string } | null> {
    if (!this.config) {
      return null;
    }

    const authState = state || client.randomPKCECodeVerifier();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

    // Use provided redirectUri, or get the first one from config
    const configuredUris = this.configService.get<OidcConfig>('oidc')!.redirectUri || [];
    const selectedRedirectUri = redirectUri || (Array.isArray(configuredUris) && configuredUris.length > 0 ? configuredUris[0] : '');

    const url = client.buildAuthorizationUrl(this.config, {
      redirect_uri: selectedRedirectUri,
      scope: 'openid profile eduperson_entitlement',
      state: authState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: url.toString(),
      state: authState,
      codeVerifier,
    };
  }

  /**
   * Handle the OIDC callback and exchange code for tokens
   */
  async handleCallback(
    request: Request | URL,
    storedState: string,
    storedCodeVerifier: string,
  ) {
    if (!this.config) {
      throw new Error('OIDC client not initialized');
    }

    try {
      const tokenSet = await client.authorizationCodeGrant(
        this.config,
        request,
        {
          expectedState: storedState,
          pkceCodeVerifier: storedCodeVerifier,
        },
      );

      const userInfo = await client.fetchUserInfo(
        this.config,
        tokenSet.access_token!,
        client.skipSubjectCheck,
      );

      return {
        id: userInfo.sub,
        username: (userInfo as any).preferred_username || userInfo.sub,
        name: (userInfo as any).name,
        locale: (userInfo as any).locale || null,
        eduperson_entitlement: (userInfo as any).eduperson_entitlement || [],
        tokens: tokenSet,
      };
    } catch (error) {
      this.logger.error('OIDC callback error', error);
      throw error;
    }
  }

  /**
   * Find a matching redirect URI from configured URIs based on hostname
   * @param hostname The hostname to match (e.g., "pbsmon.metacentrum.cz")
   * @returns The matching redirect URI if found, otherwise returns the first configured URI
   */
  getRedirectUriForHost(hostname: string): string {
    const configuredUris = this.configService.get<OidcConfig>('oidc')!.redirectUri || [];

    if (!Array.isArray(configuredUris) || configuredUris.length === 0) {
      return '';
    }

    // Try to find a URI that matches the given hostname
    for (const uri of configuredUris) {
      try {
        const url = new URL(uri);
        if (url.hostname === hostname) {
          return uri;
        }
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }

    // If no match found, return the first URI
    return configuredUris[0];
  }

  /**
   * Check if OIDC is configured and ready
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
}
