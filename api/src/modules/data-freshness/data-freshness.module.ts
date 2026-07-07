import { Module } from '@nestjs/common';
import { DataCollectionModule } from '@/modules/data-collection/data-collection.module';
import { DataFreshnessController } from './data-freshness.controller';
import { DataFreshnessService } from './data-freshness.service';

@Module({
  imports: [DataCollectionModule],
  controllers: [DataFreshnessController],
  providers: [DataFreshnessService],
})
export class DataFreshnessModule {}
