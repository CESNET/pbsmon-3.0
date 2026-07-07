import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import { ApiOkResponseModel } from '@/common/swagger/api-generic-response';
import { DataFreshnessService } from './data-freshness.service';
import { DataTimestampsDTO } from './dto/data-timestamps.dto';

@ApiTags('data-freshness')
@Controller('data-freshness')
export class DataFreshnessController {
  constructor(private readonly dataFreshnessService: DataFreshnessService) {}

  @Get()
  @ApiOperation({
    summary: 'Get freshness timestamps for collected data',
    description:
      'Returns, for each data source, the timestamp (ms since epoch) of the data currently held in memory, so callers can tell how old the displayed data is. Values are undefined if the corresponding data has not been obtained yet.',
  })
  @ApiOkResponseModel(DataTimestampsDTO, 'Data freshness timestamps')
  getDataTimestamps(): ApiResponse<DataTimestampsDTO> {
    const data = this.dataFreshnessService.getDataTimestamps();
    return new ApiResponse(data);
  }
}
