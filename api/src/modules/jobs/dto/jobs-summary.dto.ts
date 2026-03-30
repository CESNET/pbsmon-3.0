import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Jobs Summary DTO - summary information of jobs
 */
export class JobsSummaryDTO {
  @ApiPropertyOptional({
    description: 'Counts of jobs states',
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  stateCounts?: Record<string, number> | null;

  @ApiPropertyOptional({
    description: 'Counts of waiting jobs comments',
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  waitingReasons?: Record<string, number> | null;
}
