import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import { ApiOkResponseModel } from '@/common/swagger/api-generic-response';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { JobsService } from './jobs.service';
import { JobsSummaryDTO } from './dto/jobs-summary.dto';

@ApiTags('jobs')
@Controller('pbs/jobssummary')
export class JobsSummaryController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all jobs summary info',
    description: 'Returns summary information about jobs like reason to wait, or state counts.',
  })
  @ApiOkResponseModel(JobsSummaryDTO, 'Jobs summary')
  getJobsSummary(
    @UserContextDecorator() userContext: UserContext,
  ): ApiResponse<JobsSummaryDTO> {
    const summary = this.jobsService.getJobsSummary(
      userContext,
    );
    return new ApiResponse(summary);
  }
}
