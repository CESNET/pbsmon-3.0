import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { QueueAclUserDTO } from './queue-list.dto';

/**
 * ACL Group information
 */
export class QueueAclGroupDTO {
  @Expose()
  @ApiProperty({ description: 'Group name' })
  name: string;

  @Expose()
  @ApiProperty({
    description:
      'Whether the current user has access to this group (true if admin or user is a member)',
  })
  hasAccess: boolean;
}

/**
 * Access Control List (ACL) information
 */
export class QueueAclDTO {
  @Expose()
  @Type(() => QueueAclUserDTO)
  @ApiProperty({
    description: 'ACL users (if acl_user_enable is true)',
    type: [QueueAclUserDTO],
    nullable: true,
  })
  users?: QueueAclUserDTO[] | null;

  @Expose()
  @Type(() => QueueAclGroupDTO)
  @ApiProperty({
    description: 'ACL groups (if acl_group_enable is true)',
    type: [QueueAclGroupDTO],
    nullable: true,
  })
  groups?: QueueAclGroupDTO[] | null;

  @Expose()
  @ApiProperty({
    description: 'ACL hosts (if acl_host_enable is true)',
    type: [String],
    nullable: true,
  })
  hosts?: string[] | null;
}

/**
 * Resource limits and defaults
 */
export class QueueResourcesDTO {
  @Expose()
  @ApiProperty({
    description: 'Minimum memory required',
    nullable: true,
  })
  minMem?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Minimum CPUs required',
    nullable: true,
  })
  minNcpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Minimum GPUs required',
    nullable: true,
  })
  minNgpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Minimum walltime required',
    nullable: true,
  })
  minWalltime?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Maximum CPUs allowed',
    nullable: true,
  })
  maxNcpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Maximum GPUs allowed',
    nullable: true,
  })
  maxNgpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Maximum walltime allowed',
    nullable: true,
  })
  maxWalltime?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Default walltime',
    nullable: true,
  })
  defaultWalltime?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Default CPUs',
    nullable: true,
  })
  defaultNcpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Default GPUs',
    nullable: true,
  })
  defaultNgpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Assigned memory',
    nullable: true,
  })
  assignedMem?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Assigned CPUs',
    nullable: true,
  })
  assignedNcpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Assigned GPUs',
    nullable: true,
  })
  assignedNgpus?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Assigned node count',
    nullable: true,
  })
  assignedNodect?: string | null;
}

/**
 * Queue state counts
 */
export class QueueStateCountDTO {
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
}

/**
 * Reservation information for a queue
 */
export class QueueReservationDTO {
  @Expose()
  @ApiProperty({ description: 'Reservation name/ID' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Reservation display name', nullable: true })
  displayName?: string | null;

  @Expose()
  @ApiProperty({ description: 'Reservation owner', nullable: true })
  owner?: string | null;

  @Expose()
  @ApiProperty({
    description:
      'Whether the current user can see the reservation owner username (true if admin, same user, or in same group)',
  })
  canSeeOwner?: boolean;

  @Expose()
  @ApiProperty({
    description:
      'Whether the current user has access to this reservation (true if admin or user is in authorizedUsers)',
  })
  hasAccess?: boolean;

  @Expose()
  @ApiProperty({ description: 'Reservation state', nullable: true })
  state?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Reservation start time (Unix timestamp)',
    nullable: true,
  })
  startTime?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Reservation end time (Unix timestamp)',
    nullable: true,
  })
  endTime?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Reservation duration (seconds)',
    nullable: true,
  })
  duration?: number | null;

  @Expose()
  @ApiProperty({ description: 'Resource list - memory', nullable: true })
  resourceMem?: string | null;

  @Expose()
  @ApiProperty({ description: 'Resource list - CPUs', nullable: true })
  resourceNcpus?: string | null;

  @Expose()
  @ApiProperty({ description: 'Resource list - GPUs', nullable: true })
  resourceNgpus?: string | null;

  @Expose()
  @ApiProperty({ description: 'Resource list - node count', nullable: true })
  resourceNodect?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Authorized users with access information',
    type: [Object],
    nullable: true,
  })
  authorizedUsers?: Array<{ username: string; hasAccess: boolean }> | null;

  @Expose()
  @ApiProperty({
    description: 'Reserved nodes',
    type: [String],
    nullable: true,
  })
  nodes?: string[] | null;

  @Expose()
  @ApiProperty({
    description: 'Invalid reservation, reservation contains nodes from different partitions',
    nullable: true,
  })
  invalid?: boolean | null;

  @Expose()
  @ApiProperty({
    description: 'Whether the reservation has started (reserve_state === 5)',
    nullable: true,
  })
  isStarted?: boolean | null;

  @Expose()
  @ApiProperty({
    description: 'Queue name associated with this reservation',
    nullable: true,
  })
  queue?: string | null;
}

/**
 * Queue Detail DTO
 */
export class QueueDetailDTO {
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
  @Type(() => QueueAclDTO)
  @ApiProperty({
    description: 'Access Control List information',
    type: QueueAclDTO,
    nullable: true,
  })
  acl?: QueueAclDTO | null;

  @Expose()
  @Type(() => QueueResourcesDTO)
  @ApiProperty({
    description: 'Resource limits and assignments',
    type: QueueResourcesDTO,
    nullable: true,
  })
  resources?: QueueResourcesDTO | null;

  @Expose()
  @Type(() => QueueReservationDTO)
  @ApiProperty({
    description:
      'Reservation information if this queue is created for a reservation',
    type: QueueReservationDTO,
    nullable: true,
  })
  reservation?: QueueReservationDTO | null;

  @Expose()
  @Type(() => QueueDetailDTO)
  @ApiProperty({
    description: 'Child queues (queues that this queue routes to)',
    type: [QueueDetailDTO],
    nullable: true,
  })
  children?: QueueDetailDTO[] | null;

  @Expose()
  @ApiProperty({
    description:
      'Parent queue (Route queue that routes to this queue). A queue can have only one parent.',
    type: String,
    nullable: true,
  })
  parent?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Additional queue attributes',
    type: 'object',
    additionalProperties: { type: 'string' },
    nullable: true,
  })
  additionalAttributes?: Record<string, string> | null;
}
