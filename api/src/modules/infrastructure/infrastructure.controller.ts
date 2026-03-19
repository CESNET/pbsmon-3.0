import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import {
  ApiOkResponseArray,
  ApiOkResponseModel,
} from '@/common/swagger/api-generic-response';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureOrganizationListDTO } from './dto/infrastructure-list.dto';
import { InfrastructureDetailDTO } from './dto/infrastructure-detail.dto';
import { InfrastructureListMetaDto } from './dto/infrastructure-list-meta.dto';
import { InfrastructureFiltersDTO } from './dto/infrastructure-filters.dto';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { ParseFiltersPipe } from '@/common/pipes/filters.pipe';

@ApiTags('infrastructure')
@Controller('infrastructure')
export class InfrastructureController {
  constructor(private readonly infrastructureService: InfrastructureService) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of all infrastructure',
    description:
      'Returns hierarchical list of organizations, clusters, and nodes with limited data and statistics. ID formats: organization-{id}, cluster-{id}, node-{clusterId}-{nodeName}',
  })
  @ApiOkResponseArray(
    InfrastructureOrganizationListDTO,
    'List of infrastructure organizations',
    InfrastructureListMetaDto,
  )
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query (searches machines by name or queue)',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    type: String,
    description: 'Object with attribute filters',
  })
  getInfrastructure(
    @Query('search') search?: string,
    @Query('filters', ParseFiltersPipe) filters: [string, string | number][] = [],
  ): ApiResponse<
    InfrastructureOrganizationListDTO[],
    InfrastructureListMetaDto
  > {
    const { data, meta } = this.infrastructureService.getInfrastructureList(
      search,
      filters,
    );
    return new ApiResponse(data, meta);
  }

  @Get('filters')
  @ApiOperation({
    summary: 'Get list of infrastructure filters',
    description: 'Returns infrastructure filters',
  })
  @ApiOkResponseModel(InfrastructureFiltersDTO, 'Infrastructure filters detail')
  @ApiNotFoundResponse({ description: 'Infrastructure filters not found' })
  getInfrastructureFilters(): ApiResponse<InfrastructureFiltersDTO> {
    const data = this.infrastructureService.getInfrastructureFilters();
    return new ApiResponse(data);
  }

  @Get('organizations/:id')
  @ApiOperation({
    summary: 'Get organization detail',
    description: 'Returns full organization details by ID',
  })
  @ApiOkResponseModel(InfrastructureDetailDTO, 'Organization detail')
  @ApiNotFoundResponse({ description: 'Organization not found' })
  getOrganizationDetail(
    @Param('id') id: string,
  ): ApiResponse<InfrastructureDetailDTO> {
    const data = this.infrastructureService.getOrganizationDetail(id);
    return new ApiResponse(data);
  }

  @Get('clusters/:id')
  @ApiOperation({
    summary: 'Get cluster detail',
    description: 'Returns full cluster details by ID',
  })
  @ApiOkResponseModel(InfrastructureDetailDTO, 'Cluster detail')
  @ApiNotFoundResponse({ description: 'Cluster not found' })
  getClusterDetail(
    @Param('id') id: string,
  ): ApiResponse<InfrastructureDetailDTO> {
    const data = this.infrastructureService.getClusterDetail(id);
    return new ApiResponse(data);
  }

  @Get('machines/:nodeName')
  @ApiOperation({
    summary: 'Get machine (node) detail',
    description:
      'Returns full machine details by node name. Node name can be FQDN or hostname. Searches across all clusters.',
  })
  @ApiOkResponseModel(InfrastructureDetailDTO, 'Machine detail')
  @ApiNotFoundResponse({ description: 'Machine not found' })
  getMachineDetail(
    @Param('nodeName') nodeName: string,
    @UserContextDecorator() userContext: UserContext,
  ): ApiResponse<InfrastructureDetailDTO> {
    const data = this.infrastructureService.getMachineDetail(
      nodeName,
      userContext,
    );
    return new ApiResponse(data);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get infrastructure detail (deprecated)',
    description:
      'Returns full infrastructure details by ID. ID formats: organization-{id}, cluster-{id}, node-{clusterId}-{nodeName}. Deprecated: use specific endpoints instead.',
  })
  @ApiOkResponseModel(InfrastructureDetailDTO, 'Infrastructure detail')
  @ApiNotFoundResponse({ description: 'Infrastructure not found' })
  getInfrastructureDetail(
    @Param('id') id: string,
  ): ApiResponse<InfrastructureDetailDTO> {
    const data = this.infrastructureService.getInfrastructureDetail(id);
    return new ApiResponse(data);
  }
}
