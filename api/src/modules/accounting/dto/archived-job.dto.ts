import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ArchivedJobDTO {
  @Expose()
  @ApiProperty({
    description: 'Job ID (e.g., "11118906.pbs-m1.metacentrum.cz")',
  })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Number of used CPUs' })
  cpus: number;

  @Expose()
  @ApiProperty({ description: 'Job name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Queue name' })
  queue: string;

  @Expose()
  @ApiProperty({ type: String, description: 'Job owner username', nullable: true })
  username: string | null;

  @Expose()
  @ApiProperty({ type: String, description: 'PBS server hostname', nullable: true })
  pbsServer: string | null;

  @Expose()
  @ApiProperty({
    type: Number,
    description: 'Accounting record time (Unix epoch seconds)',
    nullable: true,
  })
  recordTime: number | null;

  @Expose()
  @ApiProperty({
    type: Number,
    description: 'Job creation time (Unix epoch seconds)',
    nullable: true,
  })
  createdAt: number | null;

  @Expose()
  @ApiProperty({
    type: Number,
    description: 'Job start time (Unix epoch seconds)',
    nullable: true,
  })
  startedAt: number | null;

  @Expose()
  @ApiProperty({
    type: Number,
    description: 'Job end time (Unix epoch seconds)',
    nullable: true,
  })
  endedAt: number | null;

  @Expose()
  @ApiProperty({
    type: String,
    description: 'Requested resources string (req_nodes)',
    nullable: true,
  })
  requestedResources: string | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Reserved memory', nullable: true })
  memoryReserved: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Used memory', nullable: true })
  memoryUsed: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Reserved NGPUS', nullable: true })
  gpuReserved: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Used gpupercent', nullable: true })
  gpupercent: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Used walltime in seconds', nullable: true })
  runtime: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Requested walltime in seconds', nullable: true })
  walltime: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Used cpupercent', nullable: true })
  cpupercent: number | null;

  @Expose()
  @ApiProperty({ type: Number, description: 'Job exit status', nullable: true })
  exitStatus: number | null;
}

export class ArchivedJobsListDTO {
  @Expose()
  @ApiProperty({ type: [ArchivedJobDTO], description: 'List of archived jobs' })
  jobs: ArchivedJobDTO[];
}
