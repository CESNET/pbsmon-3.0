import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Reserved resources for a project
 */
export class ProjectReservedResourcesDTO {
  @Expose()
  @ApiProperty({ description: 'Number of VMs' })
  vmCount: number;

  @Expose()
  @ApiProperty({ description: 'Total vCPUs' })
  vcpus: number;

  @Expose()
  @ApiProperty({ description: 'Total memory in GB' })
  memoryGb: number;
}

/**
 * Project DTO
 */
export class ProjectDTO {
  @Expose()
  @ApiProperty({ description: 'Project ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Project name' })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Project description',
    nullable: true,
  })
  description?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Project status: active or expired',
    enum: ['active', 'expired'],
  })
  status: 'active' | 'expired';

  @Expose()
  @Type(() => ProjectReservedResourcesDTO)
  @ApiProperty({
    description: 'Reserved resources for the project',
    type: ProjectReservedResourcesDTO,
  })
  reservedResources: ProjectReservedResourcesDTO;

  @Expose()
  @ApiProperty({
    description: 'Whether this is a personal project (named after OIDC sub)',
    default: false,
  })
  isPersonal: boolean;

  @Expose()
  @ApiProperty({
    description: "Whether this is the current user's project (for admins)",
    default: false,
  })
  isMyProject: boolean;
}

/**
 * VM/Server information for a project
 */
export class ProjectVmDTO {
  @Expose()
  @ApiProperty({ description: 'Server ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Server name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Flavor name' })
  flavorName: string;

  @Expose()
  @ApiProperty({ description: 'Number of vCPUs' })
  vcpus: number;

  @Expose()
  @ApiProperty({ description: 'Memory in GB' })
  memoryGb: number;
}

/**
 * User information for a project
 */
export class ProjectUserDTO {
  @Expose()
  @ApiProperty({ description: 'User login name (logname)' })
  logname: string;

  @Expose()
  @ApiProperty({ description: 'User full name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Full name of user (forename and family name)' })
  fullName?: string;

  @Expose()
  @ApiProperty({ description: 'User organization', nullable: true })
  org?: string | null;

  @Expose()
  @ApiProperty({ description: 'AAI user id', nullable: true })
  id?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Whether user was found in Perun data',
    default: true,
  })
  foundInPerun: boolean;
}

/**
 * Project Detail DTO (extends ProjectDTO with VMs and users lists)
 */
export class ProjectDetailDTO extends ProjectDTO {
  @Expose()
  @Type(() => ProjectVmDTO)
  @ApiProperty({
    description: 'List of VMs/servers in the project',
    type: [ProjectVmDTO],
  })
  vms: ProjectVmDTO[];

  @Expose()
  @Type(() => ProjectUserDTO)
  @ApiProperty({
    description: 'List of users in the project',
    type: [ProjectUserDTO],
  })
  users: ProjectUserDTO[];
}

/**
 * Projects List DTO
 */
export class ProjectsListDTO {
  @Expose()
  @Type(() => ProjectDTO)
  @ApiProperty({
    description: 'List of projects',
    type: [ProjectDTO],
  })
  projects: ProjectDTO[];
}
