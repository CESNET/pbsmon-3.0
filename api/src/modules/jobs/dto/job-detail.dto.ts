import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Subjob DTO - for array jobs
 */
export class SubjobDTO {
  @Expose()
  @ApiProperty({
    description: 'Subjob ID (e.g., "14699148[96].pbs-m1.metacentrum.cz")',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Subjob state (Q=Queued, R=Running, C=Completed, etc.)',
  })
  state: string;

  @Expose()
  @ApiProperty({
    description: 'Subjob state name (queued, running, completed, etc.)',
  })
  stateName: string;

  @Expose()
  @ApiProperty({
    description:
      'Subjob state color classes (e.g., "bg-green-100 text-green-800")',
  })
  stateColor: string;

  @Expose()
  @ApiProperty({ description: 'Assigned node/machine name', nullable: true })
  node?: string | null;

  @Expose()
  @ApiProperty({ description: 'Reserved CPU count' })
  cpuReserved: number;

  @Expose()
  @ApiProperty({ description: 'Reserved GPU count' })
  gpuReserved: number;

  @Expose()
  @ApiProperty({ description: 'Reserved memory in GB' })
  memoryReserved: number;

  @Expose()
  @ApiProperty({ description: 'Memory used in GB', nullable: true })
  memoryUsed?: number | null;

  @Expose()
  @ApiProperty({
    description: 'CPU time used (HH:MM:SS format)',
    nullable: true,
  })
  cpuTimeUsed?: string | null;

  @Expose()
  @ApiProperty({ description: 'Runtime (seconds format)', nullable: true })
  runtime?: number | null;

  @Expose()
  @ApiProperty({ description: 'Exit code', nullable: true })
  exitCode?: number | null;
}

/**
 * Allocated resource per machine
 */
export class AllocatedResourceDTO {
  @Expose()
  @ApiProperty({ description: 'Machine/node name' })
  machine: string;

  @Expose()
  @ApiProperty({ description: 'CPU count allocated' })
  cpu: number;

  @Expose()
  @ApiProperty({ description: 'GPU count allocated' })
  gpu: number;

  @Expose()
  @ApiProperty({ description: 'RAM allocated in GB' })
  ram: number;

  @Expose()
  @ApiProperty({ description: 'Scratch space allocated in GB', nullable: true })
  scratch?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Scratch type (local, ssd, volume)',
    nullable: true,
  })
  scratchType?: string | null;
}

/**
 * Custom message DTO
 */
export class JobMessageDTO {
  @Expose()
  @ApiProperty({ description: 'Message type (info, error, warning)' })
  type: 'info' | 'error' | 'warning';

  @Expose()
  @ApiProperty({ description: 'Message text' })
  message: string;

  @Expose()
  @ApiProperty({
    description:
      'Message code for translation (e.g., "cpuUsageLow", "memoryOverAllocated")',
    nullable: true,
  })
  code?: string | null;

  @Expose()
  @ApiProperty({
    description:
      'Message parameters for translation (e.g., {percent: 50, resource: "CPU"})',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  params?: Record<string, any> | null;
}

/**
 * Job Detail DTO - comprehensive information for detail view
 */
export class JobDetailDTO {
  @Expose()
  @ApiProperty({
    description: 'Job ID (e.g., "11118906.pbs-m1.metacentrum.cz")',
  })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Job name' })
  name: string;

  @Expose()
  @ApiProperty({
    description:
      'Job state (Q=Queued, R=Running, C=Completed, E=Exiting, H=Held)',
  })
  state: string;

  @Expose()
  @ApiProperty({
    description: 'Job state name (queued, running, completed, etc.)',
  })
  stateName: string;

  @Expose()
  @ApiProperty({
    description:
      'Job state color classes (e.g., "bg-green-100 text-green-800")',
  })
  stateColor: string;

  @Expose()
  @ApiProperty({ description: 'Job owner (username@realm)' })
  owner: string;

  @Expose()
  @ApiProperty({ description: 'Job owner username (extracted from owner)' })
  username: string;

  @Expose()
  @ApiProperty({
    description:
      'Whether the current user can see the job owner username (true if admin, same user, or in same group)',
  })
  canSeeOwner: boolean;

  @Expose()
  @ApiProperty({ description: 'Queue name', nullable: true })
  queue?: string | null;

  @Expose()
  @ApiProperty({ description: 'Server name', nullable: true })
  server?: string | null;

  @Expose()
  @ApiProperty({ description: 'Assigned node/machine name', nullable: true })
  node?: string | null;

  // Requested resources
  @Expose()
  @ApiProperty({ description: 'Requested resources string' })
  requestedResources: string;

  @Expose()
  @ApiProperty({ description: 'Reserved CPU count' })
  cpuReserved: number;

  @Expose()
  @ApiProperty({ description: 'Reserved GPU count' })
  gpuReserved: number;

  @Expose()
  @ApiProperty({ description: 'Reserved memory in GB' })
  memoryReserved: number;

  @Expose()
  @ApiProperty({ description: 'Reserved walltime in seconds', nullable: true })
  walltimeReserved?: number | null;

  @Expose()
  @ApiProperty({ description: 'Reserved scratch space in GB', nullable: true })
  scratchReserved?: number | null;

  // Resource usage (only when running or finished)
  @Expose()
  @ApiProperty({
    description: 'CPU time used (HH:MM:SS format)',
    nullable: true,
  })
  cpuTimeUsed?: string | null;

  @Expose()
  @ApiProperty({
    description: 'GPU time used (HH:MM:SS format)',
    nullable: true,
  })
  gpuTimeUsed?: string | null;

  @Expose()
  @ApiProperty({ description: 'Memory used in GB', nullable: true })
  memoryUsed?: number | null;

  @Expose()
  @ApiProperty({ description: 'Runtime (seconds format)', nullable: true })
  runtime?: number | null;

  @Expose()
  @ApiProperty({ description: 'CPU usage percentage', nullable: true })
  cpuUsagePercent?: number | null;

  @Expose()
  @ApiProperty({ description: 'CPU usage percentage per CPU', nullable: true })
  cpuUsagePercentPerCpu?: number | null;

  @Expose()
  @ApiProperty({ description: 'GPU usage percentage', nullable: true })
  gpuUsagePercent?: number | null;

  @Expose()
  @ApiProperty({ description: 'GPU usage percentage per GPU', nullable: true })
  gpuUsagePercentPerGpu?: number | null;

  @Expose()
  @ApiProperty({ description: 'Memory usage percentage', nullable: true })
  memoryUsagePercent?: number | null;

  // Timestamps
  @Expose()
  @ApiProperty({ description: 'Creation timestamp (Unix epoch seconds)' })
  createdAt: number;

  @Expose()
  @ApiProperty({
    description: 'Eligible timestamp (Unix epoch seconds)',
    nullable: true,
  })
  eligibleAt?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Start timestamp (Unix epoch seconds)',
    nullable: true,
  })
  startedAt?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Obit timestamp (Unix epoch seconds). End timestamp recorded by PBS when the job finishes.',
    nullable: true,
  })
  obitAt?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Timestamp (Unix epoch seconds) the job is expected to end by (start time + walltime)',
    nullable: true,
  })
  completedBy?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Last state change timestamp (Unix epoch seconds)',
    nullable: true,
  })
  lastStateChangeAt?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Kerberos ticket timestamp (Unix epoch seconds)',
    nullable: true,
  })
  kerberosTicketAt?: number | null;

  // Directories
  @Expose()
  @ApiProperty({ description: 'Directory for stdout', nullable: true })
  stdoutDirectory?: string | null;

  @Expose()
  @ApiProperty({ description: 'Working directory', nullable: true })
  workingDirectory?: string | null;

  @Expose()
  @ApiProperty({ description: 'SCRATCHDIR path', nullable: true })
  scratchDirectory?: string | null;

  // Comment
  @Expose()
  @ApiProperty({ description: 'Job comment', nullable: true })
  comment?: string | null;

  // Exit code
  @Expose()
  @ApiProperty({
    description: 'Exit code (for completed jobs)',
    nullable: true,
  })
  exitCode?: number | null;

  // Allocated resources per machine
  @Expose()
  @Type(() => AllocatedResourceDTO)
  @ApiProperty({
    description: 'Allocated resources per machine',
    type: [AllocatedResourceDTO],
  })
  allocatedResources: AllocatedResourceDTO[];

  // Environment variables
  @Expose()
  @ApiProperty({
    description: 'Environment variables',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  environmentVariables: Record<string, string>;

  // Subjobs (for array jobs)
  @Expose()
  @Type(() => SubjobDTO)
  @ApiProperty({
    description: 'Subjobs (for array jobs)',
    type: [SubjobDTO],
    nullable: true,
  })
  subjobs?: SubjobDTO[] | null;

  // Custom messages
  @Expose()
  @Type(() => JobMessageDTO)
  @ApiProperty({
    description: 'Custom messages (info, error, warning)',
    type: [JobMessageDTO],
  })
  messages: JobMessageDTO[];

  // Raw PBS attributes (system information)
  @Expose()
  @ApiProperty({
    description: 'Raw PBS job attributes (all attributes from PBS)',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  rawAttributes: Record<string, string>;
}
