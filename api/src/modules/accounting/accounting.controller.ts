import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponse as ApiResponseDto } from '@/common/dto/api-response.dto';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import { MetaDto } from '@/common/dto/meta.dto';
import {
  AccountingService,
  ArchivedJobsRange,
} from './accounting.service';
import { UserInfoDTO } from './dto/user-info.dto';
import { OutageRecordDTO } from './dto/outage-record.dto';
import {
  CanonicalOrgNameDTO,
  StatisticsOrganizationDTO,
} from './dto/org-name.dto';
import { ArchivedJobsListDTO } from './dto/archived-job.dto';
import { StatisticsAccessDTO } from './dto/statistics-access.dto';
import {
  StatisticsGraphChartDTO,
  StatisticsGraphDataDTO,
  StatisticsGraphInfoDTO,
  StatisticsGraphRequestDTO,
} from './dto/statistics-graph.dto';
import {
  ApiOkResponseModel,
  ApiOkResponseArray,
} from '@/common/swagger/api-generic-response';

@ApiTags('accounting')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('users/:username')
  @ApiOperation({
    summary: 'Get user accounting information',
    description:
      'Returns user accounting information including job count, total CPU time, and yearly usage breakdown. Admin can see all users. Non-admin can see themselves and users from their groups (excluding system-wide groups that contain 80%+ of all Metacentrum users). Returns null if database is not configured.',
  })
  @ApiOkResponseModel(UserInfoDTO, 'User accounting information')
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserInfo(
    @Param('username') username: string,
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<UserInfoDTO | null>> {
    try {
      const data = await this.accountingService.getUserInfoByName(
        username,
        userContext,
      );
      return new ApiResponseDto(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`User '${username}' was not found`);
    }
  }

  @Get('nodes/:nodeName/outages')
  @ApiOperation({
    summary: 'Get outages for a node',
    description:
      'Returns list of outages for a specific node. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(OutageRecordDTO, 'List of outages')
  async getOutagesForNode(
    @Param('nodeName') nodeName: string,
  ): Promise<ApiResponseDto<OutageRecordDTO[]>> {
    const data = await this.accountingService.getOutagesForNode(nodeName);
    return new ApiResponseDto(data);
  }

  @Get('jobs/started')
  @ApiOperation({
    summary: 'Get list of started job IDs',
    description:
      'Returns list of started job IDs. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(String, 'List of started job IDs')
  async getStartedJobIds(): Promise<ApiResponseDto<string[]>> {
    const data = await this.accountingService.getStartedJobIds();
    return new ApiResponseDto(data);
  }

  @Get('org-names')
  @ApiOperation({
    summary: 'Get canonical organization names',
    description:
      'Returns list of canonical organization names. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(CanonicalOrgNameDTO, 'List of organization names')
  async getCanonicalOrgNames(): Promise<ApiResponseDto<CanonicalOrgNameDTO[]>> {
    const data = await this.accountingService.getCanonicalOrgNames();
    return new ApiResponseDto(data);
  }

  @Get('statistics/access')
  @ApiOperation({
    summary: 'Get statistics access of the current user',
    description:
      'Returns the clusters and users the current user is limited to in statistics. Admins are not limited. Users with the statistics role are limited to the clusters configured for them and to themselves and members of their groups; without configured clusters they have no access.',
  })
  @ApiOkResponseModel(StatisticsAccessDTO, 'Statistics access')
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  getStatisticsAccess(
    @UserContextDecorator() userContext: UserContext,
  ): ApiResponseDto<StatisticsAccessDTO> {
    return new ApiResponseDto(
      this.accountingService.getStatisticsAccessInfo(userContext),
    );
  }

  @Get('statistics/clusters')
  @ApiOperation({
    summary: 'Get clusters available for statistics',
    description:
      'Returns sorted list of cluster names available for statistics, limited to the clusters of the user. Only for users with the statistics or admin role. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(String, 'List of cluster names')
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  async getStatisticsClusters(
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<string[]>> {
    const data = await this.accountingService.getStatisticsClusters(userContext);
    return new ApiResponseDto(data);
  }

  @Get('statistics/queues')
  @ApiOperation({
    summary: 'Get queues available for statistics',
    description:
      'Returns sorted list of queue names found in accounting records, available for statistics. Only for users with the statistics or admin role. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(String, 'List of queue names')
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  async getStatisticsQueues(
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<string[]>> {
    const data = await this.accountingService.getStatisticsQueues(userContext);
    return new ApiResponseDto(data);
  }

  @Get('statistics/organizations')
  @ApiOperation({
    summary: 'Get organizations available for statistics',
    description:
      'Returns list of organizations sorted by name, each with one representative IdP name. Only for users with the statistics or admin role. Returns empty array if database is not configured.',
  })
  @ApiOkResponseArray(StatisticsOrganizationDTO, 'List of organizations')
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  async getStatisticsOrganizations(
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<StatisticsOrganizationDTO[]>> {
    const data =
      await this.accountingService.getStatisticsOrganizations(userContext);
    return new ApiResponseDto(data);
  }

  @Get('statistics/graphs')
  @ApiOperation({
    summary: 'List statistics graphs',
    description:
      'Returns all statistics graphs with their graphId and the parameters they accept, for use with POST statistics/graphs/:graphId and POST statistics/graphs/:graphId/chart. Only for users with the statistics or admin role.',
  })
  @ApiOkResponseArray(StatisticsGraphInfoDTO, 'List of statistics graphs')
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  getStatisticsGraphs(
    @UserContextDecorator() userContext: UserContext,
  ): ApiResponseDto<StatisticsGraphInfoDTO[]> {
    return new ApiResponseDto(
      this.accountingService.getStatisticsGraphs(userContext),
    );
  }

  @Post('statistics/graphs/:graphId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get data of a statistics graph',
    description:
      'Returns data of the statistics graph identified by graphId, computed from the given parameters. Only for users with the statistics or admin role. Returns empty data if database is not configured.',
  })
  @ApiOkResponseModel(StatisticsGraphDataDTO, 'Statistics graph data')
  @ApiResponse({ status: 400, description: 'Invalid graph parameters' })
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  @ApiResponse({ status: 404, description: 'Unknown statistics graph' })
  async getStatisticsGraph(
    @Param('graphId') graphId: string,
    @Body() request: StatisticsGraphRequestDTO,
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<StatisticsGraphDataDTO>> {
    const data = await this.accountingService.getStatisticsGraphData(
      graphId,
      request?.params ?? {},
      userContext,
    );
    return new ApiResponseDto(data);
  }

  @Post('statistics/graphs/:graphId/chart')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get chart of a statistics graph',
    description:
      'Returns the statistics graph identified by graphId rendered as SVG, computed from the given parameters. Only for users with the statistics or admin role.',
  })
  @ApiOkResponseModel(StatisticsGraphChartDTO, 'Statistics graph chart')
  @ApiResponse({ status: 400, description: 'Invalid graph parameters or graph without chart' })
  @ApiResponse({ status: 403, description: 'Access to statistics denied' })
  @ApiResponse({ status: 404, description: 'Unknown statistics graph' })
  async getStatisticsGraphChart(
    @Param('graphId') graphId: string,
    @Body() request: StatisticsGraphRequestDTO,
    @UserContextDecorator() userContext: UserContext,
  ): Promise<ApiResponseDto<StatisticsGraphChartDTO>> {
    const data = await this.accountingService.getStatisticsGraphChart(
      graphId,
      request?.params ?? {},
      userContext,
    );
    return new ApiResponseDto(data);
  }

  @Get('jobs/archive')
  @ApiOperation({
    summary: 'Get archive of finished jobs',
    description:
      'Returns paginated, sorted and filtered list of finished jobs from accounting records. Non-admin users see only their own jobs, admin can select a user with the username parameter. Text filters support SQL LIKE wildcards (%, _). Returns empty list if database is not configured.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based). Default: 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page. Default: 20' })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description:
      'Sort column (id, cpus, name, queue, username, pbsServer, recordTime, createdAt, startedAt, endedAt, walltime, exitStatus, owner, cpuReserved, gpuReserved, memoryReserved, state, node). Default: endedAt',
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], description: 'Sort direction. Default: desc' })
  @ApiQuery({ name: 'lastCount', required: false, type: Number, description: 'Limit to the N most recent records' })
  @ApiQuery({ name: 'range', required: false, enum: ['24h', '48h', 'week', 'month'], description: 'Limit to records from the last 24 hours, week or month' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query (case-insensitive substring match in username, job ID, name, queue and PBS server)',
  })
  @ApiQuery({ name: 'username', required: false, type: String, description: 'Job owner (admin only, ignored for other users)' })
  @ApiQuery({ name: 'job', required: false, type: String, description: 'Job ID' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Job name' })
  @ApiQuery({ name: 'queue', required: false, type: String, description: 'Queue name' })
  @ApiQuery({ name: 'pbsServer', required: false, type: String, description: 'PBS server hostname' })
  @ApiQuery({ name: 'cpusFrom', required: false, type: Number, description: 'Minimum number of used CPUs' })
  @ApiQuery({ name: 'cpusTo', required: false, type: Number, description: 'Maximum number of used CPUs' })
  @ApiQuery({ name: 'gpusFrom', required: false, type: Number, description: 'Minimum number of reserved GPUs' })
  @ApiQuery({ name: 'gpusTo', required: false, type: Number, description: 'Maximum number of reserved GPUs' })
  @ApiQuery({ name: 'walltimeFrom', required: false, type: String, description: 'Minimum requested walltime (H:MM:SS)' })
  @ApiQuery({ name: 'walltimeTo', required: false, type: String, description: 'Maximum requested walltime (H:MM:SS)' })
  @ApiQuery({ name: 'runtimeFrom', required: false, type: String, description: 'Minimum runtime - used walltime (H:MM:SS)' })
  @ApiQuery({ name: 'runtimeTo', required: false, type: String, description: 'Maximum runtime - used walltime (H:MM:SS)' })
  @ApiQuery({ name: 'recordFrom', required: false, type: String, description: 'Record time from (ISO 8601 date/time)' })
  @ApiQuery({ name: 'recordTo', required: false, type: String, description: 'Record time to (ISO 8601 date/time)' })
  @ApiQuery({ name: 'createdFrom', required: false, type: String, description: 'Creation time from (ISO 8601 date/time)' })
  @ApiQuery({ name: 'createdTo', required: false, type: String, description: 'Creation time to (ISO 8601 date/time)' })
  @ApiQuery({ name: 'startedFrom', required: false, type: String, description: 'Start time from (ISO 8601 date/time)' })
  @ApiQuery({ name: 'startedTo', required: false, type: String, description: 'Start time to (ISO 8601 date/time)' })
  @ApiOkResponseModel(ArchivedJobsListDTO, 'List of archived jobs')
  async getArchivedJobs(
    @UserContextDecorator() userContext: UserContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('lastCount') lastCount?: string,
    @Query('range') range?: string,
    @Query('search') search?: string,
    @Query('username') username?: string,
    @Query('job') job?: string,
    @Query('name') name?: string,
    @Query('queue') queue?: string,
    @Query('pbsServer') pbsServer?: string,
    @Query('cpusFrom') cpusFrom?: string,
    @Query('cpusTo') cpusTo?: string,
    @Query('gpusFrom') gpusFrom?: string,
    @Query('gpusTo') gpusTo?: string,
    @Query('walltimeFrom') walltimeFrom?: string,
    @Query('walltimeTo') walltimeTo?: string,
    @Query('runtimeFrom') runtimeFrom?: string,
    @Query('runtimeTo') runtimeTo?: string,
    @Query('recordFrom') recordFrom?: string,
    @Query('recordTo') recordTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('startedFrom') startedFrom?: string,
    @Query('startedTo') startedTo?: string,
  ): Promise<ApiResponseDto<ArchivedJobsListDTO, MetaDto>> {
    if (range && !['24h', '48h', 'week', 'month'].includes(range)) {
      throw new BadRequestException(`Invalid range '${range}'`);
    }

    // Non-admin users can only see their own jobs
    const owner =
      userContext.role === UserRole.ADMIN
        ? username || undefined
        : userContext.username.split('@')[0];
    // Never fall back to an unfiltered query for non-admins
    if (userContext.role !== UserRole.ADMIN && !owner) {
      throw new ForbiddenException('Cannot determine job owner');
    }

    const { data, totalCount } = await this.accountingService.getArchivedJobs({
      page: this.parsePositiveInt(page, 'page') ?? 1,
      limit: this.parsePositiveInt(limit, 'limit') ?? 20,
      sort: sort || 'endedAt',
      order: order === 'asc' ? 'asc' : 'desc',
      lastCount: this.parsePositiveInt(lastCount, 'lastCount'),
      range: (range as ArchivedJobsRange) || undefined,
      search: search || undefined,
      username: owner,
      job: job || undefined,
      name: name || undefined,
      queue: queue || undefined,
      pbsServer: pbsServer || undefined,
      cpusFrom: this.parsePositiveInt(cpusFrom, 'cpusFrom'),
      cpusTo: this.parsePositiveInt(cpusTo, 'cpusTo'),
      gpusFrom: this.parsePositiveInt(gpusFrom, 'gpusFrom'),
      gpusTo: this.parsePositiveInt(gpusTo, 'gpusTo'),
      walltimeFrom: walltimeFrom || undefined,
      walltimeTo: walltimeTo || undefined,
      runtimeFrom: runtimeFrom || undefined,
      runtimeTo: runtimeTo || undefined,
      recordFrom: this.parseDate(recordFrom, 'recordFrom'),
      recordTo: this.parseDate(recordTo, 'recordTo'),
      createdFrom: this.parseDate(createdFrom, 'createdFrom'),
      createdTo: this.parseDate(createdTo, 'createdTo'),
      startedFrom: this.parseDate(startedFrom, 'startedFrom'),
      startedTo: this.parseDate(startedTo, 'startedTo'),
    });

    return new ApiResponseDto(data, { totalCount });
  }

  private parsePositiveInt(value: string | undefined, name: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new BadRequestException(`Invalid ${name} '${value}'`);
    }
    return num;
  }

  private parseDate(value: string | undefined, name: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${name} '${value}'`);
    }
    return date;
  }
}
