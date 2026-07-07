import { Injectable } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { DataTimestampsDTO } from './dto/data-timestamps.dto';

@Injectable()
export class DataFreshnessService {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  getDataTimestamps(): DataTimestampsDTO {
    return this.dataCollectionService.getDataTimestamps();
  }
}
