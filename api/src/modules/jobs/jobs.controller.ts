import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import { ApiOkResponseModel } from '@/common/swagger/api-generic-response';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { JobsService } from './jobs.service';
import { JobsListDTO } from './dto/job-list.dto';
import { JobDetailDTO } from './dto/job-detail.dto';
import { MetaDto } from '@/common/dto/meta.dto';

@ApiTags('jobs')
@Controller('pbs/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of jobs',
    description:
      'Returns paginated, sorted, and filtered list of PBS jobs. Supports server-side pagination, sorting, and search.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based). Default: 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page. Default: 20',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description:
      'Sort column (id, name, state, owner, node, cpuReserved, gpuReserved, memoryReserved, createdAt). Default: createdAt',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction. Default: desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query (searches in job ID, name, owner, node)',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description:
      'Filter by job state (Q=Queued, R=Running, C=Completed, E=Exiting, H=Held). Multiple states can be divided by "|". If not provided, returns jobs with all states.',
  })
  @ApiQuery({
    name: 'node',
    required: false,
    type: String,
    description:
      'Filter by node/machine name. If not provided, returns jobs from all nodes.',
  })
  @ApiQuery({
    name: 'queue',
    required: false,
    type: String,
    description:
      'Filter by queue name. If not provided, returns jobs from all queues.',
  })
  @ApiQuery({
    name: 'comment',
    required: false,
    type: String,
    description:
      'Filter by exact comment/reason for waiting. If not provided, returns jobs with all comments.',
  })
  @ApiQuery({
    name: 'owner',
    required: false,
    type: String,
    description:
      'Filter by job owner username (exact match on username part, before @). If not provided, returns jobs from all owners.',
  })
  @ApiOkResponseModel(JobsListDTO, 'List of jobs', MetaDto)
  getJobs(
    @UserContextDecorator() userContext: UserContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('node') node?: string,
    @Query('queue') queue?: string,
    @Query('comment') comment?: string,
    @Query('owner') owner?: string,
  ): ApiResponse<JobsListDTO, MetaDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const sortColumn = sort || 'createdAt';
    const sortOrder = order || 'desc';

    const { data, totalCount } = this.jobsService.getJobsList(
      userContext,
      pageNum,
      limitNum,
      sortColumn,
      sortOrder,
      search,
      state,
      node,
      queue,
      comment,
      owner,
    );

    return new ApiResponse(data, {
      totalCount,
    });
  }

  @Get(':jobId')
  @ApiOperation({
    summary: 'Get job detail',
    description:
      'Returns detailed information about a specific PBS job, including resources, subjobs, and system information.',
  })
  @ApiParam({
    name: 'jobId',
    description:
      'Job ID (e.g., "11118906.pbs-m1.metacentrum.cz" or "14699148[96].pbs-m1.metacentrum.cz")',
    type: String,
  })
  @ApiOkResponseModel(JobDetailDTO, 'Job detail')
  getJobDetail(
    @UserContextDecorator() userContext: UserContext,
    @Param('jobId') jobId: string,
  ): ApiResponse<JobDetailDTO> {
    const job = this.jobsService.getJobDetail(userContext, jobId);
    return new ApiResponse(job);
  }
}
