import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetaDto } from '@/common/dto/meta.dto';

export class JobsListMetaDto extends MetaDto {
  @ApiPropertyOptional({
    description: 'State values that can be used for filtering the searched jobs list',
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  filterableStates?: Record<string, string> | null;

  @ApiPropertyOptional({
    description: 'Timestamp (Unix epoch seconds) of the last running job completion',
    nullable: true,
    type: 'number',
  })
  lastRunningCompletedBy?: number | null;
}
