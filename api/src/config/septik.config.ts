import { IsString, IsOptional } from 'class-validator';

export class SeptikConfig {
  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsString()
  region: string;

  @IsString()
  bucket: string;

  @IsOptional()
  @IsString()
  accessKey?: string;

  @IsOptional()
  @IsString()
  secretKey?: string;
}

export const getSeptikConfig = (): SeptikConfig => ({
  endpoint: process.env.SEPTIK_S3_ENDPOINT,
  region: process.env.SEPTIK_S3_REGION || 'us-east-1',
  bucket: process.env.SEPTIK_S3_BUCKET || 'meta-septik',
  accessKey: process.env.SEPTIK_S3_ACCESS_KEY,
  secretKey: process.env.SEPTIK_S3_SECRET_KEY,
});
