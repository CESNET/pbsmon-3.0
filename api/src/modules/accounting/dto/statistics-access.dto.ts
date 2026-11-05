import { ApiPropertyOptional } from '@nestjs/swagger';

/** What the current user may see in statistics */
export class StatisticsAccessDTO {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Clusters the user is limited to. Not present when the user may see all clusters.',
    example: ['adan', 'zia'],
  })
  clusters?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Usernames the user may enter as the user parameter (themselves and members of their groups). Not present when any user is allowed.',
    example: ['alice', 'bob'],
  })
  users?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Organizations (names) the user may select. "All organizations" is always allowed. Not present when any organization is allowed.',
    example: ['CESNET'],
  })
  organizations?: string[];
}
