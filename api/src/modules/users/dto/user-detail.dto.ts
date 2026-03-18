import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * User task counts (same as queue state counts)
 */
export class UserTaskCountDTO {
  @Expose()
  @ApiProperty({ description: 'Number of jobs in Transit state' })
  transit: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Queued state' })
  queued: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Held state' })
  held: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Waiting state' })
  waiting: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Running state' })
  running: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Exiting state' })
  exiting: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Begun state' })
  begun: number;

  @Expose()
  @ApiProperty({ description: 'Number of jobs in Done state' })
  done: number;

  @Expose()
  @ApiProperty({ description: 'Total number of jobs' })
  total: number;
}

/**
 * Fairshare information for a specific server
 */
export class UserFairshareDTO {
  @Expose()
  @ApiProperty({ description: 'Server name' })
  server: string;

  @Expose()
  @ApiProperty({
    description:
      'Fairshare ranking (1 = worst, maximum = best). Ranking is calculated among users currently computing (with running jobs).',
    nullable: true,
  })
  ranking?: number | null;

  @Expose()
  @ApiProperty({
    description:
      'Total number of users currently computing on this server (used to calculate users before you)',
    nullable: true,
  })
  totalUsers?: number | null;
}

/**
 * User Detail DTO
 */
export class UserDetailDTO {
  @Expose()
  @ApiProperty({ description: 'User login name (username)' })
  username: string;

  @Expose()
  @ApiProperty({
    description: 'User nickname (full name from Perun)',
    nullable: true,
  })
  nickname?: string | null;

  @Expose()
  @ApiProperty({
    description: 'User organization from Perun',
    nullable: true,
  })
  organization?: string | null;

  @Expose()
  @ApiProperty({
    description: 'User preffered e-mail',
    nullable: true,
  })
  mail?: string | null;

  @Expose()
  @ApiProperty({
    description: 'User preffered language',
    nullable: true,
  })
  lang?: string | null;

  @Expose()
  @ApiProperty({
    description: 'The groups the user belongs to.',
    type: [String],
    nullable: true,
    required: false,
  })
  groups?: string[] | null;

  @Expose()
  @ApiProperty({
    description: 'User publications from Perun',
    type: 'object',
    additionalProperties: { type: 'string' },
    nullable: true,
  })
  publications?: Record<string, string> | null;

  @Expose()
  @ApiProperty({
    description:
      'Membership expiration date (earliest expiration from all VOS memberships)',
    nullable: true,
  })
  membershipExpiration?: string | null;

  @Expose()
  @Type(() => UserTaskCountDTO)
  @ApiProperty({
    description: 'Task counts (job state counts)',
    type: UserTaskCountDTO,
  })
  tasks: UserTaskCountDTO;

  @Expose()
  @Type(() => UserFairshareDTO)
  @ApiProperty({
    description: 'Fairshare information per server',
    type: [UserFairshareDTO],
  })
  fairsharePerServer: UserFairshareDTO[];
}
