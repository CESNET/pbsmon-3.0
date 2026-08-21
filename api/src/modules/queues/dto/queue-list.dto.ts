import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { QueueReservationDTO, QueueStateCountDTO } from './queue-detail.dto';

/**
 * User information for ACL
 */
export class QueueAclUserDTO {
  @Expose()
  @ApiProperty({
    description: 'Username (only visible to admins or users in shared groups)',
  })
  username?: string | null;

  @Expose()
  @ApiProperty({
    description: 'User display name (from Perun)',
    nullable: true,
  })
  name?: string | null;

  @Expose()
  @ApiProperty({
    description: 'User nickname (always visible)',
    nullable: true,
  })
  nickname?: string | null;
}

/**
 * Queue DTO for list view
 */
export class QueueListDTO {
  @Expose()
  @ApiProperty({ description: 'Queue name' })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Server name this queue belongs to',
    nullable: true,
  })
  server?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Queue type',
    enum: ['Execution', 'Route'],
  })
  queueType: 'Execution' | 'Route';

  @Expose()
  @ApiProperty({
    description: 'Default queue list from default_chunk.queue_list',
    nullable: true,
  })
  defaultQueueList?: string | null;

  @Expose()
  @ApiProperty({ description: 'Queue priority', nullable: true })
  priority?: number | null;

  @Expose()
  @ApiProperty({ description: 'Total number of jobs', nullable: true })
  totalJobs?: number | null;

  @Expose()
  @Type(() => QueueStateCountDTO)
  @ApiProperty({
    description: 'Job state counts',
    type: QueueStateCountDTO,
    nullable: true,
  })
  stateCount?: QueueStateCountDTO | null;

  @Expose()
  @ApiProperty({
    description: 'Fairshare tree name',
    nullable: true,
  })
  fairshare?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Maximum jobs per user',
    nullable: true,
  })
  maximumForUser?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Minimum walltime required',
    nullable: true,
  })
  minWalltime?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Maximum walltime allowed',
    nullable: true,
  })
  maxWalltime?: string | null;

  @Expose()
  @ApiProperty({ description: 'Is queue enabled' })
  enabled: boolean;

  @Expose()
  @ApiProperty({ description: 'Is queue started' })
  started: boolean;

  @Expose()
  @ApiProperty({
    description: 'Whether the current user has access to this queue',
    required: false,
  })
  hasAccess?: boolean;

  @Expose()
  @ApiProperty({
    description:
      'Whether this queue can accept direct job submissions (false if from_route_only=True)',
    required: false,
  })
  canBeDirectlySubmitted?: boolean;

  @Expose()
  @ApiProperty({
    description:
      'ACL groups that have access to this queue (if acl_group_enable is true)',
    type: [String],
    nullable: true,
    required: false,
  })
  aclGroups?: string[] | null;

  @Expose()
  @Type(() => QueueAclUserDTO)
  @ApiProperty({
    description:
      'ACL users that have access to this queue (if acl_user_enable is true)',
    type: [QueueAclUserDTO],
    nullable: true,
    required: false,
  })
  aclUsers?: QueueAclUserDTO[] | null;

  @Expose()
  @ApiProperty({
    description:
      'Whether this queue is created for a reservation (has an associated reservation)',
    required: false,
  })
  hasReservation?: boolean;

  @Expose()
  @Type(() => QueueReservationDTO)
  @ApiProperty({
    description: 'Reservation details if this queue is created for a reservation',
    type: QueueReservationDTO,
    nullable: true,
    required: false,
  })
  reservation?: QueueReservationDTO | null;

  @Expose()
  @Type(() => QueueListDTO)
  @ApiProperty({
    description: 'Child queues (queues that this queue routes to)',
    type: [QueueListDTO],
    required: false,
  })
  children?: QueueListDTO[];
}

/**
 * Hierarchical queues DTO - root level queues with their children
 */
export class QueuesListDTO {
  @Expose()
  @Type(() => QueueListDTO)
  @ApiProperty({
    description:
      'Root level queues (typically Route queues) with their hierarchical children',
    type: [QueueListDTO],
  })
  queues: QueueListDTO[];
}
