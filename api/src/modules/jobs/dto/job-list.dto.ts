import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Job List DTO - summary information for list view
 */
export class JobListDTO {
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
    description: 'Job state (Q=Queued, R=Running, C=Completed, etc.)',
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
  @ApiProperty({
    description: 'Job owner username (extracted from owner, without @realm)',
  })
  username: string;

  @Expose()
  @ApiProperty({ description: 'Queue name', nullable: true })
  queue?: string | null;

  @Expose()
  @ApiProperty({ description: 'Server name', nullable: true })
  server?: string | null;

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
  @ApiProperty({
    description: 'Runtime (seconds format)',
    nullable: true,
  })
  runtime?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Walltime (seconds format)',
    nullable: true,
  })
  walltimeReserved?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Timestamp (Unix epoch seconds) the job is expected to end by (start time + walltime)',
    nullable: true,
  })
  completedBy?: number | null;

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

  @Expose()
  @ApiProperty({ description: 'Creation timestamp (Unix epoch seconds)' })
  createdAt: number;

  @Expose()
  @ApiProperty({
    description: 'Exit code (for completed jobs)',
    nullable: true,
  })
  exitCode?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Job comment (reason for waiting, etc.)',
    nullable: true,
  })
  comment?: string | null;

  @Expose()
  @ApiProperty({
    description:
      'Whether the current user can see the job owner username (true if admin, same user, or in same group)',
  })
  canSeeOwner: boolean;
}

/**
 * Jobs List DTO
 */
export class JobsListDTO {
  @Expose()
  @ApiProperty({
    description: 'List of jobs',
    type: [JobListDTO],
  })
  jobs: JobListDTO[];
}
