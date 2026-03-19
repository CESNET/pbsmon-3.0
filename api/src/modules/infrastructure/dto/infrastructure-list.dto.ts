import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export enum NodeState {
  FREE = 'free',
  PARTIALLY_USED = 'partially_used',
  USED = 'used',
  UNKNOWN = 'unknown',
  MAINTENANCE = 'maintenance',
  NOT_AVAILABLE = 'not-available',
}

export class InfrastructureNodeListDTO {
  @Expose()
  @ApiProperty({ description: 'Node name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Number of CPUs' })
  cpu: number;

  @Expose()
  @ApiProperty({
    description: 'Current state of the node (from PBS)',
    enum: NodeState,
    nullable: true,
    required: false,
  })
  actualState?: NodeState | null;

  @Expose()
  @ApiProperty({
    description: 'CPU usage percentage (0-100)',
    nullable: true,
    required: false,
  })
  cpuUsagePercent?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Number of assigned CPUs',
    nullable: true,
    required: false,
  })
  cpuAssigned?: number | null;

  @Expose()
  @ApiProperty({
    description: 'GPU usage percentage (0-100)',
    nullable: true,
    required: false,
  })
  gpuUsagePercent?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Number of available GPUs',
    nullable: true,
    required: false,
  })
  gpuCount?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Number of assigned GPUs',
    nullable: true,
    required: false,
  })
  gpuAssigned?: number | null;

  @Expose()
  @ApiProperty({
    description: 'GPU capability (compute capability, e.g., sm_89, sm_86)',
    nullable: true,
    required: false,
  })
  gpuCapability?: string | null;

  @Expose()
  @ApiProperty({
    description: 'GPU memory per GPU (e.g., 46068mb)',
    nullable: true,
    required: false,
  })
  gpuMemory?: string | null;

  @Expose()
  @ApiProperty({
    description: 'CUDA version available on the node',
    nullable: true,
    required: false,
  })
  cudaVersion?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Total memory in GB',
    nullable: true,
    required: false,
  })
  memoryTotal?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Used memory in GB',
    nullable: true,
    required: false,
  })
  memoryUsed?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Memory usage percentage (0-100)',
    nullable: true,
    required: false,
  })
  memoryUsagePercent?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Queue assigned to this node (from PBS queue_list)',
    type: [String],
    nullable: true,
    required: false,
  })
  queueNames?: string[] | null;

  @Expose()
  @ApiProperty({
    description: 'Queue names assigned to this node',
    type: [String],
    nullable: true,
    required: false,
  })
  queues?: string[] | null;

  @Expose()
  @ApiProperty({
    description: 'Resources assigned to this node',
    type: Object,
    additionalProperties: {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    },
    nullable: true,
    required: false,
  })
  resources?: Record<string, string | number> | null;

  @Expose()
  @ApiProperty({
    description: 'OpenStack cloud node information (null if not a cloud node)',
    type: Object,
    nullable: true,
    required: false,
  })
  ostack?: {
    cpuCount?: number | null;
    vmCount?: number | null;
    cpuModel?: string | null;
  } | null;
}

/**
 * Cluster DTO for list view
 */
export class InfrastructureClusterListDTO {
  @Expose()
  @ApiProperty({ description: 'Cluster ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Cluster name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Is cluster (true/false as string)' })
  cluster: string;

  @Expose()
  @ApiProperty({ description: 'Total number of CPUs across all nodes' })
  totalCpu: number;

  @Expose()
  @ApiProperty({ description: 'Total number of nodes' })
  nodeCount: number;

  @Expose()
  @Type(() => InfrastructureNodeListDTO)
  @ApiProperty({
    description: 'List of nodes in the cluster',
    type: [InfrastructureNodeListDTO],
  })
  nodes: InfrastructureNodeListDTO[];
}

/**
 * Organization DTO for list view
 */
export class InfrastructureOrganizationListDTO {
  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Organization name (localized)' })
  name: {
    cs: string;
    en: string;
  };

  @Expose()
  @ApiProperty({ description: 'Number of clusters' })
  clusterCount: number;

  @Expose()
  @Type(() => InfrastructureClusterListDTO)
  @ApiProperty({
    description: 'List of clusters',
    type: [InfrastructureClusterListDTO],
  })
  clusters: InfrastructureClusterListDTO[];
}
