import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserStorageQuotaDTO {
  @Expose()
  @ApiProperty({ description: 'Storage directory path' })
  directory: string;

  @Expose()
  @ApiProperty({ description: 'Used space (e.g., "59.16 MB")' })
  used: string;

  @Expose()
  @ApiProperty({ description: 'Soft quota (e.g., "4294.967296 GB"), null if no quota', nullable: true })
  softQuota: string | null;

  @Expose()
  @ApiProperty({ description: 'Hard quota (e.g., "4294.967296 GB"), null if no quota', nullable: true })
  hardQuota: string | null;

  @Expose()
  @ApiProperty({ description: 'Grace period (e.g., "none"), null if not applicable', nullable: true })
  grace: string | null;

  @Expose()
  @ApiProperty({ description: 'Number of files used, null if no limit', nullable: true })
  filesUsed: number | null;

  @Expose()
  @ApiProperty({ description: 'Soft limit on number of files, null if no limit', nullable: true })
  filesSoftLimit: number | null;

  @Expose()
  @ApiProperty({ description: 'Hard limit on number of files, null if no limit', nullable: true })
  filesHardLimit: number | null;

  @Expose()
  @ApiProperty({ description: 'Grace period for file count, null if not applicable', nullable: true })
  filesGrace: string | null;
}

export class UserStorageQuotasDTO {
  @Expose()
  @ApiProperty({ description: 'Username' })
  username: string;

  @Expose()
  @ApiProperty({ type: [UserStorageQuotaDTO], description: 'List of storage quotas per directory' })
  quotas: UserStorageQuotaDTO[];

  @Expose()
  @ApiProperty({ description: 'Whether the current user can see this data' })
  canSeeOwner: boolean;
}
