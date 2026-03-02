import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { NodeState } from './infrastructure-list.dto';
import { QueueListDTO } from '@/modules/queues/dto/queue-list.dto';

export class LocalizedStringDTO {
  @Expose()
  @ApiProperty({ description: 'Czech translation' })
  cs: string;

  @Expose()
  @ApiProperty({ description: 'English translation' })
  en: string;
}

export class InfrastructureNodePbsDTO {
  @Expose()
  @ApiProperty({
    description: 'PBS node name (may differ from Perun name)',
  })
  name: string;

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
    description: 'Jobs running on this node',
    type: [String],
    nullable: true,
    required: false,
  })
  jobs?: string[] | null;

  @Expose()
  @Type(() => QueueListDTO)
  @ApiProperty({
    description: 'Queues that can use this node',
    type: [QueueListDTO],
    nullable: true,
    required: false,
  })
  queues?: QueueListDTO[] | null;

  @Expose()
  @ApiProperty({
    description: 'Raw PBS node attributes (all attributes from PBS)',
    type: Object,
    nullable: true,
    required: false,
  })
  rawPbsAttributes?: Record<string, string> | null;

  @Expose()
  @ApiProperty({
    description: 'Operational restrictions/outages for this node',
    type: [Object],
    nullable: true,
    required: false,
  })
  outages?: Array<Record<string, any>> | null;

  @Expose()
  @ApiProperty({
    description: 'Node comment (error message)',
    nullable: true,
    required: false,
  })
  comment?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Node comment_aux (auxiliary error message)',
    nullable: true,
    required: false,
  })
  commentAux?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Total scratch local space in GB',
    nullable: true,
    required: false,
  })
  scratchLocalTotal?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Used scratch local space in GB',
    nullable: true,
    required: false,
  })
  scratchLocalUsed?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Available scratch local space in GB',
    nullable: true,
    required: false,
  })
  scratchLocalAvailable?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Total scratch SSD space in GB',
    nullable: true,
    required: false,
  })
  scratchSsdTotal?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Used scratch SSD space in GB',
    nullable: true,
    required: false,
  })
  scratchSsdUsed?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Available scratch SSD space in GB',
    nullable: true,
    required: false,
  })
  scratchSsdAvailable?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Total scratch shared space in GB',
    nullable: true,
    required: false,
  })
  scratchSharedTotal?: number | null;

  @Expose()
  @ApiProperty({
    description: 'Is scratch SHM (shared memory) available',
    nullable: true,
    required: false,
  })
  scratchShmAvailable?: boolean | null;

  @Expose()
  @ApiProperty({
    description: 'Reservations information if this node is reserved',
    type: [String],
    nullable: true,
    required: false,
  })
  reservations?: string[] | null;
}

export class InfrastructureNodeDetailDTO {
  @Expose()
  @ApiProperty({ description: 'Node name (from Perun)' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Number of CPUs' })
  cpu: number;

  @Expose()
  @Type(() => InfrastructureNodePbsDTO)
  @ApiProperty({
    description:
      'PBS node data (null if node is not managed by PBS, e.g., cloud nodes)',
    type: InfrastructureNodePbsDTO,
    nullable: true,
    required: false,
  })
  pbs?: InfrastructureNodePbsDTO | null;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({
    description: 'Cluster name (localized)',
    nullable: true,
    required: false,
  })
  clusterName?: LocalizedStringDTO | null;

  @Expose()
  @ApiProperty({
    description: 'Cluster ID',
    nullable: true,
    required: false,
  })
  clusterId?: string | null;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({
    description: 'Owner organization (localized)',
    nullable: true,
    required: false,
  })
  owner?: LocalizedStringDTO | null;

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

export class InfrastructureClusterDetailDTO {
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
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Description (localized)' })
  desc: LocalizedStringDTO;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Specification (localized)' })
  spec: LocalizedStringDTO;

  @Expose()
  @ApiProperty({ description: 'CPU description', nullable: true })
  cpudesc: string | null;

  @Expose()
  @ApiProperty({ description: 'GPU description', nullable: true })
  gpudesc: string | null;

  @Expose()
  @ApiProperty({ description: 'Photo URL', nullable: true })
  photo: string | null;

  @Expose()
  @ApiProperty({ description: 'Thumbnail URL', nullable: true })
  thumbnail: string | null;

  @Expose()
  @ApiProperty({ description: 'Memory specification' })
  memory: string;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Disk specification (localized)' })
  disk: LocalizedStringDTO;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Network specification (localized)' })
  network: LocalizedStringDTO;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Comment (localized)' })
  comment: LocalizedStringDTO;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Owner (localized)' })
  owner: LocalizedStringDTO;

  @Expose()
  @ApiProperty({ description: 'Virtual Organizations', type: [String] })
  vos: string[];

  @Expose()
  @Type(() => InfrastructureNodeDetailDTO)
  @ApiProperty({
    description: 'List of nodes in the cluster',
    type: [InfrastructureNodeDetailDTO],
  })
  machines: InfrastructureNodeDetailDTO[];
}

export class InfrastructureOrganizationDetailDTO {
  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  id: string;

  @Expose()
  @Type(() => LocalizedStringDTO)
  @ApiProperty({ description: 'Organization name (localized)' })
  name: LocalizedStringDTO;

  @Expose()
  @Type(() => InfrastructureClusterDetailDTO)
  @ApiProperty({
    description: 'List of clusters/resources',
    type: [InfrastructureClusterDetailDTO],
  })
  resources: InfrastructureClusterDetailDTO[];
}

export class InfrastructureDetailDTO {
  @Expose()
  @ApiProperty({ description: 'Infrastructure type' })
  type: 'Organization' | 'Cluster' | 'Node';

  @Expose()
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Name (can be string or localized object)' })
  name: string | LocalizedStringDTO;

  @Expose()
  @Type(() => InfrastructureOrganizationDetailDTO)
  @ApiProperty({
    description: 'Full organization data (only for Organization type)',
    required: false,
    nullable: true,
  })
  organization?: InfrastructureOrganizationDetailDTO | null;

  @Expose()
  @Type(() => InfrastructureClusterDetailDTO)
  @ApiProperty({
    description: 'Full cluster data (only for Cluster type)',
    required: false,
    nullable: true,
  })
  cluster?: InfrastructureClusterDetailDTO | null;

  @Expose()
  @Type(() => InfrastructureNodeDetailDTO)
  @ApiProperty({
    description: 'Full node data (only for Node type)',
    required: false,
    nullable: true,
  })
  node?: InfrastructureNodeDetailDTO | null;
}
