import { IsBoolean, IsOptional, IsString, IsArray } from 'class-validator';

export class OidcConfig {
  @IsOptional()
  @IsBoolean()
  mockAdmin?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redirectUri?: string[];
}

export const getOidcConfig = (): OidcConfig => ({
  mockAdmin: process.env.MOCK_ADMIN === 'true',
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  issuer: process.env.OIDC_ISSUER,
  redirectUri: process.env.OIDC_REDIRECT_URI
    ? process.env.OIDC_REDIRECT_URI.split(',').map(uri => uri.trim()).filter(Boolean)
    : [],
});
