import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiNotFoundResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import {
  ApiOkResponseArray,
  ApiOkResponseModel,
} from '@/common/swagger/api-generic-response';
import { QueuesService } from './queues.service';
import { QueuesListDTO } from './dto/queue-list.dto';
import { QueueDetailDTO } from './dto/queue-detail.dto';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';

@ApiTags('queues')
@Controller('pbs/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of all queues',
    description:
      'Returns hierarchical list of queues with routing relationships and user access information. User context is extracted from access token via middleware. Optionally filter by server name or check access for a specific user.',
  })
  @ApiQuery({
    name: 'server',
    required: false,
    description:
      'Filter queues by server name (e.g., "pbs-m1"). If not provided, returns queues from all servers.',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    description:
      'Check queue access for a specific user (username). If not provided, uses the current user context. Admin users can check access for any user.',
  })
  @ApiQuery({
    name: 'qType',
    required: false,
    description:
      'Filter queues by type (e.g., "reservation", "non-reservation"). If not provided, returns all queue types.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search query (searches in queue name). A queue is included if it or any of its descendant queues match.',
  })
  @ApiOkResponseModel(QueuesListDTO, 'Hierarchical list of queues')
  getQueues(
    @UserContextDecorator() userContext: UserContext,
    @Query('server') server?: string,
    @Query('user') user?: string,
    @Query('qType') qType?: string,
    @Query('search') search?: string,
  ): ApiResponse<QueuesListDTO> {
    const data = this.queuesService.getQueuesList(
      userContext,
      server,
      user,
      qType,
      search,
    );
    return new ApiResponse(data, {
      totalCount: this.countQueues(data.queues),
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get queue detail',
    description:
      'Returns full queue details including ACL information, resources, hierarchical relationships, and user access. User context is extracted from access token via middleware. Optionally filter by server name.',
  })
  @ApiQuery({
    name: 'server',
    required: false,
    description:
      'Filter queue by server name (e.g., "pbs-m1"). If not provided, searches all servers.',
  })
  @ApiOkResponseModel(QueueDetailDTO, 'Queue detail')
  @ApiNotFoundResponse({ description: 'Queue not found' })
  getQueueDetail(
    @Param('id') id: string,
    @UserContextDecorator() userContext: UserContext,
    @Query('server') server?: string,
  ): ApiResponse<QueueDetailDTO> {
    const data = this.queuesService.getQueueDetail(id, userContext, server);
    return new ApiResponse(data);
  }

  /**
   * Recursively count all queues in the hierarchy
   */
  private countQueues(queues: QueuesListDTO['queues']): number {
    let count = queues.length;
    for (const queue of queues) {
      if (queue.children) {
        count += this.countQueues(queue.children);
      }
    }
    return count;
  }
}
