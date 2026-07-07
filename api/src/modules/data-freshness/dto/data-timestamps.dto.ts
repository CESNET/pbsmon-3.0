import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DataTimestampsDTO {
  @Expose()
  @ApiPropertyOptional({
    description:
      'jobs.json last-modified timestamp (ms since epoch) per PBS server name',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  pbs: Record<string, number>;

  @Expose()
  @ApiPropertyOptional({
    description: 'motd.storage last-modified timestamp (ms since epoch)',
  })
  storageSpaces?: number;

  @Expose()
  @ApiPropertyOptional({
    description: 'quotas.csv last-modified timestamp (ms since epoch)',
  })
  storageQuotas?: number;

  @Expose()
  @ApiPropertyOptional({
    description:
      'Last-modified timestamp (ms since epoch) of the older of pbsmon_machines.json / pbsmon_users.json',
  })
  perun?: number;

  @Expose()
  @ApiPropertyOptional({
    description:
      'Timestamp (ms since epoch) of the last completed PROMETHEUS data collection',
  })
  prometheus?: number;
}
